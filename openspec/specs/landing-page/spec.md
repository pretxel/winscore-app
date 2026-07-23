# landing-page Specification

## Purpose
The anonymous landing page explains what Winscore offers and drives visitors to sign up or browse. It describes the Groups and News features with promotional cards and localized copy.
## Requirements
### Requirement: Landing page explains the Groups and News features
The landing page (`/`) SHALL render a feature section that describes the Groups and News features, with one card per feature. Each card SHALL show a title, a one-line description, and a link to that feature's route. The Quiz card SHALL NOT appear in this section.

#### Scenario: Two feature cards present
- **WHEN** a visitor opens the landing page
- **THEN** the page renders a feature section containing exactly one card each for Groups and News
- **AND** the Quiz card is not rendered

#### Scenario: Each card links to its route
- **WHEN** a visitor opens the landing page
- **THEN** the Groups card links to `/groups` and the News card links to `/news`
- **AND** each link is locale-prefixed for the current locale (e.g. `/es/news` on the Spanish page)

#### Scenario: Groups link funnels signed-out visitors to sign-in
- **WHEN** a signed-out visitor follows the Groups card link
- **THEN** they are taken to the sign-in flow (the Groups route is behind authentication) rather than seeing an error page

### Requirement: Feature section copy is localized
All copy in the landing feature section SHALL be sourced from translation messages and provided for every supported locale, with no hard-coded display strings. Quiz-specific keys (`quizTitle`, `quizCopy`, `quizCta`) SHALL be removed from the `home` namespace.

#### Scenario: Localized rendering
- **WHEN** a visitor opens the landing page in `en`, `es`, `fr`, or `de`
- **THEN** the feature section's eyebrow, headline, and each card's title, description, and link label render in that locale

#### Scenario: Quiz keys removed
- **WHEN** the `home` message bundle is inspected
- **THEN** the keys `quizTitle`, `quizCopy`, and `quizCta` SHALL NOT exist in any locale

### Requirement: Feature section is additive to the existing landing page
Adding the feature section SHALL NOT remove or alter the existing Hero, scoring, cadence, or tournament-countdown sections, and SHALL NOT introduce new routes or server data fetching.

#### Scenario: Existing sections preserved
- **WHEN** a visitor opens the landing page after this change
- **THEN** the Hero, scoring tiers, cadence steps, and countdown still render as before
- **AND** the feature section appears in addition to them

#### Scenario: No backend dependency
- **WHEN** the landing page renders the feature section
- **THEN** it does so from static copy and links only, without querying the database or any external service

