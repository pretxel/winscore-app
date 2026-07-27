## MODIFIED Requirements

### Requirement: Graceful handling when no knockout stage exists

When the competition's format declares at least one knockout stage but no knockout fixtures exist yet, the system SHALL render an informative empty state on the bracket page instead of an error or a 404. When the competition's format declares no knockout stage at all, the bracket page SHALL NOT exist for that competition and the system SHALL respond 404.

#### Scenario: Knockout format with no fixtures yet
- **WHEN** the competition's format includes a knockout stage
- **AND** no knockout fixtures have been created for it
- **THEN** `/<league>/bracket` renders an empty state and the request does not error

#### Scenario: League-only format has no bracket page
- **WHEN** the competition's format declares no knockout stage
- **THEN** `/<league>/bracket` responds 404
- **AND** no empty state is rendered

#### Scenario: Unresolvable competition still renders
- **WHEN** the competition cannot be resolved from the route
- **THEN** `/<league>/bracket` renders the empty state rather than responding 404

## ADDED Requirements

### Requirement: Bracket surface is gated by one shared format predicate

The bracket's navigation link and its route SHALL be gated by the same format predicate, so a competition never presents a Bracket tab that 404s, nor a reachable bracket route it does not advertise. That predicate SHALL be a single exported function derived from the competition format's stages, and both the section nav and the bracket route SHALL call it rather than re-deriving the condition inline.

#### Scenario: Knockout format exposes both surfaces
- **WHEN** the competition's format includes a knockout stage
- **THEN** the Bracket link is present in the section nav
- **AND** `/<league>/bracket` is reachable

#### Scenario: League-only format exposes neither surface
- **WHEN** the competition's format declares no knockout stage
- **THEN** the Bracket link is absent from the section nav
- **AND** `/<league>/bracket` responds 404
