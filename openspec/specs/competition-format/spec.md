# competition-format Specification

## Purpose
TBD - created by archiving change support-multiple-competitions. Update Purpose after archive.
## Requirements
### Requirement: Per-competition format configuration

Each competition SHALL define its format in a `format_config` JSONB value containing an ordered `stages` array (each stage with `key`, `kind` of `group|knockout|league`, `order`, per-locale `labels`, `icon`, `hasGroupCode`, `revealed`, and optional `pointMultiplier`) and a `groups` object (`enabled`, and when enabled `pattern` and `count`).

#### Scenario: Group-and-knockout format (World Cup / Euro / Libertadores)

- **WHEN** a competition defines group stages plus knockout rounds with `groups.enabled = true` and a group `pattern`
- **THEN** matches in group stages accept a matching `group_code` and knockout matches accept a NULL `group_code`

#### Scenario: Single league-phase format (Champions League / Liga MX / La Liga)

- **WHEN** a competition defines a single stage `{ key: 'league' | 'regular', kind: 'league', hasGroupCode: false }` with `groups.enabled = false`
- **THEN** its matches are accepted with `group_code` NULL and no group stage is required

#### Scenario: League + knockout format (Liga MX)

- **WHEN** a competition defines a league stage followed by knockout stages with `groups.enabled = false`
- **THEN** league-stage matches have `group_code = NULL`
- **AND** knockout-stage matches have `group_code = NULL`
- **AND** knockout stage `key` values are validated against `format_config.stages`

### Requirement: Format config is validated on write

The system SHALL reject a `competitions` row whose `format_config` is malformed — an empty `stages` array, duplicate stage keys, an invalid `groups` object, or a `pointMultiplier` that is not a positive number SHALL fail at write time via a validation trigger on `competitions`.

#### Scenario: Malformed format rejected

- **WHEN** a competition is written with a `format_config` that has duplicate stage keys, an empty `stages` array, or a zero/negative `pointMultiplier`
- **THEN** the database rejects the write

#### Scenario: Point multiplier accepted

- **WHEN** a competition is written with `format_config` stages that include valid positive `pointMultiplier` values
- **THEN** the write succeeds

### Requirement: Match stage and group code validated against the competition

The system SHALL validate every `matches` insert/update with a `BEFORE INSERT/UPDATE` trigger that checks `stage` against the match's competition `format_config.stages[].key`, and `group_code` against the competition's group `pattern` (requiring NULL when the stage is non-group or groups are disabled). The legacy `stage` and `group_code` CHECK constraints SHALL be removed in favor of this trigger.

#### Scenario: Valid World Cup stage accepted

- **WHEN** a match for `world-cup-2026` is written with `stage = 'r16'` and `group_code = NULL`
- **THEN** the write succeeds

#### Scenario: Unknown stage rejected

- **WHEN** a match is written with a `stage` not present in its competition's `format_config.stages`
- **THEN** the trigger rejects the write

#### Scenario: Group code violating the competition pattern rejected

- **WHEN** a group-stage match is written with a `group_code` that does not match the competition's group `pattern`
- **THEN** the trigger rejects the write

#### Scenario: Existing data passes after CHECK removal

- **WHEN** the validation trigger is installed and the legacy CHECKs are dropped
- **THEN** every pre-existing `matches` row still validates against its competition's format

