## Why

The product is branded as "World Cup 2026 Pool", a name derived from the active competition (`siteName = "${shortName} Pool"`). But the app already runs La Liga and Liga MX pools, so the brand is outgrowing the tournament it was named after. A fixed, competition-independent product name — **Winscore** — lets one brand carry every competition, and lets the tournament read as an *edition* rather than the product itself. The repo is already `winscore-app`; the name in the code and docs hasn't caught up.

## What Changes

- **Product brand becomes a fixed name, "Winscore".** `getActiveBranding().siteName` stops resolving to `"${shortName} Pool"` and returns the constant product name. The competition `short_name` (e.g. "World Cup 2026") composes as an *edition* subtitle in titles and OG copy, not as the brand itself. **BREAKING** for the `ResolvedBranding.siteName` contract: it no longer reskins on competition switch (the edition subtitle does).
- **Title templates and metadata** in `app/layout.tsx` + `app/[locale]/layout.tsx` switch from `"%s · WC26 Pool"` / literal "World Cup 2026 Pool" to `"%s · Winscore"` and Winscore-anchored `applicationName`, `authors`, `creator`, `publisher`, and JSON-LD `WebSite`/`Organization` names.
- **Email sender name** (`emailFromName`) stays competition-scoped and is NOT rebranded — each competition keeps its own sender ("World Cup Pools", "La Liga Pools", "Liga MX Pools") set in `branding.emailFromName`. (Descope decision: rebranding it would require editing 3 applied seed migrations plus a prod data migration.)
- **UI copy** in `messages/{en,es,fr,de}.json`: product-brand occurrences of "World Cup 2026 Pool" become "Winscore"; occurrences that name the *tournament* ("every World Cup 2026 match") keep the competition name.
- **`package.json` name** `world-cup-pools` → `winscore`.
- **Documentation**: `README.md`, `docs/architecture.md`, `docs/operator-guide.md`, `docs/contributing.md`, `docs/test-plan.md`, and `public/flags/README.md` refer to the product as Winscore; tournament-specific references stay.
- **Out of scope (follow-up):** the visual brand mark — `Logotype` wordmark ("WC26 · Pool"), `app/opengraph-image.tsx`, favicons, and `brandCode` — is intentionally left until a dedicated brand-mark change. Text will read "Winscore" while the wordmark still shows "WC26"; this gap is called out here on purpose.

## Capabilities

### New Capabilities
<!-- None. This change renames an existing brand surface; no new capability is introduced. -->

### Modified Capabilities
- `brand-identity`: The "Branding resolves from the active competition" requirement changes — the **product name** (`siteName`, `applicationName`, title templates, JSON-LD org/website name) is now a fixed brand "Winscore" that does NOT reskin on competition switch; the competition `short_name` resolves only as an *edition* subtitle. The email sender name stays competition-scoped (not rebranded). The wordmark/favicon/OG requirements are unchanged (deferred).

## Impact

- **Code:** `lib/competition.ts` (`getActiveBranding`, `PRODUCT_NAME`), `app/layout.tsx`, `app/[locale]/layout.tsx`, `app/[locale]/page.tsx`, `app/[locale]/how-it-works/page.tsx`, `app/[locale]/(public)/matches/[matchId]/page.tsx`, `components/site-nav.tsx`, `lib/ai/openrouter.ts` (`X-Title`), `app/opengraph-image.alt.txt`, `messages/{en,es,fr,de}.json`, `package.json`.
- **Docs:** `README.md`, `docs/architecture.md`, `docs/operator-guide.md`, `docs/test-plan.md`, `public/flags/README.md`.
- **Tests:** branding-mock `siteName`/`ogAlt` in `tests/news.test.ts` + `tests/sync-matches-email.test.ts` move to "Winscore". Email-sender assertions are unchanged (sender descoped).
- **No DB / migration impact:** the `competitions` table, `branding` JSONB, seeds, and the "World Cup 2026" competition entity are untouched.
- **SEO/social:** site title, OG `siteName`, and JSON-LD names change; canonical URL and domain are unaffected.
