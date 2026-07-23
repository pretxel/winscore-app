## 1. Install and Configure

- [x] 1.1 Install `@biomejs/biome` as dev dependency
- [x] 1.2 Create `biome.json` with recommended preset, Tailwind sorting, and 120 char line width
- [x] 1.3 Add `.vscode/settings.json` recommending Biome extension + format-on-save

## 2. Migrate Codebase

- [x] 2.1 Run `biome check --write` to auto-fix all fixable issues
- [x] 2.2 Replace all `eslint-disable`/`eslint-disable-next-line` comments with `biome-ignore` equivalents
- [x] 2.3 Replace all `prettier-ignore` comments with `biome-ignore format` equivalents
- [x] 2.4 Manually resolve any remaining lint errors that couldn't be auto-fixed

## 3. Update Tooling

- [x] 3.1 Update `package.json` scripts: `lint`, `format`, `format:check`
- [x] 3.2 Remove `eslint`, `eslint-config-next`, `eslint-config-prettier`, `prettier`, `prettier-plugin-tailwindcss` from devDependencies
- [x] 3.3 Run `pnpm install` to clean lockfile

## 4. Verification

- [x] 4.1 Run `pnpm lint` — must pass with 0 errors
- [x] 4.2 Run `pnpm format:check` — must pass with 0 changes needed
- [x] 4.3 Run `pnpm typecheck` and `pnpm test` — must pass without regressions
- [x] 4.4 Verify `pnpm build` succeeds
