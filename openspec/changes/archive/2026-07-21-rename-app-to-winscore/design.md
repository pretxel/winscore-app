## Context

The product name is derived from the active competition: `lib/competition.ts` `getActiveBranding()` returns `siteName: "${shortName} Pool"`, so the brand reads "World Cup 2026 Pool", "La Liga Pool", etc. Metadata literals in `app/layout.tsx` and `app/[locale]/layout.tsx` hardcode "World Cup 2026 Pool" and the title template `"%s · WC26 Pool"`. The `messages/*.json` files carry ~20 "World Cup 2026 Pool" strings. Docs and `package.json` (`world-cup-pools`) still use the old name.

The brand now spans multiple competitions, so the name must decouple from any single tournament. The repo directory is already `winscore-app`. This change makes "Winscore" the product name everywhere text appears, while deliberately deferring the visual brand mark (Logotype wordmark, favicons, OG image, `brandCode`) to a separate change.

## Goals / Non-Goals

**Goals:**
- One fixed product name, "Winscore", across code, UI copy, metadata, email sender, JSON-LD, `package.json`, and docs.
- Competition `short_name` surfaces as an *edition* subtitle, not the product name.
- No behavioral change to competitions, scoring, seeds, migrations, or the DB.

**Non-Goals:**
- The visual brand mark: `Logotype` wordmark ("WC26 · Pool"), `app/opengraph-image.tsx`, favicons (`app/icon.*`, `app/apple-icon.png`, `app/favicon.ico`), and the `brandCode` value stay "WC26". A follow-up change owns the wordmark rebrand.
- Renaming the "World Cup 2026" competition, its slug, seeds, or `branding` JSONB.
- Domain / canonical URL changes.

## Decisions

- **Fixed product constant over competition-derived name.** Introduce `PRODUCT_NAME = "Winscore"` and return it from `getActiveBranding().siteName` unconditionally, rather than `"${shortName} Pool"`. *Why:* a multi-competition brand can't be a function of the active tournament. *Alternative considered:* `"Winscore · ${shortName}"` as `siteName` — rejected because it re-couples the brand to the competition and bloats every surface that just needs the brand; the edition belongs in titles/OG, composed at the call site, not baked into `siteName`.
- **Edition composes at the title layer.** Default title becomes e.g. `"Winscore — World Cup 2026: Daily Predictions & Live Leaderboard"` and the template becomes `"%s · Winscore"`. The competition subtitle is assembled where the title string is built (layout metadata / `siteMeta` messages), keeping `siteName` clean. *Why:* keeps the "product vs edition" split explicit and testable.
- **`emailFromName` stays competition-scoped (descoped from the rename).** Implementation revealed each competition sets its own sender name in `branding.emailFromName` (`World Cup Pools`, `La Liga Pools`, `Liga MX Pools`), which always overrides any fallback — so rebranding the sender would require editing 3 applied seed migrations plus a prod data migration, violating the "no migration impact" goal. Decision: leave the sender name as-is; the fallback constant remains `FALLBACK_EMAIL_FROM_NAME` and `lib/env.ts`'s `EMAIL_FROM` default is untouched. `newsQuery`, `ogAlt`, and stage labels also stay competition-derived. Only `siteName`/`applicationName`/title-templates/JSON-LD adopt the fixed "Winscore".
- **Message strings split by intent.** In `messages/*.json`, replace "World Cup 2026 Pool" (the *pool/product*) with "Winscore"; keep "World Cup 2026" where it names the *tournament* ("Predict every World Cup 2026 match"). Apply the same split across `en`, `es`, `fr`, `de`.
- **`package.json` name → `winscore`.** Matches the repo directory and product name.
- **Wordmark left as WC26 on purpose.** The text/brand-mark mismatch is a known, temporary gap, documented in the proposal so it isn't mistaken for a miss.

## Risks / Trade-offs

- **Text says "Winscore", wordmark says "WC26".** → Documented as an explicit non-goal; a follow-up brand-mark change closes it. Acceptable interim state since the wordmark is a small nav/footer/hero glyph.
- **`ResolvedBranding.siteName` contract change.** Callers that assumed `siteName` reskins per competition now get a constant. → Audit `getActiveBranding` callers (layouts, nav, OG routes, email) and confirm none rely on the competition name *being* the site name; where they need the competition, read `shortName` explicitly.
- **Stale string assertions in tests.** Snapshot/string tests on "World Cup 2026 Pool" / "WC26 Pool" will fail. → Update them in the same change; run `pnpm test` as the gate.
- **Missed literal in one of four locales.** → Grep each `messages/*.json` for the old brand after editing; the "No residual product-brand literals" spec scenario is the check.
- **SEO churn.** Title/OG `siteName` change may briefly shuffle search snippets. → Low risk; canonical URL and domain are unchanged.

## Migration Plan

1. Add `PRODUCT_NAME` constant; update `getActiveBranding()` `siteName` (and `ogAlt` fallback). Leave `emailFromName` competition-scoped.
2. Update `app/layout.tsx` + `app/[locale]/layout.tsx` metadata literals, title templates, JSON-LD names, keywords.
3. Update `messages/{en,es,fr,de}.json` per the product-vs-tournament split.
4. Update `package.json` name.
5. Update docs (`README.md`, `docs/*.md`, `public/flags/README.md`).
6. Update failing test assertions; run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
7. **Rollback:** pure content/constant change with no DB or migration — revert the commit to restore the prior brand.

## Open Questions

- None blocking. The exact edition-subtitle wording ("Winscore — World Cup 2026" vs "Winscore: World Cup 2026") is a copy detail resolved during implementation; the spec only requires the competition appear as a subtitle, not the brand.
