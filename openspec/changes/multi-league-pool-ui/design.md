## Context

The `multi-league-pool-platform` backend is in place (`is_live`, `set_league_live`, `league_id_for_slug`, `getLeagueFromContext`, `getLeagueBySlug`, `getLeagueForPool`, `listLiveLeagues`, `listMyPoolsByLeague`, `create_group` with a live-league guard). The app still resolves a single global active competition through `getActiveCompetition()`/`getActiveBranding()` in 28 files, and every user-facing page renders one league. This change wires the route context, retargets those callers, builds the platform's screens with a distinctive design system, and retires the single-active machinery.

## Goals / Non-Goals

**Goals:**
- `[league]` routing with legacy redirects; every page resolves its league from route or pool context.
- A distinctive, subject-grounded design system applied to the home, catalog, create-pool flow, and pool dashboard.
- Cron routes operate across all live leagues.
- Retire `is_active` / `active_competition_id()` / `set_active_competition()`.

**Non-Goals:**
- New pool/league behavior (specified by the platform change).
- Public/discoverable pools; cross-league pools.
- The visual brand-mark rebrand (still brand-identity; product name stays "Winscore").

## Frontend design system — "the matchday board"

Chosen deliberately against the three AI-default looks (cream+serif+terracotta; near-black+single-acid; broadsheet hairlines): a floodlit night-pitch base, warm floodlight-gold plus per-league identity hues (not one acid accent), and an *expanded* display face (a stadium nameplate) rather than the condensed-Oswald cliché.

**Color tokens.** Realized by making the app's existing `.dark` theme ("Stadium night") the default (`defaultTheme="dark"`) and retuning its base surfaces from blue-ink (hue 250) toward **petrol-teal** (hue ~205): `--background`, `--card`/`--sidebar`, `--popover`, `--secondary`, `--muted`. The existing semantic tokens already carry the rest of the direction and are reused rather than duplicated: `--flag` (floodlight gold) is the accent/CTA, `--primary` (floodlit emerald) the action green, `--border` the turf-line hairline, `--foreground` the chalk ink, `--live` the glowing scoreline red. Per-league identity hue is passed to `LeagueRail` per lane (from the league crest: La Liga crimson `#E4002B`, World Cup green `#127A4B`, …).

**Type.** Display **Archivo Black** (heavy editorial grotesque, wired as `--font-heading` for league nameplates + headings — Archivo *Expanded* isn't in `next/font/google`, and Archivo Black lands the same blocky nameplate presence). Body **Manrope** and data **JetBrains Mono** (tabular scorelines/ranks) are kept from the existing system — both already fit the grotesque/mono roles, so swapping them would be churn without identity gain.

**Layout — league lanes:** the home is a vertical stack of full-width league lanes; each = a left vertical nameplate rail (league name in Archivo Expanded on the league hue, chalk border) + a horizontal region of pool cards and a live/next fixtures strip. Create-pool reads like a modern pools coupon; the pool dashboard is single-league focus.

**Signature:** the vertical league nameplate rail + a **split-flap `Scoreline`** that flips on a live score update (rides the existing realtime scores/leaderboard publications). Everything else stays quiet.

**Motion:** staggered lane slide-in on load; split-flap flip only on score change; hover-lift on pool cards. `prefers-reduced-motion` disables flip + slide.

**Quality floor:** responsive (lanes stack on mobile, rail → top chip), visible keyboard focus, reduced motion respected.

## Decisions

- **DB-layer league context via PostgREST `request.headers` (not a session GUC).** `active_competition_id()` is baked into the leaderboard views, segmented-leaderboard functions, and scoring/RLS (`where competition_id = active_competition_id()`), so app-layer resolution alone never reaches them. A session GUC can't carry the league across Supabase's pooled, stateless PostgREST requests. Instead the server Supabase client sends a per-request `x-league` header, and `active_competition_id()` is redefined to resolve it — `current_setting('request.headers', true)::json ->> 'x-league'` → league id — falling back to the single active competition during the transition. Every existing competition-scoped view / RLS / function then scopes to the request's league **with zero changes to them**. *Why:* one function redefinition scopes the whole DB layer; the alternative (threading `competition_id` through every view/function/RLS/query) is far larger and error-prone. *Security:* the header is set by our server, not the user; predictions RLS remains user-scoped, so a spoofed header on a public read exposes only already-public league data.
- **Server client carries the league.** `createServerSupabaseClient(leagueSlug?)` injects `global.headers['x-league']`; the `[league]` route and pool dashboards pass their resolved slug. **Verification caveat:** RLS + per-league scoping behavior cannot be verified without a live DB apply (`supabase db push`) — this must be smoke-tested with two live leagues before trusting it.
- **`[league]` as a route segment, not a cookie.** The URL carries the league (`/[league]/matches`). *Why:* shareable, cacheable, no hidden state. Pages resolve via `getLeagueFromContext({ slug })`; unknown/non-live slug → catalog. *Alternative:* per-user "current league" cookie — rejected as hidden state.
- **Sequence: resolver swap → routes → cutover, behind typecheck.** Replace `getActiveCompetition`/`getActiveBranding` call by call, letting `pnpm typecheck` enumerate them; move pages under `[league]` with redirects; only after no caller depends on the old anchors, drop `is_active`/`active_competition_id()`/`set_active_competition()` in a cleanup migration. *Why:* keeps each step compilable; rollback is a revert.
- **Cron routes iterate live leagues.** The 8 cron routes (`sync-matches`, reminders, digests, …) currently resolve the single active competition; they iterate `listLiveLeagues()` and run per league. *Trade-off:* more work per run — acceptable; bounded by the (small) number of live leagues.
- **Reuse existing per-league pages under the new segment.** The current `matches`/`leaderboard`/`my-picks` components already render one competition; parameterize their league source with the route resolver rather than rewriting them.
- **Home is new; dashboards reuse.** The cross-league home (lanes) is net-new; the pool dashboard composes the existing per-competition fixtures/standings scoped to the pool's league.

## Risks / Trade-offs

- **Broad, app-breaking mid-migration.** → Do the resolver swap first (typecheck enumerates callers), keep the additive backend compatible, land routes behind the `[league]` segment before removing old anchors. Rollback = revert this change; the platform backend stays compatible.
- **Cron correctness across leagues.** A missed league in a loop silently skips its emails/sync. → Add a per-league count to each cron's summary log; assert the loop covers `listLiveLeagues()`.
- **URL/SEO churn.** → 308 redirects from legacy paths; per-league canonical.
- **Design over-animation reading as AI-generated.** → Confine motion to the one signature (split-flap on score change) + a restrained load stagger; everything else static.

## Migration Plan

1. Design foundation: tokens + fonts + `LeagueRail` + `Scoreline`.
2. Resolver swap: retarget the 28 callers to `getLeagueFromContext`/`getBrandingForLeague`; cron routes iterate `listLiveLeagues()`.
3. Routing: add `[league]` segment, move pages under it, add 308 redirects.
4. Screens: cross-league home, catalog page, create-pool flow, pool dashboard, join.
5. Cutover: `set_league_live()` for launch leagues; cleanup migration drops `is_active`/`active_competition_id()`/`set_active_competition()`.
6. Verify: typecheck / lint / test / build; two-live-league smoke; a11y + reduced-motion pass.

## Open Questions

- Redirect target for legacy paths — catalog (leaning) vs a default league.
- Whether `[league]` sits inside the existing `[locale]` segment (`/[locale]/[league]/…`) — likely yes, to preserve i18n routing.
