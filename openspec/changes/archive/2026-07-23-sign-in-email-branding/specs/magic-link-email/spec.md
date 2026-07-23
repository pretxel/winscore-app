## MODIFIED Requirements

### Requirement: Branded, email-safe template matching the app

The magic-link email SHALL be rendered with the app's visual language — pitch-green header band, cream body, the **Winscore** wordmark (a "W" tile followed by `INSCORE`, mirroring the app logotype), and mono uppercase labels — consistent with the existing result-standing email. The renderer SHALL be a pure, dependency-free function returning subject, HTML, and plain-text parts.

#### Scenario: Branded HTML is produced
- **WHEN** the magic-link email is rendered
- **THEN** the HTML uses a table layout with inline styles and fixed hex colors (no `oklch`, CSS variables, or external stylesheets)
- **AND** it includes the Winscore wordmark header and a primary call-to-action button linking to the verification URL

#### Scenario: Plain-text alternative is included
- **WHEN** the magic-link email is sent
- **THEN** a plain-text part mirroring the link and key copy is included for non-HTML clients

#### Scenario: User-provided content is escaped
- **WHEN** the template renders any value derived from user or request data
- **THEN** the value is HTML-escaped in the HTML part
