## MODIFIED Requirements

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
