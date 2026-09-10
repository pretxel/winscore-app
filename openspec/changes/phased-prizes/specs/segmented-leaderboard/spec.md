## MODIFIED Requirements

### Requirement: Leaderboard exposes overall, week, and stage segments via the URL

The `/leaderboard` page SHALL support a `segment` query parameter with the values `overall`, `week`, `stage`, and `phase`. The `overall` segment SHALL be the default and SHALL render the all-time ranking from `v_leaderboard_overall`, identical to the behavior when no `segment` parameter is present. The `week` segment SHALL render a ranking restricted to matches whose `kickoff_at` falls in the current week. The `stage` segment SHALL render a ranking restricted to a single tournament stage selected by a `stage` query parameter. The `phase` segment SHALL render a ranking restricted to a single phase of the active competition's default scheme, selected by a `phase` query parameter, and SHALL be offered only when the active competition has a default scheme. Each non-overall segment SHALL be sourced from a SQL function that aggregates the same score columns (`total_points`, `exact_hits`, `winner_gd_hits`, `winner_hits`, `rank`) with the same tie-breakers as `v_leaderboard_overall`, scoped to `active_competition_id()` and excluding admin accounts.

#### Scenario: Default visit renders overall
- **WHEN** a visitor opens `/leaderboard` with no query parameters
- **THEN** the page renders the all-time ranking from `v_leaderboard_overall`
- **AND** the overall segment is shown as active in the segment switcher

#### Scenario: Explicit overall segment matches the default
- **WHEN** a visitor opens `/leaderboard?segment=overall`
- **THEN** the page renders the same all-time ranking as the bare `/leaderboard` URL

#### Scenario: Week segment ranks only this week's matches
- **WHEN** a visitor opens `/leaderboard?segment=week`
- **THEN** the ranking reflects only scores for matches whose `kickoff_at` is within the current week
- **AND** rows use the same point, exact, winner+GD, wins, and rank columns as the overall board

#### Scenario: Stage segment ranks only the chosen stage
- **WHEN** a visitor opens `/leaderboard?segment=stage&stage=r16`
- **THEN** the ranking reflects only scores for matches whose `stage` is `r16`
- **AND** rows use the same columns and tie-breakers as the overall board

#### Scenario: Phase segment ranks only the chosen phase
- **WHEN** a visitor opens `/leaderboard?segment=phase&phase=<phase id>`
- **THEN** the ranking reflects only scores for matches whose `kickoff_at` falls inside that phase's window
- **AND** rows use the same columns and tie-breakers as the overall board

#### Scenario: Phase segment is hidden when the competition has no default scheme
- **WHEN** a visitor opens the leaderboard of a competition with no default scheme
- **THEN** the phase segment is absent from the segment switcher

#### Scenario: Segments exclude other competitions and admins
- **WHEN** any non-overall segment is rendered
- **THEN** the ranking includes only the active competition's matches
- **AND** admin accounts are absent and the remaining ranks are contiguous

## ADDED Requirements

### Requirement: The phase segment defaults to the current phase

When a visitor selects the `phase` segment without naming a phase, the page SHALL render the default scheme's currently active phase. When no phase is active, it SHALL render the most recently closed phase.

#### Scenario: Missing phase parameter falls back to the active phase
- **WHEN** a visitor opens `/leaderboard?segment=phase` with no `phase` parameter
- **THEN** the ranking for the currently active phase is rendered
- **AND** that phase is shown as selected

#### Scenario: Unknown phase falls back to overall
- **WHEN** a visitor opens `/leaderboard?segment=phase&phase=<unknown id>`
- **THEN** the page falls back to the overall ranking

#### Scenario: Between phases the last closed phase is shown
- **WHEN** a visitor selects the phase segment while no phase is active
- **THEN** the most recently closed phase's ranking is rendered
