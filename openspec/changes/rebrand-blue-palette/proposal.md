## Why

The product ships an inconsistent brand: the site runs a green "Tournament Press" design-token palette (`app/globals.css`), the `Logotype` W-tile uses green `--pitch` despite its own comment describing a blue mark, and the transactional email templates hard-code a drifted mix of cream/gold plus a stray blue (`#135FD1`) — so the same product looks like three different brands across web, logo, and inbox. We are moving Winscore to a single blue-led identity; every surface should read as one brand.

## What Changes

- Replace the site color palette with a new blue-led token set in `app/globals.css` — `--primary` anchored on the existing email blue `#135FD1`, with a full, accessible light **and** dark token set derived from it (primary, ring, sidebar, chart, pitch/flag/live custom tokens).
- Swap in the new blue **logo asset** (provided in-repo) as the single brand mark: drive the `Logotype` component and the Next.js file-based favicon set (`app/icon.svg`, `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`) and OG image from it.
- **BREAKING** (visual): every surface using theme tokens re-skins from green to blue. No API/behavior change, but the entire UI changes color.
- Remove the footer host-nations tagline "USA · Canada · Mexico" from the site footer (`components/site-nav.tsx`) and delete the now-unused `footer.hosts` i18n keys in all locales.
- Retheme **all** transactional email templates (`lib/notifications/*-template.ts`) onto the new blue brand: introduce a single shared source of email brand colors and replace the per-file hard-coded hex so every email matches the site.

## Capabilities

### New Capabilities
- `visual-theme`: The blue-led design-token palette (light + dark) that is the single source of truth for site color, applied across all app surfaces via Tailwind theme tokens.
- `email-branding`: A shared set of brand colors/branding applied consistently across every transactional email template, sourced from one place rather than duplicated hex per file.

### Modified Capabilities
- `brand-identity`: The brand mark becomes the new blue logo asset (logotype glyph, favicon set, OG image all derive from it), and the site footer no longer renders the host-nations tagline.

## Impact

- **Styling / tokens**: `app/globals.css` (`:root` and `.dark` token blocks) — full palette rewrite.
- **Brand mark**: `components/logotype.tsx`; `app/icon.svg`, `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`; `app/opengraph-image.*`. Requires the new logo asset (path in repo).
- **Footer**: `components/site-nav.tsx` (remove `hosts` span); `messages/en.json`, `messages/de.json`, `messages/fr.json` (+ `es` if present) — remove `footer.hosts`.
- **Email**: all `lib/notifications/*-template.ts` files (currently hard-coding `#FAF9F4`, `#E7B53C`, `#135FD1`, etc.); new shared email-color module.
- **Tests**: brand/logotype, magic-link/email-template, footer, and i18n tests may reference old colors/host text and will need updating.
- No database, API contract, or dependency changes.
