## 1. Install and Configure

- [ ] 1.1 Install `@biomejs/biome` as dev dependency
- [ ] 1.2 Create `biome.json` with recommended preset, Tailwind sorting, and 120 char line width
- [ ] 1.3 Add `.vscode/settings.json` recommending Biome extension + format-on-save

## 2. Migrate Codebase

- [ ] 2.1 Run `biome check --write` to auto-fix all fixable issues
- [ ] 2.2 Replace all `eslint-disable`/`eslint-disable-next-line` comments with `biome-ignore` equivalents
- [ ] 2.3 Replace all `prettier-ignore` comments with `biome-ignore format` equivalents
- [ ] 2.4 Manually resolve any remaining lint errors that couldn't be auto-fixed

## 3. Update Tooling

- [ ] 3.1 Update `package.json` scripts: `lint`, `format`, `format:check`
- [ ] 3.2 Remove `eslint`, `eslint-config-next`, `eslint-config-prettier`, `prettier`, `prettier-plugin-tailwindcss` from devDependencies
- [ ] 3.3 Run `pnpm install` to clean lockfile

## 4. Verification

- [ ] 4.1 Run `pnpm lint` — must pass with 0 errors
- [ ] 4.2 Run `pnpm format:check` — must pass with 0 changes needed
- [ ] 4.3 Run `pnpm typecheck` and `pnpm test` — must pass without regressions
- [ ] 4.4 Verify `pnpm build` succeeds
