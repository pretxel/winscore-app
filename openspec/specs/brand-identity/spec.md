# brand-identity

## Purpose

Rules governing the WC26 brand mark: a single `Logotype` React component and the favicon set that derives from it. Defines where the logotype appears (nav, footer, hero, OG image), how it scales, and how Next.js 16's file-based metadata convention ships the favicon.
## Requirements
### Requirement: Logotype is a single React component with size variants

The system SHALL provide a single `Logotype` React component (server-renderable, no client state) that renders an inline SVG wordmark in three sizes — `xs`, `md`, `xl` — driven by props, not by separate components. The SVG SHALL use a single `viewBox` so all sizes share the exact same geometry.

#### Scenario: Renders in every size
- **WHEN** `<Logotype size="xs" />`, `<Logotype size="md" />`, and `<Logotype size="xl" />` are each rendered
- **THEN** the DOM contains exactly one `<svg>` element per call
- **AND** all three SVGs share the same `viewBox` attribute

#### Scenario: Compact variant drops the suffix
- **WHEN** `<Logotype size="xs" />` is rendered (which implies the compact form)
- **THEN** the rendered SVG does not include the `· Pool` suffix text

#### Scenario: Currency of theme color
- **WHEN** the surrounding element sets `text-foreground` (or any `text-…` Tailwind class)
- **THEN** the logotype's primary glyphs inherit that color via `currentColor`

### Requirement: Logotype is used everywhere the brand appears

The `Logotype` component SHALL replace the hand-rolled `26` tile + literal "WC26" / "Pool" strings in the global header, the global footer, and the home page hero. No file SHALL render the brand mark with inline `<span>` text after this change.

#### Scenario: Nav uses the component
- **WHEN** the global header (`SiteNav`) is rendered
- **THEN** the brand link renders `<Logotype size="xs" />` and contains no hand-rolled `<span>WC26</span>` or `<span>26</span>` markup

#### Scenario: Footer uses the component
- **WHEN** the global footer (`SiteFooter`) is rendered
- **THEN** the brand row renders `<Logotype size="xs" />` and contains no hand-rolled `<span>26</span>` tile

#### Scenario: Hero uses the component
- **WHEN** the home page hero is rendered
- **THEN** the hero includes a `<Logotype size="xl" />` accent next to the headline

### Requirement: Favicon set is Next 16 file-based

The system SHALL ship icons via Next.js 16's file-based metadata convention: `app/icon.svg`, `app/icon.png`, `app/apple-icon.png`, and `app/favicon.ico`. The manual `metadata.icons` block in `app/layout.tsx` SHALL be removed.

#### Scenario: Files exist in app/
- **WHEN** the repository is inspected after the change lands
- **THEN** `app/icon.svg`, `app/icon.png`, `app/apple-icon.png`, and `app/favicon.ico` all exist

#### Scenario: Manual icons block is gone
- **WHEN** `app/layout.tsx` is read
- **THEN** the `Metadata` export contains no `icons` field

#### Scenario: Rendered head includes the icon links
- **WHEN** the home page is fetched and its `<head>` inspected
- **THEN** the head includes a `<link rel="icon">` pointing at `/icon.svg` (or the rendered SVG path) and a `<link rel="apple-touch-icon">` pointing at the apple icon

### Requirement: OG image features the wordmark

The Open Graph image (`app/opengraph-image.tsx`) SHALL render the WC26 wordmark as its primary visual anchor, in the top-left, with a short headline below and a small year stamp in the bottom-right. The image dimensions remain 1200×630.

#### Scenario: Wordmark in the OG card
- **WHEN** the OG image is requested
- **THEN** the rendered 1200×630 PNG includes a visible "WC26" wordmark in the top-left region

### Requirement: Smoke test verifies Logotype renders an SVG

A unit test SHALL render `<Logotype />` at each of the three sizes and assert that an `<svg>` element appears in the output.

#### Scenario: Each size renders an svg
- **WHEN** the unit test renders `<Logotype size="xs" />`, `<Logotype size="md" />`, and `<Logotype size="xl" />`
- **THEN** each test case finds exactly one `<svg>` element

### Requirement: Branding resolves from the active competition

The product name SHALL be a fixed brand — **"Winscore"** — that is competition-independent. `getActiveBranding().siteName`, `applicationName`, the metadata title templates, and the JSON-LD `WebSite`/`Organization` names SHALL render "Winscore" regardless of which competition is active. The active competition's `short_name` (and `branding`) SHALL resolve only as an *edition* subtitle/label composed alongside the product name (e.g. in default titles and OG copy) and as inputs to competition-scoped surfaces (news query, OG alt text, stage labels) — never as the product name itself. The **email sender name** (`emailFromName`) SHALL remain competition-scoped (each competition sets its own in `branding.emailFromName`) and is explicitly NOT rebranded by this requirement. The visual brand mark (`Logotype` wordmark, favicon set, OG image) is unchanged by this requirement and is governed by its own requirements.

#### Scenario: Product name is fixed to Winscore

- **WHEN** `getActiveBranding()` is called for any active competition (or none)
- **THEN** the returned `siteName` is exactly "Winscore"
- **AND** `applicationName`, JSON-LD `WebSite.name`/`Organization.name`, and the title template suffix all render "Winscore"

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
- **THEN** none remain (competition `short_name` references and the deferred `WC26` wordmark glyph are exempt)

