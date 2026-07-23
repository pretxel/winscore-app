## Context

The app is a single-package Next.js project using pnpm, deployed on Vercel. It already has a `pnpm-workspace.yaml` (only for `ignoredBuiltDependencies`). The current build runs `lint` (biome), `typecheck` (tsc --noEmit), and `test` (vitest) sequentially — both locally and in CI. The pre-commit hook runs `lint` + `test`. Vercel runs `next build` which implicitly runs these checks before building, each starting from a cold state.

Turborepo v2 supports single-package repos without requiring a multi-package monorepo. It provides task caching, parallel execution, and Remote Caching (free tier on Vercel). Vercel automatically detects `turbo.json` and injects the `TURBO_TOKEN` / `TURBO_TEAM` environment variables.

## Goals / Non-Goals

**Goals:**
- Every `lint`, `typecheck`, and `test` run is cached — repeated runs on unchanged source finish in <1s
- `pnpm build` (and by extension Vercel deployments) reuses cached task results instead of re-running from scratch
- The pre-commit hook remains fast with cache hits
- Remote Caching shares the cache between CI and local development on Vercel

**Non-Goals:**
- Converting to a full monorepo with multiple packages
- Changing the names or behavior of existing npm scripts (they stay as `pnpm lint`, `pnpm typecheck`, etc.)
- Moving from pnpm to another package manager
- Changing the Vercel deployment pipeline logic (only adding caching)

## Decisions

**Add `turbo` as dev dependency and configure single-package pipeline.** Create a `turbo.json` that defines a pipeline with `lint`, `typecheck`, `test`, and `build` tasks. `build` depends on `lint`, `typecheck`, and `test` so they run in parallel first. Each task declares `inputs` (source files it depends on) and `outputs` (for cache artifacts). Rationale: this is the minimal, idiomatic Turborepo setup; no need for `pnpm-workspace.yaml` changes.

**Pin `packageManager` in package.json.** Turborepo v2 requires `"packageManager": "pnpm@<version>"` in `package.json`. Rationale: required by the spec; ensures consistent package manager version across environments.

**Use `//#` root task syntax for single-package projects.** The pipeline tasks reference the root package as `//#lint`, `//#typecheck`, etc. Rationale: Turborepo v2 uses this convention for single-package repos; avoids the confusion of `^lint` topo dependencies meant for multi-package setups.

**No `dev` task in the pipeline.** The `dev` script (`next dev`) is long-running and not cacheable; leaving it outside `turbo.json` means `pnpm dev` works as before. Rationale: Turborepo isn't designed for persistent development servers.

**Vercel Remote Caching enabled implicitly.** Vercel detects `turbo.json` and automatically provides `TURBO_TOKEN` / `TURBO_TEAM` to deployed projects. No manual config needed on the Vercel side. Local developers can optionally run `npx turbo login` and `npx turbo link` to share the remote cache. Rationale: zero-config benefit for the primary deployment target; local remote caching is opt-in.

**`.turbo` added to `.gitignore`.** The local Turborepo cache directory must not be committed.

## Risks / Trade-offs

- [Cache invalidation depends on correct `inputs` globs] → If input globs are too narrow, stale caches can mask regressions. Mitigation: inputs mirror the actual files each tool scans (`**/*.ts`, `**/*.tsx`, config files). If a regression slips through, `npx turbo run lint --force` bypasses the cache.
- [Turborepo adds ~5MB to `node_modules`] → Negligible for a full Next.js app already pulling hundreds of MB.
- [Build may fail if `turbo` is missing during Vercel deploy] → Mitigation: `turbo` is a dev dependency; Vercel runs `pnpm install` (or respects `pnpm-lock.yaml`) which installs dev dependencies during build.

## Migration Plan

Additive. Add `turbo.json`, update `package.json`, update `.gitignore`. No existing files are removed or renamed. Rollback = remove `turbo.json`, revert `package.json` change, re-run `pnpm install`. All scripts still work if `turbo` is temporarily uninstalled (they fall through to direct execution).

## Open Questions

- Should we also add a `turbo run lint typecheck test` pre-commit check in CI to get a combined pass/fail? (Can be a follow-up after validating the pipeline.)
