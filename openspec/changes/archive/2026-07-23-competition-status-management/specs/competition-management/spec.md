## MODIFIED Requirements

### Requirement: Competitions registry

The system SHALL store competitions in a `public.competitions` table, each with a unique `slug`, display `name`/`short_name`, `season`, `tournament_start_at`, opening-fixture fallback fields, `format_config` (JSONB), `providers` (JSONB), `branding` (JSONB), and a `status` text column constrained to `active`, `manage`, or `finished` with a default of `manage`.

#### Scenario: World Cup 2026 seeded as a competition

- **WHEN** the migrations and seed run
- **THEN** a `competitions` row with `slug = 'world-cup-2026'` exists
- **AND** its `format_config` encodes the legacy stages (`group,r32,r16,qf,sf,third,final`) and group pattern `^[A-L]$`

#### Scenario: Adding a competition requires no code change

- **WHEN** an operator inserts a new `competitions` row with a valid `format_config`
- **THEN** the insert succeeds without any application code or DDL change

### Requirement: Admin form exposes status selector

The admin competition form SHALL render a status selector with three options: `active`, `manage`, and `finished`. Changing the status SHALL update the competition's `status` column. The selector SHALL replace the previous `is_live` toggle.

#### Scenario: Admin sets competition to active
- **WHEN** an admin selects `active` from the status dropdown and saves
- **THEN** the competition's `status` is set to `active`
- **AND** the competition appears in the public catalog

#### Scenario: Admin sets competition to manage
- **WHEN** an admin selects `manage` from the status dropdown and saves
- **THEN** the competition's `status` is set to `manage`
- **AND** the competition is hidden from the public catalog

#### Scenario: Admin sets competition to finished
- **WHEN** an admin selects `finished` from the status dropdown and saves
- **THEN** the competition's `status` is set to `finished`
- **AND** the competition appears in the catalog with a "Finished" tag
