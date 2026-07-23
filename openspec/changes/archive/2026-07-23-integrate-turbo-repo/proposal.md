## Why

Every CI run and every Vercel deployment re-executes `lint`, `typecheck`, and `test` from scratch — even when source files haven't changed. Locally, `pnpm dev`, `pnpm build`, and pre-commit hooks all run sequentially with no caching. Turborepo eliminates this redundant work with file-level caching and parallel execution, cutting build times and reducing Vercel build minutes (which directly impacts the free-tier limit).

## What Changes

- Add `turbo` as a dev dependency and configure `turbo.json` with a pipeline that defines task dependencies, inputs, outputs, and cache behavior
- Add a `packageManager` field to `package.json` (required by Turborepo)
- Create a `.turbo/` entry in `.gitignore`
- Wire `turbo` into existing npm scripts so `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` benefit from caching
- Enable Vercel Remote Caching by adding the `TURBO_TOKEN` / `TURBO_TEAM` env vars (Vercel-hosted projects get this automatically)
- Update pre-commit hooks (if any `lint-staged` config exists) to remain compatible

## Capabilities

### New Capabilities
- `turbo-build-pipeline`: The Turborepo pipeline configuration (`turbo.json`) that defines how `lint`, `typecheck`, `test`, and `build` tasks relate to one another, what files they depend on, and how their outputs are cached — enabling fast incremental runs locally and full cache hits on Vercel deployments.

### Modified Capabilities
<!-- None — this is build-tooling only, no application behavior changes -->

## Impact

- **Code**: single new file `turbo.json`; one-line addition to `package.json` (`packageManager`); one entry in `.gitignore`
- **Dependencies**: adds `turbo` as a dev dependency
- **CI/CD**: Vercel builds automatically detect `turbo.json` and use Remote Caching; build time and build-minute consumption should decrease materially
- **Local DX**: cached `lint`, `typecheck`, and `test` runs finish in <1s on cache hits; full `pnpm build` reuses prior cache
- **Breaking**: none — all existing npm script names are preserved; Turborepo wraps them transparently
