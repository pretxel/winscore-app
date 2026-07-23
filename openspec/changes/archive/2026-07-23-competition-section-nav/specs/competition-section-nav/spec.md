## ADDED Requirements

### Requirement: Section nav renders on every competition page

Every page beneath a competition route (`/[locale]/[league]/…`) SHALL render a persistent competition section navigation, driven from `[league]/layout.tsx` so it appears without per-page wiring.

#### Scenario: Nav present on a section page
- **WHEN** a visitor opens any competition section page (e.g. `/en/liga-mx-apertura-2026/matches`)
- **THEN** the competition section nav is present in the page
- **AND** it is rendered above the section's own content

#### Scenario: Nav present on every section
- **WHEN** a visitor navigates between the competition's Matches, Standings, Leaderboard, Quiz, and Bracket sections
- **THEN** the same section nav is present on each of those pages

### Requirement: Section links target existing league-scoped routes

The nav SHALL expose the competition's sections as links, each targeting the corresponding league-scoped route under the current locale and league slug: Matches → `/<league>/matches`, Standings → `/<league>/standings`, Leaderboard → `/<league>/leaderboard`, Quiz → `/<league>/quiz`, Bracket → `/<league>/bracket`. Each link's visible text SHALL come from the i18n message catalog for the active locale.

#### Scenario: Links resolve to the current league and locale
- **WHEN** the section nav renders for locale `en` and league `liga-mx-apertura-2026`
- **THEN** the Leaderboard link points to `/en/liga-mx-apertura-2026/leaderboard`
- **AND** the Quiz link points to `/en/liga-mx-apertura-2026/quiz`

#### Scenario: Labels are localized
- **WHEN** the section nav renders for a non-default locale
- **THEN** each section label is the translated string for that locale (not a hardcoded English string or a raw message key)

### Requirement: Active section is highlighted

The nav SHALL indicate the section matching the current path as active, applying `aria-current="page"` to exactly that link. A section is active when the current pathname equals its href or begins with the href followed by `/`, so nested routes keep their parent section active.

#### Scenario: Current section marked active
- **WHEN** the visitor is on `/en/liga-mx-apertura-2026/leaderboard`
- **THEN** the Leaderboard link has `aria-current="page"`
- **AND** no other section link has `aria-current="page"`

#### Scenario: Nested route keeps parent active
- **WHEN** the visitor is on `/en/liga-mx-apertura-2026/matches/123`
- **THEN** the Matches link is marked active

### Requirement: Sections are gated by competition format

Matches, Leaderboard, and Quiz SHALL always appear. Standings SHALL appear only when the competition format has a group stage or a league table (`hasGroupStage(format)` or `leagueStageKey(format) !== null`). Bracket SHALL appear only when the competition format contains a knockout stage. When the competition or its format cannot be resolved, the nav SHALL fall back to showing only the always-on sections (Matches, Leaderboard, Quiz).

#### Scenario: Knockout format shows Bracket
- **WHEN** the competition format includes a knockout stage
- **THEN** the Bracket link is present in the nav

#### Scenario: Non-knockout format hides Bracket
- **WHEN** the competition format has no knockout stage
- **THEN** the Bracket link is absent from the nav

#### Scenario: Table format shows Standings
- **WHEN** the competition format has a group stage or a league table
- **THEN** the Standings link is present in the nav

#### Scenario: Format without a table hides Standings
- **WHEN** the competition format has neither a group stage nor a league table
- **THEN** the Standings link is absent from the nav

#### Scenario: Unresolvable format falls back to core sections
- **WHEN** the competition or its format cannot be resolved
- **THEN** only Matches, Leaderboard, and Quiz appear
- **AND** the page still renders without error

### Requirement: Nav is responsive and mobile-first

The section nav SHALL remain usable on small viewports without truncating or hiding sections — the section row SHALL be horizontally scrollable (or wrap) rather than clip when the labels exceed the viewport width.

#### Scenario: Narrow viewport keeps all sections reachable
- **WHEN** the nav renders on a narrow (mobile) viewport with more sections than fit on one line
- **THEN** every applicable section link remains reachable via horizontal scroll or wrapping
- **AND** no section link is visually clipped or removed solely due to width
