## Why

The project uses ESLint 9 + Prettier 3 as separate tools, each with its own config, AST parsing, and plugin ecosystem. This dual-toolchain setup adds install size, configuration overhead, and runtime cost. Biome provides a single, fast Rust-based replacement for both linting and formatting with zero-config TypeScript/JSX/Tailwind support, dropping install size significantly and delivering sub-second lint times.

## What Changes

- Add `@biomejs/biome` as a dev dependency
- Replace ESLint + Prettier with Biome for both linting and formatting
- Remove `eslint`, `eslint-config-next`, `eslint-config-prettier`, `prettier`, `prettier-plugin-tailwindcss` from devDependencies
- Create `biome.json` with Biome's recommended ruleset plus project-specific overrides
- Update `package.json` scripts: `"lint": "biome check"`, `"format": "biome check --write"`, `"format:check": "biome check"`
- Keep `eslint` and `prettier` scripts as `biome` aliases for migration compatibility
- **BREAKING**: ESLint-specific inline disable comments (`eslint-disable`) must be replaced with Biome equivalents (`// biome-ignore`)

## Capabilities

### New Capabilities
- `biome-linting`: Unified linting and formatting via Biome with recommended rules, replacing ESLint + Prettier

### Modified Capabilities
- *None* — no spec-level behavior changes

## Impact

- **package.json**: Swap 5 devDependencies for 1, update 3 scripts
- **biome.json**: New config file (~30 lines)
- **Source files**: Replace `eslint-disable`/`prettier-ignore` comments with `biome-ignore` equivalents
- **CI/CD**: Any pipeline running `pnpm lint` or `pnpm format:check` continues working via updated scripts
- **Editor integration**: Developers switch from ESLint + Prettier VSCode extensions to Biome extension
