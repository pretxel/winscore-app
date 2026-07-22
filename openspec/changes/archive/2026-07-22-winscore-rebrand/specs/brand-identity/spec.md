## MODIFIED Requirements

### Requirement: Logotype is a single React component with size variants

The system SHALL provide a single `Logotype` React component (server-renderable, no client state) that renders an inline SVG wordmark in three sizes — `xs`, `md`, `xl` — driven by props, not by separate components. The SVG SHALL use a single `viewBox` so all sizes share the exact same geometry. The wordmark SHALL reflect the winscore.me brand identity.

#### Scenario: Renders in every size
- **WHEN** `<Logotype size="xs" />`, `<Logotype size="md" />`, and `<Logotype size="xl" />` are each rendered
- **THEN** the DOM contains exactly one `<svg>` element per call
- **AND** all three SVGs share the same `viewBox` attribute

#### Scenario: Compact variant drops the suffix
- **WHEN** `<Logotype size="xs" />` is rendered (which implies the compact form)
- **THEN** the rendered SVG does not include the suffix text

#### Scenario: Currency of theme color
- **WHEN** the surrounding element sets `text-foreground` (or any `text-…` Tailwind class)
- **THEN** the logotype's primary glyphs inherit that color via `currentColor`

#### Scenario: Brand mark reflects winscore.me identity
- **WHEN** the Logotype is rendered at any size
- **THEN** the SVG glyphs reflect the winscore.me brand mark (no longer a "WC26" wordmark)
- **AND** the `edition` prop is preserved for per-competition subtitle rendering

### Requirement: Favicon set is Next 16 file-based

The system SHALL ship icons via Next.js 16's file-based metadata convention: `app/icon.svg`, `app/icon.png`, `app/apple-icon.png`, and `app/favicon.ico`. The icons SHALL reflect the winscore.me brand. The manual `metadata.icons` block in `app/layout.tsx` SHALL NOT exist.

#### Scenario: Files exist in app/
- **WHEN** the repository is inspected after the change lands
- **THEN** `app/icon.svg`, `app/icon.png`, `app/apple-icon.png`, and `app/favicon.ico` all exist
- **AND** each file reflects the winscore.me brand mark

#### Scenario: Manual icons block is absent
- **WHEN** `app/layout.tsx` is read
- **THEN** the `Metadata` export contains no `icons` field

#### Scenario: Rendered head includes the icon links
- **WHEN** the home page is fetched and its `<head>` inspected
- **THEN** the head includes a `<link rel="icon">` pointing at `/icon.svg` (or the rendered SVG path) and a `<link rel="apple-touch-icon">` pointing at the apple icon

### Requirement: OG image features the wordmark

The Open Graph image (`app/opengraph-image.tsx`) SHALL render the winscore.me wordmark as its primary visual anchor, in the top-left, with a short headline below and a small year stamp in the bottom-right. The image dimensions remain 1200×630.

#### Scenario: Wordmark in the OG card
- **WHEN** the OG image is requested
- **THEN** the rendered 1200×630 PNG includes a visible winscore.me brand wordmark in the top-left region

### Requirement: Branding resolves from the active competition

The product name SHALL be a fixed brand — **"Winscore"** — that is competition-independent. `getActiveBranding().siteName`, `applicationName`, the metadata title templates, `metadataBase` (canonical URL), and the JSON-LD `WebSite`/`Organization` names SHALL render "Winscore" and resolve to `https://winscore.me` regardless of which competition is active. The active competition's `short_name` (and `branding`) SHALL resolve only as an *edition* subtitle/label composed alongside the product name (e.g. in default titles and OG copy) and as inputs to competition-scoped surfaces (news query, OG alt text, stage labels) — never as the product name itself. The **email sender name** (`emailFromName`) SHALL remain competition-scoped (each competition sets its own in `branding.emailFromName`) and is explicitly NOT rebranded by this requirement. The visual brand mark (`Logotype` wordmark, favicon set, OG image) SHALL reflect the winscore.me brand identity.

#### Scenario: Product name is fixed to Winscore

- **WHEN** `getActiveBranding()` is called for any active competition (or none)
- **THEN** the returned `siteName` is exactly "Winscore"
- **AND** `applicationName`, JSON-LD `WebSite.name`/`Organization.name`, and the title template suffix all render "Winscore"

#### Scenario: Canonical domain resolves to winscore.me

- **WHEN** `env.siteUrl` is resolved
- **THEN** it returns `https://winscore.me` in production (or the configured `NEXT_PUBLIC_SITE_URL` if set)
- **AND** `metadataBase`, JSON-LD URLs, sitemap entries, and email links all use `https://winscore.me`

#### Scenario: Competition resolves as an edition, not the brand

- **WHEN** the active competition is `world-cup-2026`
- **THEN** the product name renders "Winscore"
- **AND** the competition `short_name` ("World Cup 2026") appears as an edition subtitle in the default title and OG copy, not as the site name

#### Scenario: Product name does not reskin on competition switch

- **WHEN** an admin switches the active competition to one with different `branding`
- **THEN** `siteName`, `applicationName`, and the title-template suffix still render "Winscore"
- **AND** the edition subtitle, OG alt text, news query, and email sender name reflect the new competition after revalidation

#### Scenario: No residual hardcoded product-brand literals

- **WHEN** the codebase is checked for hardcoded `World Cup 2026 Pool` / `WC26 Pool` product-name literals in `app/`, `components/`, `lib/`, and `messages/`
- **THEN** none remain (competition `short_name` references and the brand wordmark glyphs are exempt)

#### Scenario: Webmanifest reflects Winscore brand

- **WHEN** `public/site.webmanifest` is read
- **THEN** `name` is "Winscore" and `short_name` is "Winscore"
- **AND** no reference to "World Cup 2026 Pool" or "WC26 Pool" remains
