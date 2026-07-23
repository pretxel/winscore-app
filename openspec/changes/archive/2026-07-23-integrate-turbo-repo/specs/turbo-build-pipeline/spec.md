## ADDED Requirements

### Requirement: Turborepo pipeline caches lint, typecheck, and test

The project SHALL include a `turbo.json` pipeline configuration that defines `lint`, `typecheck`, and `test` as cacheable tasks. Each task SHALL declare its file inputs so that Turborepo can skip execution when no relevant source files have changed.

#### Scenario: Cache hit on unchanged files
- **WHEN** `turbo run lint` (or `typecheck`, or `test`) is run and no input files have changed since the last run
- **THEN** Turborepo replays the cached output without re-executing the underlying tool

#### Scenario: Cache miss on changed files
- **WHEN** `turbo run lint` is run and source files have been modified
- **THEN** Turborepo executes biome and populates the cache with the new result

#### Scenario: Parallel execution of independent tasks
- **WHEN** `turbo run lint typecheck test` is run
- **THEN** lint, typecheck, and test execute in parallel (they have no inter-dependencies)

### Requirement: Build task depends on lint, typecheck, and test

The `build` task in `turbo.json` SHALL declare `lint`, `typecheck`, and `test` as dependencies so that a failing lint/typecheck/test blocks the build, and cached results of those tasks are reused.

#### Scenario: Build reuses cached checks
- **WHEN** `turbo run build` is run and prior `lint`, `typecheck`, and `test` runs are cached
- **THEN** the cached check results are replayed and `next build` proceeds only after all three pass

#### Scenario: Build blocked by failing check
- **WHEN** `turbo run build` is run and `typecheck` fails
- **THEN** `next build` is not executed and the failure is surfaced

### Requirement: Package manager is declared

The root `package.json` SHALL declare a `packageManager` field with the current pnpm version so that Turborepo and CI environments use a consistent package manager.

#### Scenario: Version declared
- **WHEN** Turborepo inspects `package.json`
- **THEN** it discovers `"packageManager": "pnpm@<version>"` and validates the running pnpm version

### Requirement: Local cache is gitignored

The `.gitignore` file SHALL exclude the `.turbo/` directory so that local Turborepo cache artifacts are not committed to version control.

#### Scenario: Cache directory excluded
- **WHEN** Turborepo writes cache artifacts to `.turbo/`
- **THEN** `git status` does not show the `.turbo/` directory as untracked or modified
