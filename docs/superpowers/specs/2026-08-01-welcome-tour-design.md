# Welcome tour — design

A five-step tour shown once to every signed-in player, covering scoring, pools,
optional matchday wagers, wallet linking, and the risk/oracle model. Skippable
at every step.

## Why

Wagering is live on devnet but nothing explains it. A member reaches
`WagerRail` on a round page with no prior context about the stake, the pot, who
settles results, or what linking a wallet means. The consent dialog in
`components/wager/wager-rail.tsx` states the essentials before a signature, but
it is a confirmation gate, not an explanation — by the time a user reads it
they have already decided to enter.

## Scope decisions

These were settled during brainstorming and are recorded because each one has a
defensible alternative:

| Decision | Chosen | Alternative rejected |
| --- | --- | --- |
| Audience | Every signed-in user | Only users who reach a wager-enabled round |
| Blocking | Skippable at every step | Hard gate like the display-name step |
| Persistence | `profiles.welcome_seen_at` | localStorage / cookie |
| Length | 5 steps | 3 (wager-only) or 4 (condensed) |
| Existing users | See the tour on next sign-in | Backfill as already-seen |

Showing crypto content to players who only want the free game is in tension
with `PROMPT_CRYPTO.md`'s position that the free experience is the base and
wagering is strictly optional. The skip affordance is the mitigation: the tour
informs, the consent dialog protects.

## Routes

`/onboarding` keeps its current behaviour — a hard gate that collects
`display_name`. The tour is a separate route because the two have opposite
natures: one blocks, one does not.

```
/onboarding  → display name (blocking, exists today). On submit → /welcome
/welcome     → five-step tour (skippable). On finish or skip → /matches
```

## Gate

`app/[locale]/(app)/layout.tsx` and `app/[locale]/[league]/(app)/layout.tsx`
today run the same profile query and the same redirect check. The decision
moves into a pure function both call:

```ts
// lib/onboarding/gate.ts
export function resolveOnboardingRedirect(input: {
  displayName: string | null;
  welcomeSeenAt: string | null;
  wagerUiEnabled: boolean;
}): "/onboarding" | "/welcome" | null;
```

Pure so it is testable without stubbing Next's `redirect`. The layouts keep
their existing query and pass the two columns in.

The `/welcome` redirect is conditional on `WAGER_UI_ENABLED`. With wagering off
the column stays null and the tour appears once the flag is turned on, which
self-corrects rather than stranding users on a tour about a disabled feature.

## State

```sql
alter table public.profiles
  add column welcome_seen_at timestamptz;
```

Mirrors the existing `welcome_email_sent_at` shape. No backfill: every current
user sees the tour once on their next sign-in, which is intended — none of them
have seen any wagering explanation.

Named `welcome_seen_at` rather than `wager_onboarding_seen_at` because the tour
covers the whole app, not only wagering.

A `markWelcomeSeen()` server action writes it, guarded to only set the value
when null so stepping backward through the tour cannot rewrite the timestamp.

Visiting `/welcome` directly after completing it redirects to `/matches` rather
than replaying the tour, matching how `/onboarding` already redirects once
`display_name` is set. Re-reading the material is what `/how-it-works` is for.

## Components

```
app/[locale]/welcome/
  page.tsx          Server Component — auth, profile read, redirect if already seen
  actions.ts        markWelcomeSeen()
  welcome-tour.tsx  Client Component — current step, navigation, skip

lib/onboarding/
  gate.ts           resolveOnboardingRedirect()
  steps.ts          step definitions: id, icon, i18n key
```

One client component holding step state, not five. The steps are data rather
than components — all five share a shape (eyebrow, title, body, optional slot)
and only step 4 has interactive content, where it mounts the existing
`WalletLinkButton`.

No per-step URLs. It is a linear skippable flow; React state is sufficient and
avoids five routes to maintain.

## Steps

| # | Content | Interactive |
| --- | --- | --- |
| 1 | Welcome, scoring (5 exact / 3 winner+GD / 1 winner), tie-breaks | — |
| 2 | Pools and rounds: join, predict, picks lock at kickoff | — |
| 3 | Optional matchday wagers: fixed stake, pot, winners take all, free play unchanged | — |
| 4 | Link a Solana wallet | `WalletLinkButton` |
| 5 | Risk and oracle: devnet tokens have no real value, Winscore settles, rules are final, entries are irreversible | — |

Step 3 states explicitly that wagering is optional and that free predictions
work without a wallet. Step 5 reuses the consent dialog's language so the terms
are already familiar at signing time.

Skip is visible on every step. A `1 / 5` progress indicator sits above the
content.

## i18n

A `welcome` namespace, roughly 28 keys, in en/es/fr/de.

`tests/wager-i18n.test.ts` already asserts key parity, ICU formatting through
next-intl, `useTranslations` presence, and the absence of hardcoded English
sentences. Adding the namespace to its `NAMESPACES` list and the component to
its `COMPONENTS` list inherits all four checks.

## Testing

- `resolveOnboardingRedirect` — table of cases: no display name → `/onboarding`;
  name set but welcome unseen and wager UI on → `/welcome`; wager UI off →
  `null`; both set → `null`
- `markWelcomeSeen` — idempotent, does not overwrite an existing timestamp
- i18n — inherited from the extended suite

No tests for tour navigation: it is React state with no logic worth covering.

## Risks

**Sign-up friction.** A player who only wants the free game passes three
wagering screens. This is the cost of showing the tour to everyone; the skip
control is the mitigation.

**Step 4 can show an error inside a welcome flow.** With no wallet extension
installed, `WalletLinkButton` renders "No Solana wallet found". Accepted: the
step's copy makes clear that linking is optional and can be done later from the
round page.

**The tour can drift from the rules.** If scoring changes, this copy silently
becomes wrong. No automatic mitigation, the same exposure `/how-it-works`
already carries.
