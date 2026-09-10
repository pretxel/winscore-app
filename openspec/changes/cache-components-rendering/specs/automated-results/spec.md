## ADDED Requirements

### Requirement: A completed sync invalidates the caches its writes affect

After each league pass, the sync SHALL invalidate the cache tag for every match it finalised, flipped to live, or whose kickoff it reconciled, and SHALL invalidate the league's tag once per pass in which it wrote anything. Invalidation SHALL happen after the writes commit and SHALL NOT be counted as a sync error if it fails; a failure SHALL be logged.

#### Scenario: A finalised match invalidates its own tag and the league's
- **WHEN** a pass writes a final score for a match in a league
- **THEN** `match:<id>` and `league:<slug>` are invalidated once the pass completes

#### Scenario: A rescheduled fixture invalidates its tag
- **WHEN** a pass corrects a match's kickoff to the provider's schedule
- **THEN** `match:<id>` and `league:<slug>` are invalidated

#### Scenario: A pass that wrote nothing invalidates nothing
- **WHEN** a pass matches every remote row but issues no UPDATE
- **THEN** no tag is invalidated

#### Scenario: An invalidation failure does not fail the sync
- **WHEN** invalidation throws after the writes committed
- **THEN** the run's summary is unchanged and the failure is logged
