# email-branding

## Purpose

Rules for consistent blue Winscore branding in transactional email templates.

## Requirements

### Requirement: Email brand colors come from a single shared source

The system SHALL define email brand colors in one shared module (`lib/notifications/email-theme.ts`) exporting named literal-hex constants for the blue brand. Every transactional email template under `lib/notifications/*-template.ts` SHALL import its brand colors from this module. No email template SHALL declare its own one-off brand hex.

#### Scenario: Shared module exists and is used
- **WHEN** the notification templates are inspected
- **THEN** `lib/notifications/email-theme.ts` exports the brand color constants and each template imports them

### Requirement: Emails render the blue brand

Every transactional email SHALL present the new blue brand with literal hex colors in inline styles.

#### Scenario: Primary email elements are blue
- **WHEN** any transactional email is rendered
- **THEN** its brand elements use the blue brand color as inline literal hex
