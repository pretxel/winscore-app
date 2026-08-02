# Group Round List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show pool members which rounds they still owe predictions for, and which specific fixtures are still open to predict, from the pool page.

**Architecture:** One server-only function resolves every round of the pool's competition alongside the member's predictions in a single query, shaping it into per-round progress. A client component renders the actionable rounds with past ones behind a disclosure, and expands a row to list the fixtures still open.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4, shadcn/ui, next-intl, Supabase, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-02-group-round-list-design.md`

## Global Constraints

- Four locales at exact key parity: `en`, `es`, `fr`, `de`.
- No hardcoded user-facing English in components — all copy through `useTranslations`. `tests/wager-i18n.test.ts` enforces this.
- `pnpm lint` prints a false "possibly out of memory" via rtk. Use `node_modules/.bin/biome check` directly. Likewise `rtk proxy pnpm test` when you need full vitest output.
- Round state is derived from fixture kickoff times, never from `competition_rounds.status` — that column is a UI label, not a gate.
- `predictions` has no `group_id`. Picks are per (user, match) and shared across every pool on the same competition.
- No migration in this plan. Everything reads existing tables.

## Existing shapes this plan relies on

- `matches`: `id, home_team, away_team, kickoff_at, status, round_id, competition_id`
- `predictions`: `id, user_id, match_id, home_goals, away_goals, submitted_at`
- `competition_rounds`: `id, competition_id, round_key, round_number, labels, opens_at, admin_closes_at, status`
- `groups`: has `competition_id`
- Round label resolution, copied from the round page: `round.labels?.[locale] ?? round.round_key`
- `<LocalTime iso={...} format="datetime" />` from `@/components/local-time`

---

### Task 1: Round progress query

**Files:**
- Create: `lib/groups/round-progress.ts`
- Create: `tests/round-progress.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:

```ts
export interface MatchStub {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
}

export interface RoundProgress {
  roundId: string;
  label: string;
  roundNumber: number;
  startsAt: string;
  endsAt: string;
  total: number;
  predicted: number;
  openMatches: MatchStub[];
  lockedUnpredicted: number;
  state: "open" | "in_progress" | "past";
  wagerAvailable: boolean;
}

/** Pure shaping step, exported for testing without a database. */
export function buildRoundProgress(input: {
  rounds: Array<{
    id: string;
    round_key: string;
    round_number: number;
    labels: Record<string, string> | null;
  }>;
  matches: Array<{
    id: string;
    round_id: string | null;
    home_team: string;
    away_team: string;
    kickoff_at: string;
  }>;
  predictedMatchIds: Set<string>;
  wagerRoundIds: Set<string>;
  locale: string;
  now: Date;
}): RoundProgress[];

export async function getRoundProgress(
  groupId: string,
  userId: string,
  locale: string,
): Promise<RoundProgress[]>;
```

- [ ] **Step 1: Write the failing tests**

```ts
// tests/round-progress.test.ts
import { describe, expect, it } from "vitest";
import { buildRoundProgress } from "@/lib/groups/round-progress";

const NOW = new Date("2026-08-02T12:00:00Z");

function match(id: string, roundId: string, kickoff: string) {
  return {
    id,
    round_id: roundId,
    home_team: `Home ${id}`,
    away_team: `Away ${id}`,
    kickoff_at: kickoff,
  };
}

const ROUNDS = [
  { id: "r1", round_key: "Jornada 1", round_number: 1, labels: { es: "Jornada 1" } },
  { id: "r2", round_key: "Jornada 2", round_number: 2, labels: null },
];

describe("buildRoundProgress", () => {
  it("counts predictions and leaves unpredicted future fixtures open", () => {
    const [round] = buildRoundProgress({
      rounds: [ROUNDS[0]],
      matches: [
        match("m1", "r1", "2026-08-10T18:00:00Z"),
        match("m2", "r1", "2026-08-10T20:00:00Z"),
      ],
      predictedMatchIds: new Set(["m1"]),
      wagerRoundIds: new Set(),
      locale: "en",
      now: NOW,
    });

    expect(round.total).toBe(2);
    expect(round.predicted).toBe(1);
    expect(round.openMatches.map((m) => m.id)).toEqual(["m2"]);
    expect(round.lockedUnpredicted).toBe(0);
    expect(round.state).toBe("open");
  });

  // The kickoff lock is enforced by RLS, so a started fixture must never be
  // offered as something the member can still fill in.
  it("counts a started unpredicted fixture as locked, not open", () => {
    const [round] = buildRoundProgress({
      rounds: [ROUNDS[0]],
      matches: [
        match("m1", "r1", "2026-08-01T18:00:00Z"),
        match("m2", "r1", "2026-08-10T20:00:00Z"),
      ],
      predictedMatchIds: new Set(),
      wagerRoundIds: new Set(),
      locale: "en",
      now: NOW,
    });

    expect(round.openMatches.map((m) => m.id)).toEqual(["m2"]);
    expect(round.lockedUnpredicted).toBe(1);
    expect(round.state).toBe("in_progress");
  });

  it("marks a round past once every fixture has started", () => {
    const [round] = buildRoundProgress({
      rounds: [ROUNDS[0]],
      matches: [
        match("m1", "r1", "2026-07-20T18:00:00Z"),
        match("m2", "r1", "2026-07-21T20:00:00Z"),
      ],
      predictedMatchIds: new Set(["m1", "m2"]),
      wagerRoundIds: new Set(),
      locale: "en",
      now: NOW,
    });

    expect(round.state).toBe("past");
    expect(round.openMatches).toEqual([]);
  });

  it("prefers the localized label and falls back to round_key", () => {
    const rounds = buildRoundProgress({
      rounds: ROUNDS,
      matches: [match("m1", "r1", "2026-08-10T18:00:00Z"), match("m2", "r2", "2026-08-17T18:00:00Z")],
      predictedMatchIds: new Set(),
      wagerRoundIds: new Set(),
      locale: "es",
      now: NOW,
    });

    expect(rounds[0].label).toBe("Jornada 1");
    expect(rounds[1].label).toBe("Jornada 2");
  });

  it("reports the fixture window and flags wager-enabled rounds", () => {
    const [round] = buildRoundProgress({
      rounds: [ROUNDS[0]],
      matches: [
        match("m2", "r1", "2026-08-12T20:00:00Z"),
        match("m1", "r1", "2026-08-10T18:00:00Z"),
      ],
      predictedMatchIds: new Set(),
      wagerRoundIds: new Set(["r1"]),
      locale: "en",
      now: NOW,
    });

    expect(round.startsAt).toBe("2026-08-10T18:00:00Z");
    expect(round.endsAt).toBe("2026-08-12T20:00:00Z");
    expect(round.wagerAvailable).toBe(true);
  });

  it("skips rounds that have no fixtures assigned", () => {
    const rounds = buildRoundProgress({
      rounds: ROUNDS,
      matches: [match("m1", "r1", "2026-08-10T18:00:00Z")],
      predictedMatchIds: new Set(),
      wagerRoundIds: new Set(),
      locale: "en",
      now: NOW,
    });

    expect(rounds.map((r) => r.roundId)).toEqual(["r1"]);
  });

  it("orders open fixtures by kickoff", () => {
    const [round] = buildRoundProgress({
      rounds: [ROUNDS[0]],
      matches: [
        match("late", "r1", "2026-08-12T20:00:00Z"),
        match("early", "r1", "2026-08-10T18:00:00Z"),
      ],
      predictedMatchIds: new Set(),
      wagerRoundIds: new Set(),
      locale: "en",
      now: NOW,
    });

    expect(round.openMatches.map((m) => m.id)).toEqual(["early", "late"]);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `rtk proxy pnpm vitest run tests/round-progress.test.ts`
Expected: FAIL — cannot resolve `@/lib/groups/round-progress`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/groups/round-progress.ts
import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface MatchStub {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
}

export interface RoundProgress {
  roundId: string;
  label: string;
  roundNumber: number;
  startsAt: string;
  endsAt: string;
  total: number;
  predicted: number;
  /** Unpredicted AND not yet kicked off — the only ones still actionable. */
  openMatches: MatchStub[];
  /** Unpredicted but already started; permanently missed. */
  lockedUnpredicted: number;
  state: "open" | "in_progress" | "past";
  wagerAvailable: boolean;
}

interface RoundRow {
  id: string;
  round_key: string;
  round_number: number;
  labels: Record<string, string> | null;
}

interface MatchRow {
  id: string;
  round_id: string | null;
  home_team: string;
  away_team: string;
  kickoff_at: string;
}

/**
 * Shapes rows into per-round progress. Pure and separately exported so the
 * classification rules can be tested without a database.
 *
 * State comes from kickoff times rather than competition_rounds.status, which
 * is a display label — Liga MX Jornada 3 sits at 3 of 9 fixtures final while
 * the rest are still predictable, and a status-based rule would misread it.
 */
export function buildRoundProgress(input: {
  rounds: RoundRow[];
  matches: MatchRow[];
  predictedMatchIds: Set<string>;
  wagerRoundIds: Set<string>;
  locale: string;
  now: Date;
}): RoundProgress[] {
  const byRound = new Map<string, MatchRow[]>();
  for (const m of input.matches) {
    if (!m.round_id) continue;
    const list = byRound.get(m.round_id);
    if (list) list.push(m);
    else byRound.set(m.round_id, [m]);
  }

  const nowMs = input.now.getTime();
  const result: RoundProgress[] = [];

  for (const round of input.rounds) {
    const fixtures = byRound.get(round.id);
    // A round with no fixtures assigned has nothing to predict.
    if (!fixtures?.length) continue;

    const sorted = [...fixtures].sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));

    let predicted = 0;
    let started = 0;
    let lockedUnpredicted = 0;
    const openMatches: MatchStub[] = [];

    for (const m of sorted) {
      const hasPick = input.predictedMatchIds.has(m.id);
      const hasStarted = new Date(m.kickoff_at).getTime() <= nowMs;

      if (hasPick) predicted += 1;
      if (hasStarted) started += 1;

      if (!hasPick && hasStarted) lockedUnpredicted += 1;
      if (!hasPick && !hasStarted) {
        openMatches.push({
          id: m.id,
          homeTeam: m.home_team,
          awayTeam: m.away_team,
          kickoffAt: m.kickoff_at,
        });
      }
    }

    const state: RoundProgress["state"] =
      started === 0 ? "open" : started === sorted.length ? "past" : "in_progress";

    result.push({
      roundId: round.id,
      label: round.labels?.[input.locale] ?? round.round_key,
      roundNumber: round.round_number,
      startsAt: sorted[0].kickoff_at,
      endsAt: sorted[sorted.length - 1].kickoff_at,
      total: sorted.length,
      predicted,
      openMatches,
      lockedUnpredicted,
      state,
      wagerAvailable: input.wagerRoundIds.has(round.id),
    });
  }

  return result.sort((a, b) => a.roundNumber - b.roundNumber);
}

/**
 * Every round of the pool's competition with this member's progress.
 *
 * Predictions are per (user, match) with no pool dimension, so a pick made in
 * one pool counts in every pool on the same competition.
 */
export async function getRoundProgress(
  groupId: string,
  userId: string,
  locale: string,
): Promise<RoundProgress[]> {
  const supabase = await createServerSupabaseClient();

  const { data: group } = await supabase
    .from("groups")
    .select("competition_id")
    .eq("id", groupId)
    .maybeSingle();
  if (!group?.competition_id) return [];

  const { data: rounds } = await supabase
    .from("competition_rounds")
    .select("id, round_key, round_number, labels")
    .eq("competition_id", group.competition_id)
    .order("round_number");
  if (!rounds?.length) return [];

  const { data: matches } = await supabase
    .from("matches")
    .select("id, round_id, home_team, away_team, kickoff_at")
    .eq("competition_id", group.competition_id)
    .not("round_id", "is", null);

  const matchIds = (matches ?? []).map((m) => m.id);
  const { data: preds } = matchIds.length
    ? await supabase
        .from("predictions")
        .select("match_id")
        .eq("user_id", userId)
        .in("match_id", matchIds)
    : { data: [] };

  const { data: wagerRounds } = await supabase
    .from("wager_rounds")
    .select("round_id")
    .eq("group_id", groupId)
    .eq("state", "initialized");

  return buildRoundProgress({
    rounds: rounds as RoundRow[],
    matches: (matches ?? []) as MatchRow[],
    predictedMatchIds: new Set((preds ?? []).map((p) => p.match_id as string)),
    wagerRoundIds: new Set((wagerRounds ?? []).map((w) => w.round_id as string)),
    locale,
    now: new Date(),
  });
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `rtk proxy pnpm vitest run tests/round-progress.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/groups/round-progress.ts tests/round-progress.test.ts
git commit -m "feat(groups): add per-round prediction progress query"
```

---

### Task 2: Window selection

**Files:**
- Modify: `lib/groups/round-progress.ts`
- Modify: `tests/round-progress.test.ts`

**Interfaces:**
- Consumes: `RoundProgress` from Task 1
- Produces:

```ts
export function selectRoundWindow(rounds: RoundProgress[]): {
  actionable: RoundProgress[];
  past: RoundProgress[];
};
```

- [ ] **Step 1: Write the failing tests**

Append to `tests/round-progress.test.ts`:

```ts
import { selectRoundWindow } from "@/lib/groups/round-progress";

function progress(roundNumber: number, state: RoundProgress["state"]): RoundProgress {
  return {
    roundId: `r${roundNumber}`,
    label: `Jornada ${roundNumber}`,
    roundNumber,
    startsAt: "2026-08-10T18:00:00Z",
    endsAt: "2026-08-10T20:00:00Z",
    total: 9,
    predicted: 0,
    openMatches: [],
    lockedUnpredicted: 0,
    state,
    wagerAvailable: false,
  };
}

describe("selectRoundWindow", () => {
  it("shows in-progress and open rounds, capped at three", () => {
    const { actionable, past } = selectRoundWindow([
      progress(1, "past"),
      progress(2, "past"),
      progress(3, "in_progress"),
      progress(4, "open"),
      progress(5, "open"),
      progress(6, "open"),
    ]);

    expect(actionable.map((r) => r.roundNumber)).toEqual([3, 4, 5]);
    expect(past.map((r) => r.roundNumber)).toEqual([2, 1]);
  });

  // End of season: an empty section would read as a bug rather than as "done".
  it("falls back to the three most recent past rounds when nothing is open", () => {
    const { actionable, past } = selectRoundWindow([
      progress(1, "past"),
      progress(2, "past"),
      progress(3, "past"),
      progress(4, "past"),
    ]);

    expect(actionable.map((r) => r.roundNumber)).toEqual([4, 3, 2]);
    expect(past.map((r) => r.roundNumber)).toEqual([1]);
  });

  it("returns nothing for a competition with no rounds", () => {
    expect(selectRoundWindow([])).toEqual({ actionable: [], past: [] });
  });
});
```

Add `RoundProgress` to the existing type import at the top of the file.

- [ ] **Step 2: Run the tests and verify they fail**

Run: `rtk proxy pnpm vitest run tests/round-progress.test.ts`
Expected: FAIL — `selectRoundWindow` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `lib/groups/round-progress.ts`:

```ts
const WINDOW_SIZE = 3;

/**
 * Splits rounds into what the member can act on now and what is behind the
 * disclosure. Past rounds come back newest-first, which is the order someone
 * looking back wants.
 */
export function selectRoundWindow(rounds: RoundProgress[]): {
  actionable: RoundProgress[];
  past: RoundProgress[];
} {
  const live = rounds.filter((r) => r.state !== "past");
  const past = rounds.filter((r) => r.state === "past").reverse();

  if (live.length === 0) {
    // Season over: show recent history rather than an empty section.
    return { actionable: past.slice(0, WINDOW_SIZE), past: past.slice(WINDOW_SIZE) };
  }

  return { actionable: live.slice(0, WINDOW_SIZE), past };
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `rtk proxy pnpm vitest run tests/round-progress.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/groups/round-progress.ts tests/round-progress.test.ts
git commit -m "feat(groups): select the actionable round window"
```

---

### Task 3: i18n copy

**Files:**
- Modify: `messages/en.json`, `messages/es.json`, `messages/fr.json`, `messages/de.json`

**Interfaces:**
- Produces: a `roundList` namespace with exactly these keys, used by Task 4:
  `title`, `progress`, `complete`, `openRound`, `showPast`, `hidePast`,
  `pendingHeading`, `noPending`, `lockedNote`, `wagerBadge`, `stateOpen`,
  `stateInProgress`, `statePast`, `empty`

- [ ] **Step 1: Add the English copy**

Add at the top level of `messages/en.json`:

```json
"roundList": {
  "title": "Your rounds",
  "progress": "{predicted} of {total} predictions",
  "complete": "All predictions in",
  "openRound": "Open round",
  "showPast": "Show past rounds",
  "hidePast": "Hide past rounds",
  "pendingHeading": "Still to predict",
  "noPending": "Nothing left to predict in this round.",
  "lockedNote": "{count, plural, one {# fixture already kicked off and can no longer be predicted} other {# fixtures already kicked off and can no longer be predicted}}",
  "wagerBadge": "Wager open",
  "stateOpen": "Not started",
  "stateInProgress": "In progress",
  "statePast": "Finished",
  "empty": "No rounds have fixtures assigned yet."
}
```

- [ ] **Step 2: Add the same keys to `es`, `fr`, `de`**

Translate every value. Keep `{predicted}`, `{total}` and the full
`{count, plural, ...}` ICU structure intact — translate only the words inside
the plural branches.

- [ ] **Step 3: Verify parity**

```bash
python3 -c "
import json
en=set(json.load(open('messages/en.json'))['roundList'])
for l in ['es','fr','de']:
    o=set(json.load(open(f'messages/{l}.json'))['roundList'])
    print(l, 'missing:', sorted(en-o), 'extra:', sorted(o-en))
"
```

Expected: `missing: [] extra: []` for all three.

- [ ] **Step 4: Commit**

```bash
git add messages/
git commit -m "feat(i18n): add round list copy in all four locales"
```

---

### Task 4: Round list component

**Files:**
- Create: `components/groups/round-list.tsx`

**Interfaces:**
- Consumes: `RoundProgress`, `MatchStub` (Task 1); `roundList` namespace (Task 3); `LocalTime` from `@/components/local-time`
- Produces:

```tsx
export function RoundList(props: {
  actionable: RoundProgress[];
  past: RoundProgress[];
  groupId: string;
  league: string;
  locale: string;
}): JSX.Element;
```

- [ ] **Step 1: Write the component**

```tsx
// components/groups/round-list.tsx
"use client";

import { CheckCircle2Icon, ChevronDownIcon, CoinsIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LocalTime } from "@/components/local-time";
import { Badge } from "@/components/ui/badge";
// This Button has no `asChild`; a link styled as a button uses buttonVariants,
// which is the pattern the rest of the app follows.
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoundProgress } from "@/lib/groups/round-progress";

function RoundRow({
  round,
  groupId,
  league,
  locale,
}: {
  round: RoundProgress;
  groupId: string;
  league: string;
  locale: string;
}) {
  const t = useTranslations("roundList");
  const [expanded, setExpanded] = useState(false);
  const isComplete = round.predicted === round.total;

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          <ChevronDownIcon
            className={`size-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{round.label}</span>
            <span className="block text-xs text-muted-foreground">
              <LocalTime iso={round.startsAt} format="date" />
              {" · "}
              {isComplete ? (
                <span className="inline-flex items-center gap-1 text-pitch">
                  <CheckCircle2Icon className="size-3" />
                  {t("complete")}
                </span>
              ) : (
                t("progress", { predicted: round.predicted, total: round.total })
              )}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {round.wagerAvailable && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <CoinsIcon className="size-3" />
              {t("wagerBadge")}
            </Badge>
          )}
          <Link
            href={`/${locale}/${league}/groups/${groupId}/rounds/${round.roundId}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("openRound")}
          </Link>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 border-t px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("pendingHeading")}
          </p>
          {round.openMatches.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("noPending")}</p>
          ) : (
            <ul className="space-y-1">
              {round.openMatches.map((m) => (
                <li key={m.id} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate">
                    {m.homeTeam} — {m.awayTeam}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    <LocalTime iso={m.kickoffAt} format="datetime" />
                  </span>
                </li>
              ))}
            </ul>
          )}
          {round.lockedUnpredicted > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("lockedNote", { count: round.lockedUnpredicted })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The member's rounds: what they still owe predictions for, and which fixtures
 * are still open. Past rounds sit behind a disclosure so the actionable ones
 * stay at the top.
 */
export function RoundList({
  actionable,
  past,
  groupId,
  league,
  locale,
}: {
  actionable: RoundProgress[];
  past: RoundProgress[];
  groupId: string;
  league: string;
  locale: string;
}) {
  const t = useTranslations("roundList");
  const [showPast, setShowPast] = useState(false);

  if (actionable.length === 0 && past.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actionable.map((round) => (
          <RoundRow
            key={round.roundId}
            round={round}
            groupId={groupId}
            league={league}
            locale={locale}
          />
        ))}

        {past.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowPast((v) => !v)}
              aria-expanded={showPast}
            >
              {showPast ? t("hidePast") : t("showPast")}
            </Button>
            {showPast &&
              past.map((round) => (
                <RoundRow
                  key={round.roundId}
                  round={round}
                  groupId={groupId}
                  league={league}
                  locale={locale}
                />
              ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `rtk proxy pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/groups/round-list.tsx
git commit -m "feat(groups): add round list component"
```

---

### Task 5: Render it on the pool page

**Files:**
- Modify: `app/[locale]/(app)/groups/[id]/page.tsx`

**Interfaces:**
- Consumes: `getRoundProgress`, `selectRoundWindow` (Tasks 1–2); `RoundList` (Task 4)

- [ ] **Step 1: Read the page to find the insertion point**

The page already resolves `group`, `locale`, and the league via
`getLeagueForPool`, and renders `<FixturesStrip …>` followed by the leaderboard.
The list goes between them: the strip is league context, this is personal
action, the leaderboard is outcome.

- [ ] **Step 2: Add the imports**

```tsx
import { RoundList } from "@/components/groups/round-list";
import { getRoundProgress, selectRoundWindow } from "@/lib/groups/round-progress";
```

- [ ] **Step 3: Resolve the data**

The page already resolves `group` (which carries `currentUserId`) and `league`
via `getLeagueForPool`, so no extra auth call is needed. After the existing
`const { rows } = await getGroupBoard(id);` block, add:

```tsx
  // Members only: someone who has not joined has no predictions to complete.
  // `league` can be null for a pool whose competition was removed, and the
  // round link needs its slug, so both are required.
  const roundWindow =
    group.currentUserId && league
      ? selectRoundWindow(await getRoundProgress(id, group.currentUserId, locale))
      : null;
```

`getGroup` only populates `currentUserId` for a signed-in member, so this is
both the auth check and the membership check.

- [ ] **Step 4: Render it**

Immediately after the `<FixturesStrip …>` element. The `league &&` guard is
required because TypeScript cannot narrow `league` from the `roundWindow`
assignment above:

```tsx
      {roundWindow && league && (
        <RoundList
          actionable={roundWindow.actionable}
          past={roundWindow.past}
          groupId={id}
          league={league.slug}
          locale={locale}
        />
      )}
```

- [ ] **Step 5: Verify typecheck and build**

```bash
rtk proxy pnpm typecheck
rtk proxy pnpm build 2>&1 | grep -E "Compiled successfully|error"
```

Expected: typecheck silent, build compiles.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(app)/groups/[id]/page.tsx"
git commit -m "feat(groups): show the round list on the pool page"
```

---

### Task 6: Extend the i18n guard

**Files:**
- Modify: `tests/wager-i18n.test.ts`

- [ ] **Step 1: Add the namespace, component, and args**

```ts
const NAMESPACES = ["wager", "wallet", "wagerPayout", "wagerResults", "welcome", "roundList"] as const;

const COMPONENTS = [
  "components/wager/wager-rail.tsx",
  "components/wager/wager-payout.tsx",
  "components/wager/wager-results-table.tsx",
  "components/wallet/wallet-link-button.tsx",
  "app/[locale]/welcome/welcome-tour.tsx",
  "components/groups/round-list.tsx",
];
```

And in `ARGS`:

```ts
  roundList: { predicted: 3, total: 9, count: 2 },
```

- [ ] **Step 2: Run the suite**

Run: `rtk proxy pnpm vitest run tests/wager-i18n.test.ts`
Expected: PASS (4 tests), now covering `roundList` and the new component.

- [ ] **Step 3: Prove the scanner covers the new component**

Temporarily replace one `t("…")` call in `round-list.tsx` with a literal such as
`Open round`, re-run, and confirm it FAILS naming that file. Restore and confirm
it passes. A guard that has not been seen failing is not known to work.

- [ ] **Step 4: Commit**

```bash
git add tests/wager-i18n.test.ts
git commit -m "test(i18n): cover the round list in the locale guard suite"
```

---

### Task 7: Full verification

**Files:** none

- [ ] **Step 1: Run every check**

```bash
rtk proxy pnpm typecheck
rtk proxy pnpm test
rtk proxy pnpm build
node_modules/.bin/biome check --diagnostic-level=error
```

Expected: typecheck silent, all tests pass, build compiles, biome reports no
error-level diagnostics. Report any failure verbatim rather than summarising it
as passing.

- [ ] **Step 2: Verify against real data**

Run `pnpm dev` and open the "Test group" pool as a signed-in member. Against
current production data the list should show Jornada 3 as in-progress, plus
Jornadas 4 and 5, with past rounds behind the disclosure. Expanding Jornada 3
should list only its fixtures that have not kicked off, with a note about the
ones that already have. Jornada 4 should carry the wager badge.

- [ ] **Step 3: Check the round link works**

Click "Open round" on Jornada 4 and confirm it lands on the round page for that
round — this is the navigation gap the feature exists to close.

- [ ] **Step 4: Push and open a PR**

```bash
git push -u origin feat/group-round-list
gh pr create --title "feat(groups): show round prediction progress on the pool page" --body "<summary + verification results>"
```

Note: `gh` must be authenticated as `pretxel`; the `eserrano-90` account has
read-only access and PR creation fails with "must be a collaborator".
