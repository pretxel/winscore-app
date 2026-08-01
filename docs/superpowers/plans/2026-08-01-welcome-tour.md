# Welcome Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show every signed-in player a five-step skippable tour covering scoring, pools, optional matchday wagers, wallet linking, and the risk/oracle model.

**Architecture:** A new `/welcome` route holds a single client component that renders one of five data-driven steps. A pure `resolveOnboardingRedirect()` function decides where a signed-in user belongs, replacing duplicated redirect logic in two layouts. Completion is recorded in a new `profiles.welcome_seen_at` column.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4, shadcn/ui, next-intl, Supabase (Postgres + RLS), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-01-welcome-tour-design.md`

## Global Constraints

- Four locales must stay at exact key parity: `en`, `es`, `fr`, `de`. `SUPPORTED_LOCALES` in `lib/i18n.ts` is the source of truth.
- No user-facing English may be hardcoded in components. All copy resolves through `useTranslations`. `tests/wager-i18n.test.ts` enforces this and will fail the build otherwise.
- Migrations are applied with `supabase db push --linked`. The migration ledger is currently in sync — do not use `migration repair`.
- After any migration, regenerate types: `supabase gen types typescript --linked > lib/database.types.ts`, then format it (`node_modules/.bin/biome check --write lib/database.types.ts`) because the generator's output violates biome's formatting.
- `pnpm lint` prints a false "possibly out of memory" warning via rtk. Use `node_modules/.bin/biome check` directly to see real diagnostics.
- The tour must never render when `WAGER_UI_ENABLED` is off.
- Wagering is devnet-only. Copy must never imply real monetary value.

---

### Task 1: Add `welcome_seen_at` column

**Files:**
- Create: `supabase/migrations/20260801000200_profiles_welcome_seen_at.sql`
- Modify: `lib/database.types.ts` (regenerated)

**Interfaces:**
- Consumes: nothing
- Produces: `public.profiles.welcome_seen_at timestamptz` (nullable), surfaced in the generated `Database` type as `welcome_seen_at: string | null`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260801000200_profiles_welcome_seen_at.sql
-- ===========================================================================
-- One-time welcome tour: seen marker
-- ---------------------------------------------------------------------------
-- Records that a player has been shown the five-step tour covering scoring,
-- pools, optional matchday wagers, wallet linking, and the risk/oracle model.
--
-- Deliberately NOT backfilled: every existing player sees the tour once on
-- their next sign-in, because none of them have been shown any wagering
-- explanation. Nullable for the same reason — null means "not yet seen".
--
-- Mirrors the shape of profiles.welcome_email_sent_at.
-- ===========================================================================

alter table public.profiles
  add column welcome_seen_at timestamptz;
```

- [ ] **Step 2: Apply it and verify the column exists**

```bash
supabase db push --linked --yes
supabase db query --linked "select column_name, data_type, is_nullable from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='welcome_seen_at'"
```

Expected: one row, `timestamptz`, `is_nullable = YES`.

- [ ] **Step 3: Verify no rows were backfilled**

```bash
supabase db query --linked "select count(*) as total, count(welcome_seen_at) as marked from public.profiles"
```

Expected: `marked` is 0 — every existing player will see the tour.

- [ ] **Step 4: Regenerate and format types**

```bash
supabase gen types typescript --linked > lib/database.types.ts
node_modules/.bin/biome check --write lib/database.types.ts
grep -c "welcome_seen_at" lib/database.types.ts
```

Expected: grep count is at least 2 (Row and Insert/Update shapes).

- [ ] **Step 5: Confirm the type diff removed nothing**

```bash
git diff lib/database.types.ts | grep "^-" | grep -vE "^---" | grep -oE "^-\s+[a-z_]+[:?]" | sort -u > /tmp/removed.txt
git diff lib/database.types.ts | grep "^+" | grep -vE "^\+\+\+" | grep -oE "^\+\s+[a-z_]+[:?]" | sed 's/^+/-/' | sort -u > /tmp/added.txt
comm -23 /tmp/removed.txt /tmp/added.txt
```

Expected: empty output. Any field listed here was removed and not re-added, meaning the remote schema drifted — stop and investigate rather than committing.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260801000200_profiles_welcome_seen_at.sql lib/database.types.ts
git commit -m "feat(db): add profiles.welcome_seen_at for the welcome tour"
```

---

### Task 2: Pure onboarding gate

**Files:**
- Create: `lib/onboarding/gate.ts`
- Create: `tests/onboarding-gate.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:

```ts
export type OnboardingRedirect = "/onboarding" | "/welcome" | null;

export function resolveOnboardingRedirect(input: {
  displayName: string | null;
  welcomeSeenAt: string | null;
  wagerUiEnabled: boolean;
}): OnboardingRedirect;
```

- [ ] **Step 1: Write failing tests**

```ts
// tests/onboarding-gate.test.ts
import { describe, expect, it } from "vitest";
import { resolveOnboardingRedirect } from "@/lib/onboarding/gate";

describe("resolveOnboardingRedirect", () => {
  it("sends a user with no display name to onboarding", () => {
    expect(
      resolveOnboardingRedirect({
        displayName: null,
        welcomeSeenAt: null,
        wagerUiEnabled: true,
      }),
    ).toBe("/onboarding");
  });

  // The display name is a hard gate, so it wins even when the tour is also unseen.
  it("prefers onboarding over the tour when both are pending", () => {
    expect(
      resolveOnboardingRedirect({
        displayName: "",
        welcomeSeenAt: null,
        wagerUiEnabled: true,
      }),
    ).toBe("/onboarding");
  });

  it("sends a named user who has not seen the tour to welcome", () => {
    expect(
      resolveOnboardingRedirect({
        displayName: "Ada",
        welcomeSeenAt: null,
        wagerUiEnabled: true,
      }),
    ).toBe("/welcome");
  });

  // With wagering off the tour would explain a feature that is not there.
  it("skips the tour when the wager UI is disabled", () => {
    expect(
      resolveOnboardingRedirect({
        displayName: "Ada",
        welcomeSeenAt: null,
        wagerUiEnabled: false,
      }),
    ).toBeNull();
  });

  it("lets a fully onboarded user through", () => {
    expect(
      resolveOnboardingRedirect({
        displayName: "Ada",
        welcomeSeenAt: "2026-08-01T00:00:00Z",
        wagerUiEnabled: true,
      }),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm vitest run tests/onboarding-gate.test.ts`
Expected: FAIL — cannot resolve `@/lib/onboarding/gate`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/onboarding/gate.ts
/**
 * Decides where a signed-in user belongs before they reach the app.
 *
 * Pure so it can be tested without stubbing Next's `redirect`, and so both
 * signed-in layouts share one definition of the rule rather than duplicating
 * the branch.
 */

export type OnboardingRedirect = "/onboarding" | "/welcome" | null;

export interface OnboardingState {
  displayName: string | null;
  welcomeSeenAt: string | null;
  /** The tour explains wagering, so it stays hidden while the feature is off. */
  wagerUiEnabled: boolean;
}

export function resolveOnboardingRedirect(input: OnboardingState): OnboardingRedirect {
  // A display name is required to appear on a leaderboard, so it gates first.
  if (!input.displayName) return "/onboarding";
  if (input.wagerUiEnabled && !input.welcomeSeenAt) return "/welcome";
  return null;
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `pnpm vitest run tests/onboarding-gate.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/onboarding/gate.ts tests/onboarding-gate.test.ts
git commit -m "feat(onboarding): add pure gate resolver for the welcome tour"
```

---

### Task 3: Step definitions

**Files:**
- Create: `lib/onboarding/steps.ts`

**Interfaces:**
- Consumes: nothing
- Produces:

```ts
export interface WelcomeStep {
  id: "scoring" | "pools" | "wagers" | "wallet" | "risk";
  /** Key suffix under the `welcome` i18n namespace: welcome.<id>Title etc. */
  icon: "TrophyIcon" | "UsersIcon" | "CoinsIcon" | "WalletIcon" | "ShieldAlertIcon";
}
export const WELCOME_STEPS: readonly WelcomeStep[];
export const WELCOME_STEP_COUNT: number;
```

- [ ] **Step 1: Write the step data**

```ts
// lib/onboarding/steps.ts
/**
 * The five welcome-tour steps, as data rather than components.
 *
 * Every step shares one shape — eyebrow, title, body — and only `wallet` adds
 * interactive content, so a list plus one renderer beats five near-identical
 * components. Copy lives in the `welcome` i18n namespace, keyed by step id.
 */

export interface WelcomeStep {
  id: "scoring" | "pools" | "wagers" | "wallet" | "risk";
  icon: "TrophyIcon" | "UsersIcon" | "CoinsIcon" | "WalletIcon" | "ShieldAlertIcon";
}

export const WELCOME_STEPS: readonly WelcomeStep[] = [
  { id: "scoring", icon: "TrophyIcon" },
  { id: "pools", icon: "UsersIcon" },
  { id: "wagers", icon: "CoinsIcon" },
  { id: "wallet", icon: "WalletIcon" },
  { id: "risk", icon: "ShieldAlertIcon" },
] as const;

export const WELCOME_STEP_COUNT = WELCOME_STEPS.length;
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm typecheck`
Expected: no output (success).

- [ ] **Step 3: Commit**

```bash
git add lib/onboarding/steps.ts
git commit -m "feat(onboarding): define welcome tour steps"
```

---

### Task 4: i18n copy for all four locales

**Files:**
- Modify: `messages/en.json`, `messages/es.json`, `messages/fr.json`, `messages/de.json`

**Interfaces:**
- Consumes: step ids from `lib/onboarding/steps.ts`
- Produces: a `welcome` namespace with these exact keys, used by Task 6:
  `title`, `eyebrow`, `progress`, `skip`, `back`, `next`, `finish`,
  and for each step id `<id>Title` + `<id>Body`, plus `scoringExact`,
  `scoringWinnerGd`, `scoringWinner`, `walletOptional`, `riskDevnet`,
  `riskOracle`, `riskFinal`.

- [ ] **Step 1: Add the English copy**

Add this object at the top level of `messages/en.json` (sibling of `wager`, `wallet`):

```json
"welcome": {
  "title": "Welcome to Winscore",
  "eyebrow": "Getting started",
  "progress": "{current} of {total}",
  "skip": "Skip",
  "back": "Back",
  "next": "Next",
  "finish": "Start playing",
  "scoringTitle": "How scoring works",
  "scoringBody": "Predict the exact score of every match. Points are awarded per match, and the leaderboard ranks everyone in your pool.",
  "scoringExact": "5 points — exact score",
  "scoringWinnerGd": "3 points — right winner and goal difference",
  "scoringWinner": "1 point — right winner only",
  "poolsTitle": "Pools and rounds",
  "poolsBody": "Join a pool with friends and predict a full round of fixtures. Your picks lock at kickoff, so a late edit is never possible.",
  "wagersTitle": "Optional matchday wagers",
  "wagersBody": "A pool owner can enable wagering on a round. Everyone who joins stakes the same fixed amount, and whoever finishes first takes the whole pot. Playing for free works exactly as before and needs no wallet.",
  "walletTitle": "Link a Solana wallet",
  "walletBody": "Wagering needs a linked wallet to sign your entry. You can link one now or later from any round page.",
  "walletOptional": "This step is optional.",
  "riskTitle": "Risk and settlement",
  "riskBody": "Read this before placing a wager.",
  "riskDevnet": "Wagering runs on Solana Devnet. Devnet tokens have no real monetary value.",
  "riskOracle": "Winscore scores the round and settles the pot. Results come from our data provider, not from the blockchain.",
  "riskFinal": "An entry is irreversible once signed, and the settlement rules are final."
}
```

- [ ] **Step 2: Add the same keys to `es`, `fr`, `de`**

Translate every value. Keep `{current}` and `{total}` intact in `progress`. Do not translate the key names. Keep the numeric point values (5 / 3 / 1) unchanged.

- [ ] **Step 3: Verify parity across locales**

```bash
python3 -c "
import json
en=set(json.load(open('messages/en.json'))['welcome'])
for l in ['es','fr','de']:
    o=set(json.load(open(f'messages/{l}.json'))['welcome'])
    print(l, 'missing:', sorted(en-o), 'extra:', sorted(o-en))
"
```

Expected: `missing: [] extra: []` for all three.

- [ ] **Step 4: Commit**

```bash
git add messages/
git commit -m "feat(i18n): add welcome tour copy in all four locales"
```

---

### Task 5: `markWelcomeSeen` server action

**Files:**
- Create: `app/[locale]/welcome/actions.ts`
- Create: `tests/welcome-actions.test.ts`

**Interfaces:**
- Consumes: `profiles.welcome_seen_at` from Task 1
- Produces: `export async function markWelcomeSeen(): Promise<void>` — writes the timestamp only when currently null, then redirects to `/matches`. Also exports the testable core:

```ts
export async function recordWelcomeSeen(
  supabase: SupabaseLike,
  userId: string,
): Promise<void>;
```

- [ ] **Step 1: Write failing tests**

```ts
// tests/welcome-actions.test.ts
import { describe, expect, it, vi } from "vitest";
import { recordWelcomeSeen } from "@/app/[locale]/welcome/actions";

/**
 * Idempotence is the property that matters: stepping backward through the tour
 * or re-submitting must not move the original timestamp, because it is the
 * record of when the player was actually shown the rules.
 */
function makeSupabase(existing: string | null) {
  const update = vi.fn(() => ({ eq: () => ({ is: () => Promise.resolve({ error: null }) }) }));
  const client = {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { welcome_seen_at: existing } }),
        }),
      }),
      update,
    })),
  };
  return { client, update };
}

describe("recordWelcomeSeen", () => {
  it("writes the timestamp when it is unset", async () => {
    const { client, update } = makeSupabase(null);
    await recordWelcomeSeen(client as never, "user-1");
    expect(update).toHaveBeenCalledTimes(1);
    const arg = update.mock.calls[0][0] as { welcome_seen_at: string };
    expect(typeof arg.welcome_seen_at).toBe("string");
  });

  it("does not overwrite an existing timestamp", async () => {
    const { client, update } = makeSupabase("2026-07-01T00:00:00Z");
    await recordWelcomeSeen(client as never, "user-1");
    expect(update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm vitest run tests/welcome-actions.test.ts`
Expected: FAIL — `recordWelcomeSeen` is not exported.

- [ ] **Step 3: Write the implementation**

```ts
// app/[locale]/welcome/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** The narrow slice of the Supabase client this module uses. */
type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{ data: { welcome_seen_at: string | null } | null }>;
      };
    };
    update: (values: { welcome_seen_at: string }) => {
      eq: (col: string, val: string) => {
        is: (col: string, val: null) => Promise<{ error: unknown }>;
      };
    };
  };
};

/**
 * Records that the player finished (or skipped) the tour.
 *
 * Only writes when the column is null, so re-running the tour never moves the
 * original timestamp — it is the record of when the player was first shown the
 * rules, which matters more than when they last looked. The `.is()` filter
 * makes that guarantee hold even under a concurrent double submit.
 */
export async function recordWelcomeSeen(supabase: SupabaseLike, userId: string): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("welcome_seen_at")
    .eq("id", userId)
    .single();

  if (data?.welcome_seen_at) return;

  await supabase
    .from("profiles")
    .update({ welcome_seen_at: new Date().toISOString() })
    .eq("id", userId)
    .is("welcome_seen_at", null);
}

export async function markWelcomeSeen(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  await recordWelcomeSeen(supabase as unknown as SupabaseLike, user.id);

  revalidatePath("/", "layout");
  redirect("/matches");
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `pnpm vitest run tests/welcome-actions.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/welcome/actions.ts" tests/welcome-actions.test.ts
git commit -m "feat(onboarding): add idempotent markWelcomeSeen action"
```

---

### Task 6: Tour client component

**Files:**
- Create: `app/[locale]/welcome/welcome-tour.tsx`

**Interfaces:**
- Consumes: `WELCOME_STEPS`, `WELCOME_STEP_COUNT` (Task 3); `welcome` i18n namespace (Task 4); `markWelcomeSeen` (Task 5); `WalletLinkButton` from `@/components/wallet/wallet-link-button`
- Produces: `export function WelcomeTour(props: { walletAddress?: string }): JSX.Element`

`walletAddress` is the base58 address of an already-linked wallet, or undefined. It is passed straight through to `WalletLinkButton`, which renders it truncated — so it must be a real address, never a sentinel string.

- [ ] **Step 1: Write the component**

```tsx
// app/[locale]/welcome/welcome-tour.tsx
"use client";

import {
  CoinsIcon,
  type LucideIcon,
  ShieldAlertIcon,
  TrophyIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { WalletLinkButton } from "@/components/wallet/wallet-link-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WELCOME_STEP_COUNT, WELCOME_STEPS } from "@/lib/onboarding/steps";
import { markWelcomeSeen } from "./actions";

const ICONS: Record<string, LucideIcon> = {
  TrophyIcon,
  UsersIcon,
  CoinsIcon,
  WalletIcon,
  ShieldAlertIcon,
};

export function WelcomeTour({ walletAddress }: { walletAddress?: string }) {
  const t = useTranslations("welcome");
  const [index, setIndex] = useState(0);

  const step = WELCOME_STEPS[index];
  const Icon = ICONS[step.icon];
  const isLast = index === WELCOME_STEP_COUNT - 1;

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-6 py-12">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          {t("progress", { current: index + 1, total: WELCOME_STEP_COUNT })}
        </p>
        <form action={markWelcomeSeen}>
          <Button type="submit" variant="ghost" size="sm">
            {t("skip")}
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="size-4 text-flag" />
            {t(`${step.id}Title`)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t(`${step.id}Body`)}</p>

          {step.id === "scoring" && (
            <ul className="space-y-1 text-sm">
              <li>{t("scoringExact")}</li>
              <li>{t("scoringWinnerGd")}</li>
              <li>{t("scoringWinner")}</li>
            </ul>
          )}

          {step.id === "wallet" && (
            <div className="space-y-3">
              <WalletLinkButton initialWalletAddress={walletAddress} />
              <p className="text-xs text-muted-foreground">{t("walletOptional")}</p>
            </div>
          )}

          {step.id === "risk" && (
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("riskDevnet")}</li>
              <li>{t("riskOracle")}</li>
              <li>{t("riskFinal")}</li>
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIndex((i) => i - 1)}
          disabled={index === 0}
        >
          {t("back")}
        </Button>

        {isLast ? (
          <form action={markWelcomeSeen}>
            <Button type="submit" size="sm">
              {t("finish")}
            </Button>
          </form>
        ) : (
          <Button size="sm" onClick={() => setIndex((i) => i + 1)}>
            {t("next")}
          </Button>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm typecheck`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/welcome/welcome-tour.tsx"
git commit -m "feat(onboarding): add welcome tour client component"
```

---

### Task 7: Welcome page

**Files:**
- Create: `app/[locale]/welcome/page.tsx`

**Interfaces:**
- Consumes: `WelcomeTour` (Task 6); `isWagerUiEnabled` from `@/lib/wager/env`
- Produces: the `/[locale]/welcome` route

- [ ] **Step 1: Write the page**

```tsx
// app/[locale]/welcome/page.tsx
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isWagerUiEnabled } from "@/lib/wager/env";
import { WelcomeTour } from "./welcome-tour";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "welcome" });
  return { title: t("title") };
}

export default async function WelcomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(localePath(locale, "/sign-in"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, welcome_seen_at")
    .eq("id", user.id)
    .single();

  // The display name is the harder gate, so an unnamed player goes back to it.
  if (!profile?.display_name) redirect(localePath(locale, "/onboarding"));

  // Already seen, or wagering is off: there is nothing to show. Re-reading the
  // material is what /how-it-works is for.
  if (profile.welcome_seen_at || !isWagerUiEnabled()) {
    redirect(localePath(locale, "/matches"));
  }

  // wallet_address is bytea, which supabase-js returns hex-escaped, so it has
  // to be decoded to base58 before the button can display it. Same conversion
  // the round page does.
  const { data: link } = await supabase
    .from("wallet_links")
    .select("wallet_address")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  let walletAddress: string | undefined;
  const hex =
    typeof link?.wallet_address === "string" ? link.wallet_address.replace(/^\\x/, "") : "";
  if (hex) {
    const { base58 } = await import("@scure/base");
    walletAddress = base58.encode(Buffer.from(hex, "hex"));
  }

  return <WelcomeTour walletAddress={walletAddress} />;
}
```

- [ ] **Step 2: Verify the route builds**

Run: `pnpm build 2>&1 | grep -E "welcome|error|Compiled successfully"`
Expected: `✓ Compiled successfully` and a `/[locale]/welcome` entry in the route list.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/welcome/page.tsx"
git commit -m "feat(onboarding): add welcome tour page"
```

---

### Task 8: Wire the gate into both layouts

**Files:**
- Modify: `app/[locale]/(app)/layout.tsx`
- Modify: `app/[locale]/[league]/(app)/layout.tsx`
- Modify: `app/[locale]/onboarding/actions.ts` (redirect target)

**Interfaces:**
- Consumes: `resolveOnboardingRedirect` (Task 2), `isWagerUiEnabled` from `@/lib/wager/env`
- Produces: nothing new

- [ ] **Step 1: Update `app/[locale]/(app)/layout.tsx`**

Replace the profile select and the `if (!profile?.display_name)` branch with:

```tsx
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, welcome_seen_at")
    .eq("id", user.id)
    .single();

  const target = resolveOnboardingRedirect({
    displayName: profile?.display_name ?? null,
    welcomeSeenAt: profile?.welcome_seen_at ?? null,
    wagerUiEnabled: isWagerUiEnabled(),
  });
  if (target) redirect(localePath(locale, target));
```

Add the imports:

```tsx
import { resolveOnboardingRedirect } from "@/lib/onboarding/gate";
import { isWagerUiEnabled } from "@/lib/wager/env";
```

- [ ] **Step 2: Apply the identical change to `app/[locale]/[league]/(app)/layout.tsx`**

Same replacement and same imports. This layout has the same query and branch today.

- [ ] **Step 3: Point onboarding at the tour**

In `app/[locale]/onboarding/actions.ts`, change the final redirect:

```ts
  revalidatePath("/", "layout");
  redirect("/welcome");
```

The welcome page itself redirects on to `/matches` when the tour is unnecessary (already seen, or wagering off), so this is safe with the flag in either state.

- [ ] **Step 4: Verify typecheck and full suite**

```bash
pnpm typecheck
pnpm test
```

Expected: typecheck silent; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(app)/layout.tsx" "app/[locale]/[league]/(app)/layout.tsx" "app/[locale]/onboarding/actions.ts"
git commit -m "feat(onboarding): route new players through the welcome tour"
```

---

### Task 9: Extend the i18n guard suite

**Files:**
- Modify: `tests/wager-i18n.test.ts`

**Interfaces:**
- Consumes: the `welcome` namespace (Task 4), `welcome-tour.tsx` (Task 6)
- Produces: nothing

- [ ] **Step 1: Add the namespace and component to the existing lists**

In `tests/wager-i18n.test.ts`:

```ts
const NAMESPACES = ["wager", "wallet", "wagerPayout", "wagerResults", "welcome"] as const;

const COMPONENTS = [
  "components/wager/wager-rail.tsx",
  "components/wager/wager-payout.tsx",
  "components/wager/wager-results-table.tsx",
  "components/wallet/wallet-link-button.tsx",
  "app/[locale]/welcome/welcome-tour.tsx",
];
```

And add the interpolation arguments for the new namespace to `ARGS`:

```ts
  welcome: { current: 1, total: 5 },
```

- [ ] **Step 2: Run the suite and verify it passes**

Run: `pnpm vitest run tests/wager-i18n.test.ts`
Expected: PASS (4 tests) — parity, ICU formatting, `useTranslations` presence, and no hardcoded sentences, now covering the tour.

- [ ] **Step 3: Prove the scanner covers the new component**

Temporarily replace one `t("…")` call in `welcome-tour.tsx` with a literal such as `Start playing`, re-run the suite, and confirm it FAILS naming that file. Then restore the file and confirm it passes again. A guard that has not been seen failing is not known to work.

- [ ] **Step 4: Commit**

```bash
git add tests/wager-i18n.test.ts
git commit -m "test(i18n): cover the welcome tour in the locale guard suite"
```

---

### Task 10: Full verification

**Files:** none

- [ ] **Step 1: Run every check**

```bash
pnpm typecheck
pnpm test
pnpm build
node_modules/.bin/biome check --diagnostic-level=error
```

Expected: typecheck silent, all tests pass, build compiles, biome reports no error-level diagnostics. Report any failure verbatim rather than summarising it as passing.

- [ ] **Step 2: Manually walk the flow**

With `WAGER_UI_ENABLED=true` in `.env.local`, run `pnpm dev` and sign in as a user whose `welcome_seen_at` is null. Confirm: the tour appears after the display-name step, Skip works from step 1, Back and Next move between all five steps, the wallet step renders the link button, and finishing lands on `/matches`. Then reload `/welcome` and confirm it redirects rather than replaying.

- [ ] **Step 3: Confirm the flag actually gates it**

Set `WAGER_UI_ENABLED=false`, restart the dev server, and confirm a user with a null `welcome_seen_at` goes straight to `/matches` with no tour.

- [ ] **Step 4: Push and open a PR**

```bash
git push -u origin <branch>
gh pr create --title "feat(onboarding): welcome tour" --body "<summary + verification results>"
```

Note: `gh` must be authenticated as `pretxel` — the `eserrano-90` account has read-only access to this repo and PR creation fails with "must be a collaborator".
