## ADDED Requirements

### Requirement: Project uses Biome for linting and formatting

The project SHALL use `@biomejs/biome` as the single tool for both linting and formatting, replacing ESLint and Prettier. The `pnpm lint` script SHALL run `biome check`, `pnpm format:check` SHALL run `biome check`, and `pnpm format` SHALL run `biome check --write`.

#### Scenario: Lint catches TypeScript errors
- **WHEN** a developer runs `pnpm lint`
- **THEN** Biome checks all source files against the configured ruleset
- **AND** reports errors and warnings with file locations

#### Scenario: Format auto-fixes on write
- **WHEN** a developer runs `pnpm format`
- **THEN** Biome writes safe fixes for formatting and auto-fixable lint rules
- **AND** the working tree is clean of formatting issues

### Requirement: Biome uses recommended ruleset with Tailwind sorting

The `biome.json` configuration SHALL extend Biome's `recommended` preset and SHALL enable built-in Tailwind class sorting via `assistiveActions.source.useSortedClasses`.

#### Scenario: Tailwind classes are sorted
- **WHEN** a file contains Tailwind classes in non-standard order
- **THEN** `biome check --write` reorders them to the canonical order
- **AND** the reordering does not break any styles

### Requirement: Inline disable comments use Biome syntax

All source files SHALL use `// biome-ignore` syntax for inline disable comments, replacing any legacy `eslint-disable` or `prettier-ignore` comments.

#### Scenario: ESLint disable is replaced
- **WHEN** a file previously contained `// eslint-disable-next-line`
- **THEN** it is replaced with the equivalent `// biome-ignore` directive with a reason
