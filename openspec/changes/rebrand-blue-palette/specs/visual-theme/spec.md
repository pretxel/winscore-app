## ADDED Requirements

### Requirement: Blue-led design token palette is the single source of site color

The system SHALL define a blue-led color palette as design tokens in `app/globals.css`, with a complete set for both the light (`:root`) and dark (`.dark`) themes. The `--primary` token SHALL be a blue anchored on `#135FD1` (expressed in oklch), and all derived tokens — `--ring`, `--sidebar-primary`, `--chart-1`, and the custom `--pitch` token — SHALL share that blue hue. No app surface SHALL introduce its own color literals for brand color; every surface SHALL inherit color through the Tailwind theme tokens mapped in `@theme inline`.

#### Scenario: Primary is blue in both themes
- **WHEN** `app/globals.css` is inspected
- **THEN** `:root` defines a blue `--primary` anchored on `#135FD1`
- **AND** `.dark` defines a blue `--primary` of the same hue family adjusted for dark surfaces

#### Scenario: No residual green pitch token
- **WHEN** the `--pitch`, `--ring`, and `--sidebar-primary` tokens are inspected in `:root` and `.dark`
- **THEN** each resolves to the blue brand hue, not the previous green

#### Scenario: Surfaces inherit color from tokens
- **WHEN** a component uses a theme class such as `bg-primary`, `text-primary`, or `ring`
- **THEN** it renders the blue brand color with no per-component color override

### Requirement: Palette maintains accessible contrast

The palette SHALL preserve WCAG 2.1 AA contrast in both themes: text-to-background pairings SHALL meet at least 4.5:1, and non-text UI tokens (`--border`, `--input`, focus `--ring`) SHALL meet at least 3:1 against their adjacent surface.

#### Scenario: Text on background meets AA
- **WHEN** `--foreground` on `--background` and `--primary-foreground` on `--primary` are measured in light and dark
- **THEN** each pairing meets at least a 4.5:1 contrast ratio

#### Scenario: Non-text tokens meet 3:1
- **WHEN** `--border` and `--input` are measured against the card/background surface in both themes
- **THEN** each meets at least a 3:1 contrast ratio
