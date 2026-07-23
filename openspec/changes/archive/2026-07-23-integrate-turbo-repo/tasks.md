## 1. Dependency and configuration

- [x] 1.1 Add `turbo` as a dev dependency (`pnpm add -D turbo`)
- [x] 1.2 Add `"packageManager": "pnpm@<version>"` to `package.json` (use current pnpm version)
- [x] 1.3 Add `.turbo` to `.gitignore`

## 2. Build pipeline

- [x] 2.1 Create `turbo.json` with pipeline: `lint`, `typecheck`, and `test` as parallel cacheable tasks with correct input globs (`**/*.ts`, `**/*.tsx`, `**/*.json`, config files)
- [x] 2.2 Define `build` task depending on `lint`, `typecheck`, and `test` with `.next/**` and `!.next/cache/**` as outputs
- [x] 2.3 Exclude `dev` and `start` from the pipeline (long-running, not cacheable)

## 3. Script integration

- [x] 3.1 Verify `turbo run lint` passes with a cache hit on the second run
- [x] 3.2 Verify `turbo run typecheck` passes with a cache hit on the second run
- [x] 3.3 Verify `turbo run test` passes with a cache hit on the second run
- [x] 3.4 Verify `turbo run build` passes, reusing cached lint/typecheck/test results
- [x] 3.5 Verify pre-commit hook still works (lint + test pass with turbo wrapping)

## 4. Verify

- [x] 4.1 Run `turbo run lint typecheck test build --dry-run` and confirm task graph matches design
- [x] 4.2 Confirm `pnpm install` resolves `turbo` and all existing dependencies cleanly
- [x] 4.3 Confirm no existing functionality is broken: `pnpm dev` starts Next.js normally
