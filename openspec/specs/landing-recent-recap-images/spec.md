# landing-recent-recap-images Specification

## Purpose
TBD - created by archiving change landing-recent-recap-images. Update Purpose after archive.
## Requirements
### Requirement: Hidden when empty

When no active completed recap renders exist, the landing page SHALL render no gallery
section (no heading, no empty placeholder) and the rest of the page SHALL be unaffected.

#### Scenario: No comics yet

- **WHEN** the landing page loads and no match has an active completed render
- **THEN** the gallery section is absent and the page renders normally
