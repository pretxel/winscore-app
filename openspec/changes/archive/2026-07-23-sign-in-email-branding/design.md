## Context

`lib/notifications/magic-link-email-template.ts` is a pure, dependency-free renderer for auth (sign-in) emails. Its `renderHeader()` emits a blue (`C.pitch`) band containing a hardcoded three-segment `WIN·SCORE·POOL` wordmark: a bold sans `WIN`, a cream pill reading `SCORE`, and a spaced mono `POOL`. The app itself has since standardized on the **Winscore** brand — `components/logotype.tsx` renders a blue "W" tile followed by `INSCORE` (= WINSCORE), and `PRODUCT_NAME = "Winscore"`. The email header is therefore off-brand.

The template is deliberately standalone: email clients can't resolve `oklch`, CSS variables, or SVG `var()`, so it uses table layout, inline styles, and fixed hex colors from `email-theme.ts` (`C`). `tests/magic-link-email-template.test.ts` currently asserts the presence of `>WIN<`, `>SCORE<`, `>POOL<`.

## Goals / Non-Goals

**Goals:**
- The sign-in email header renders the Winscore wordmark, mirroring the app `Logotype` (W tile + `INSCORE`).
- Stay email-safe: table/inline styles, fixed hex, no `var()`/`oklch`/SVG.
- Keep everything else (band color, body, CTA, labels, plain-text, escaping, localization) unchanged.

**Non-Goals:**
- No change to sibling transactional email templates (they share the stale wordmark; separate follow-up).
- No change to the plain-text part's copy structure (it carries no wordmark).
- No dynamic per-competition branding in the email (see Decisions).

## Decisions

**Render the Winscore wordmark as email-safe HTML mirroring `Logotype`.** On the blue header band, render a **cream "W" tile** (cream background, blue `W`) immediately followed by **`INSCORE`** in cream — the inverse of the on-screen logotype (whose tile is blue on a light page), so it stays legible on the blue band. Use a bordered/rounded `<span>` box for the tile (same idiom as the current `SCORE` pill) and a sans wordmark for `INSCORE`. Rationale: reproduces the WINSCORE reading with the primitives already proven in this file.
- Alternative — embed the SVG `Logotype`: rejected, it depends on `var()` tokens and SVG that many mail clients drop.
- Alternative — a hosted PNG logo: rejected, adds an asset/host dependency and image-blocking failure mode; the current design is intentionally text-only.

**Keep the wordmark static (not driven by `ResolvedBranding.siteName`).** The template takes no branding input and is unit-tested in isolation; the wordmark's split styling (`W` tile + `INSCORE`) is specific to "Winscore" and wouldn't generalize to an arbitrary `siteName`. This matches the file's existing philosophy (hardcoded palette + wordmark). Rationale: minimal, robust, no new plumbing.
- Alternative — thread `siteName` through the route handler and render it plainly: rejected as over-scoped for a wordmark fix and it would drop the distinctive tile treatment.

**Update the tests to assert the new wordmark.** Replace the `>WIN<`/`>SCORE<`/`>POOL<` assertions with the Winscore signature (the `W` tile and `>INSCORE<`), keeping the other assertions (hex color, CTA href, escaping) intact.

## Risks / Trade-offs

- [Cream-on-blue tile contrast/legibility in some clients] → Use the existing `C.pitch` / `C.pitchFg` pair already validated for this band; the `SCORE` pill uses the same inversion today.
- [Other emails still show the old wordmark, creating temporary inconsistency] → Explicitly documented as an out-of-scope follow-up in the proposal; this change knowingly fixes only the sign-in email as requested.
- [Snapshot/HTML assertions drift] → Update the template test in the same change so CI stays green.

## Migration Plan

Pure presentational change to one template. Steps: (1) update `renderHeader()`, (2) update the template test. No data or config migration. Rollback = revert the template edit; no downstream coupling.

## Open Questions

- Should the ~12 sibling templates be rebranded in a fast follow-up (shared wordmark helper) to avoid mixed branding across the email suite? Recommended, but out of scope here.
