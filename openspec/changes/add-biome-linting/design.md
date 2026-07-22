## Context

The project currently has ESLint 9 with `eslint-config-next` and `eslint-config-prettier`, plus Prettier 3 with `prettier-plugin-tailwindcss`. These 5 packages parse TypeScript/JSX/Tailwind twice — once for lint and once for format — doubling the AST work. Biome is a single Rust binary that lints and formats in one pass, configured via a single `biome.json`.

The existing ESLint ruleset is Next.js defaults + TypeScript strict. The existing Prettier config uses Tailwind class sorting. Biome's recommended rules cover most of the same ground out of the box.

## Goals / Non-Goals

**Goals:**
- Replace ESLint + Prettier with Biome for all lint and format operations
- Match or improve the current lint rule coverage (TypeScript strict, React hooks, a11y, import organization)
- Preserve Tailwind class sorting behavior
- Keep existing scripts working (`pnpm lint`, `pnpm format:check`, `pnpm format`)
- Maintain zero lint errors on the codebase after migration

**Non-Goals:**
- Enabling every Biome rule — start with recommended, add project-specific rules as needed
- Changing any existing ESLint/Prettier config behavior beyond what Biome covers equivalently
- Removing inline disable comments that don't have a direct Biome equivalent (mark them for human review)

## Decisions

### 1. Use `biome.json` with recommended preset

Biome's `recommended` preset covers TypeScript correctness, React hooks rules (`useExhaustiveDependencies`), a11y (`useAltText`, `useButtonType`, etc.), import organization, and general code quality. This is the closest drop-in for the current ESLint + Prettier stack.

Alternative considered: Biome's `all` preset. Rejected because it's too aggressive for initial migration — 100+ rules would cause excessive noise. Start with recommended, iterate.

### 2. Configure Tailwind class sorting via Biome's built-in `useSortedClasses`

Biome 2.x includes built-in Tailwind class sorting via `assistiveActions.source.useSortedClasses`, removing the need for `prettier-plugin-tailwindcss`.

Alternative considered: Keep Prettier for formatting only. Rejected — defeats the purpose of a single tool. Biome's formatter handles JSX/TSX/CSS equally well.

### 3. Replace inline disable comments mechanically

`// eslint-disable-next-line` → `// biome-ignore lint/suspicious/noExplicitAny: <reason>`  
`// eslint-disable` → `// biome-ignore lint: <reason>`  
`<!-- prettier-ignore -->` → `<!-- biome-ignore format: <reason> -->`

Every ignore comment must carry a reason. Unmatched ignores get flagged.

### 4. Keep `format:check` as `biome check` (read-only)

`biome check` runs both lint and format checks without writing. `biome check --write` applies fixes. This mirrors the current `lint`/`format` distinction.

## Risks / Trade-offs

- **Rule differences cause new lint errors** → Mitigation: Run `biome check --write` once to auto-fix, manually fix the rest
- **ESLint custom rules (Next.js specific) have no Biome equivalent** → Mitigation: Next.js 16.2 rules are mostly covered by Biome recommended; any gaps surface as new lint warnings we decide to accept or suppress
- **Editor integration requires team-wide switch** → Mitigation: VSCode Biome extension is well-maintained; ship `.vscode/settings.json` recommendation

## Migration Plan

1. Install `@biomejs/biome` as dev dependency
2. Create `biome.json` with recommended preset + Tailwind sorting + project overrides
3. Run `biome check --write` to auto-fix all fixable issues
4. Manually resolve remaining errors, replace inline disable comments
5. Update `package.json` scripts
6. Remove ESLint + Prettier dependencies
7. Run `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test` to verify
8. Commit

Rollback: revert the commit. No database or API changes.

## Open Questions

- Should we add a `.vscode/settings.json` to recommend the Biome extension? (Yes — add as part of this change)
