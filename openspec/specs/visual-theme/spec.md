# visual-theme

## Purpose

Design-token and accessibility requirements for the blue-led Winscore visual theme.

## Requirements

### Requirement: Blue-led design token palette is the single source of site color

The system SHALL define a blue-led color palette in `app/globals.css` for light and dark themes. `--primary`, `--ring`, `--sidebar-primary`, `--chart-1`, and `--pitch` SHALL share the blue hue anchored on `#135FD1`, with surfaces inheriting Tailwind theme tokens.

#### Scenario: Primary is blue in both themes
- **WHEN** `app/globals.css` is inspected
- **THEN** both themes define a blue `--primary` anchored on `#135FD1`

#### Scenario: No residual green pitch token
- **WHEN** the blue tokens are inspected
- **THEN** they resolve to the blue brand hue, not green

### Requirement: Palette maintains accessible contrast

The palette SHALL preserve WCAG 2.1 AA contrast: text pairings at least 4.5:1 and non-text UI tokens at least 3:1 against adjacent surfaces.

#### Scenario: Contrast meets AA
- **WHEN** theme token pairings are measured
- **THEN** text meets 4.5:1 and non-text tokens meet 3:1
