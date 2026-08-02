# Group round list — design

A list of rounds on the pool page showing how many predictions a member still
owes for each, and which specific fixtures are still open to predict.

## Why

A member has no way to reach a round page. Nothing in the app links to
`/[locale]/[league]/groups/[groupId]/rounds/[roundId]` — `wager-rounds-list.tsx`
generates such links but has no importer, so the only route in is a hand-typed
URL. The pool page shows live/next fixtures and the leaderboard, neither of
which answers "what do I still owe?".

Wagering makes this sharper: entering a wager requires a complete set of picks
for the round, so a member who cannot find the round cannot wager on it.

## Scope decisions

| Decision | Chosen | Alternative rejected |
| --- | --- | --- |
| Placement | Round list on the pool page | Single "current round" card; round page only |
| Which rounds | Current + next 2, past behind a disclosure | All 17; only actionable ones |
| Detail | Count per round, pending fixtures on expand | Count only; all fixtures always visible |

## Data

```ts
// lib/groups/round-progress.ts
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

export async function getRoundProgress(
  groupId: string,
  userId: string,
): Promise<RoundProgress[]>;
```

`openMatches` is what answers the user's question. `lockedUnpredicted` is
counted separately rather than folded in, because the kickoff lock is enforced
at the RLS layer — offering a started fixture would produce a write the
database refuses.

State is derived from kickoff timestamps, not from `competition_rounds.status`.
The operator runbook notes that column is a UI label and not a gate, and the
live data bears this out: Liga MX Jornada 3 has 3 of 9 fixtures final while the
remaining 6 are still predictable.

- `open` — no fixture has started
- `in_progress` — some started, some not
- `past` — all started

One query against `matches` joined to the member's `predictions`, not one per
round. Note `predictions` has no `group_id`: picks are per user and match,
shared across every pool on that competition.

## Placement

Between `FixturesStrip` and the leaderboard on
`app/[locale]/(app)/groups/[id]/page.tsx`. The strip is league context, this is
personal action, the leaderboard is outcome — action before outcome.

Members only. A non-member has no predictions to complete.

## Window

`in_progress` and `open` rounds, capped at three, with `past` rounds behind a
disclosure. When no round is open — end of season — the three most recent past
rounds are shown instead so the section is never empty.

## Components

```
lib/groups/round-progress.ts     Server — the query and shaping
components/groups/round-list.tsx  Client — disclosure, per-row expansion
```

Each row: label, date range, `4/9`, a wager badge where applicable, and a link
to the round. Expanding lists `openMatches` with local kickoff times via the
existing `LocalTime` component, plus a note when `lockedUnpredicted > 0`.

## i18n

A `roundList` namespace, roughly 12 keys, in en/es/fr/de. Added to the existing
guard suite in `tests/wager-i18n.test.ts`, which enforces key parity, ICU
formatting, `useTranslations` usage, and the absence of hardcoded English.

## Testing

- `getRoundProgress` against a mocked Supabase client: correct predicted count;
  `openMatches` excludes started fixtures; `lockedUnpredicted` counts them;
  all three states classify correctly
- i18n inherited from the extended suite

## Risks

**Query grows with the season.** 153 fixtures plus the member's predictions on
every pool page load. Fine at this size; a competition with several thousand
fixtures would need a date-window filter in SQL.

**Duplicates information with the round page.** Deliberate — the round page is
for filling picks in, this is for deciding which round to open.
