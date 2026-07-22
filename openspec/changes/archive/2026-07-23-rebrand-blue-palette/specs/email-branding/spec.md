## ADDED Requirements

### Requirement: Email brand colors come from a single shared source

The system SHALL define email brand colors in one shared module (`lib/notifications/email-theme.ts`) exporting named literal-hex constants for the blue brand (e.g. brand blue, background, surface, primary text, muted text, accent). Every transactional email template under `lib/notifications/*-template.ts` SHALL import its brand colors from this module. No email template SHALL declare its own one-off brand hex.

#### Scenario: Shared module exists and is used
- **WHEN** the notification templates are inspected
- **THEN** `lib/notifications/email-theme.ts` exports the brand color constants
- **AND** each `*-template.ts` imports its brand colors from that module rather than declaring literal brand hex inline

#### Scenario: No drifted per-template palette remains
- **WHEN** the email template files are searched for hard-coded brand hex such as `#135FD1` (blue) or `#E7B53C` (gold) outside the shared module
- **THEN** no template defines those brand colors independently of `email-theme.ts`

### Requirement: Emails render the blue brand

Every transactional email SHALL present the new blue brand: its primary/brand-colored elements (headings, primary buttons, brand accents) SHALL use the blue brand color, consistent with the site palette. Because email clients do not reliably support CSS variables, brand colors SHALL be inlined as literal hex values in element `style` attributes.

#### Scenario: Primary email elements are blue
- **WHEN** any transactional email (e.g. magic-link, welcome, results digest, winners) is rendered
- **THEN** its brand/primary elements use the blue brand color
- **AND** those colors are present as inline literal hex, not CSS variable references
