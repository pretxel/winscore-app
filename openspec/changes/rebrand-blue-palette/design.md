## Context

Winscore currently reads as three brands: the app runs a green "Tournament Press" oklch token set in `app/globals.css`, the `Logotype` W-tile is filled from `var(--pitch)` (green) despite an in-code comment describing a blue tile, and every email in `lib/notifications/*-template.ts` hard-codes its own hex (cream `#FAF9F4`, gold `#E7B53C`, and a one-off blue `#135FD1`). There is no shared source for either web or email color, so drift is structural, not accidental.

Decisions already pinned with the user:
- New identity is **blue-led**, `--primary` anchored on the existing email blue `#135FD1`.
- The logo is a **new blue asset** provided in-repo; the favicon set and OG image derive from it.
- The footer host-nations tagline "USA · Canada · Mexico" is removed.
- All email templates are re-themed onto the new blue brand.

Constraints: this Next.js has breaking changes vs. common training data — read `node_modules/next/dist/docs/` before touching metadata/OG/favicon conventions. Tailwind v4 CSS-first theme via `@theme inline` in `app/globals.css`; shadcn tokens must all resolve. Email clients strip `<style>`/CSS variables inconsistently, so email color must be inlined literal hex, not `var(--…)`.

## Goals / Non-Goals

**Goals:**
- One blue palette in `app/globals.css` (light + dark) that every app surface inherits through existing Tailwind tokens — zero per-component color edits needed for the re-skin.
- One shared email-color module that every `*-template.ts` imports; no more per-file literal palettes.
- New blue logo asset as the single brand mark feeding logotype, favicons, and OG.
- Footer host tagline gone, in markup and in every locale's i18n.
- WCAG AA maintained (text ≥ 4.5:1, non-text/UI ≥ 3:1) in both themes — the existing tokens already carry contrast-tuning comments; preserve that discipline.

**Non-Goals:**
- No layout, spacing, typography, or component-structure changes — color and brand mark only.
- No change to `emailFromName` / competition-scoped branding (explicitly out of scope per `brand-identity` spec).
- No new product name; "Winscore" and `winscore.me` are unchanged.
- No behavioral/API/DB changes.

## Decisions

- **Palette lives only in `app/globals.css` `:root` + `.dark`.** Re-skinning by editing the ~40 token declarations (not touching `@theme inline` mapping) means every `bg-primary`, `text-primary`, `ring`, `sidebar-*`, `chart-*`, and the custom `--pitch`/`--flag`/`--live` tokens flip to blue at once. Alternative — search-and-replace color classes across components — rejected: fragile, misses dynamic classes, and fights the token system that already exists.
- **Anchor `--primary` on `#135FD1`, express all tokens in oklch.** `#135FD1` ≈ `oklch(0.53 0.18 262)`. Derive light/dark primaries, ring, sidebar-primary, and `--pitch` from the same hue (~262). Keep the gold accent family for `--flag`/`--accent` (it complements blue and preserves the corner-flag motif), and keep destructive/live in the red family. Alternative — recolor accent to blue too — rejected: a mono-blue UI loses the accent affordance and flattens hierarchy.
- **`--pitch` becomes blue.** Because `Logotype` fills its W-tile from `var(--pitch)`, moving that token to blue makes the on-screen logotype match the new mark for free; the new asset supplies the favicon/OG raster.
- **New email-color module** at `lib/notifications/email-theme.ts` exporting named literal-hex constants (e.g. `BRAND_BLUE`, `BG`, `SURFACE`, `TEXT`, `MUTED`, `ACCENT`). Each template imports and interpolates these into its inline styles. Alternative — a shared HTML shell/layout function — is a larger refactor than "new branding and colors" asks for; a color module gets consistency without restructuring template bodies. Leave that shell refactor as a follow-up.
- **Footer removal is total.** Delete the `<span>{t("hosts")}</span>` in `components/site-nav.tsx` and the `footer.hosts` key in `messages/{en,de,fr,es}.json` so no dead i18n key lingers.

## Risks / Trade-offs

- [New blue vs. existing green may fail AA at some token pairings] → Run the same contrast discipline the current tokens document; verify primary-on-background, muted-foreground, border (≥3:1 non-text), and `--live`/destructive in both themes before finalizing values.
- [Snapshot / literal-color tests reference old green or `#135FD1`/host text] → Expect and update `brand`/logotype, email-template, footer, and i18n tests; treat failures as intended, not regressions.
- [Email hex must stay inlined — importing a shared module could tempt someone to use CSS vars] → Module exports plain strings only; templates keep inlining literals into `style="…"`.
- [OG PNG (`app/opengraph-image.png`, ~768KB) and favicons are committed rasters] → Regenerating them from the new asset is a build/asset step; if the asset isn't final, the raster derivatives block completion.

## Migration Plan

1. Land the new logo asset in-repo (path provided by user) — prerequisite for logotype/favicon/OG steps.
2. Rewrite `:root` + `.dark` tokens in `app/globals.css`; visually verify light/dark across nav, cards, buttons, charts, sidebar.
3. Update logotype tile color path (via `--pitch`) and regenerate favicon set + OG image from the new asset.
4. Remove footer `hosts` span + i18n keys.
5. Add `lib/notifications/email-theme.ts`; migrate each `*-template.ts` off literal hex onto the shared constants.
6. Update affected tests; run the full suite and the email-preview admin view.

Rollback: single revert of the change branch restores the green palette and host tagline; no data or schema migration is involved, so rollback is purely code.

## Open Questions

- Exact path/format of the new logo asset (SVG preferred so favicon/OG can be regenerated cleanly) — to be supplied before `/opsx:apply` reaches the logotype/favicon step.
- Whether a Spanish locale (`messages/es.json`) exists with a `footer.hosts` key to remove — confirm during implementation.
