## 1. Blue palette tokens (`app/globals.css`)

- [x] 1.1 Convert `#135FD1` to oklch (`0.513 0.19 260`) and set it as `--primary` in `:root`; derive `--ring`, `--sidebar-primary`, `--sidebar-ring`, `--chart-1`, and `--pitch` from the same blue hue (260)
- [x] 1.2 Rewrite the `.dark` block: blue `--primary`/`--primary-foreground`, `--ring`, `--sidebar-primary`, `--chart-1`, and `--pitch` adjusted for dark surfaces
- [x] 1.3 Kept warm-neutral + gold `--flag`/`--accent` and red `--destructive`/`--live` families; removed the now-redundant `.landing-blue` scoped overrides since blue is the global default
- [x] 1.4 Verified WCAG AA: white-on-`--primary` = 5.62:1, `--border`/card = 3.36:1, `--muted-foreground`/`--background` = 6.25:1
- [ ] 1.5 Visually check nav/buttons/cards/charts/focus rings in both themes — BLOCKED this session: no Supabase `.env` to boot the app + no browser MCP. Source `globals.css` verified blue; run `next dev` with env to eyeball (stale `.next` cache still shows old green until rebuilt)

## 2. New blue logo asset + derivatives

- [x] 2.1 Logo asset resolved: existing in-repo blue `#135FD1` W (`app/icon.svg`) is the final mark (user-confirmed) — no new asset needed
- [x] 2.2 Confirmed `components/logotype.tsx` tile fills from `var(--pitch)` → inherits blue automatically
- [x] 2.3 Favicon set verified already blue: `app/icon.svg` = `#135FD1`; `icon.png`/`apple-icon.png` sample to `#135FD1`
- [x] 2.4 `app/opengraph-image.png` verified as the navy/cream blue-brand card
- [x] 2.5 No metadata/favicon/OG file changes needed (assets already correct) — Next 16 file-based convention untouched

## 3. Remove footer host-nations tagline

- [x] 3.1 Deleted the `<span>{t("hosts")}</span>` in `components/site-nav.tsx`
- [x] 3.2 Removed the `footer.hosts` key from `en`, `de`, `fr`, `es` (kept the unrelated admin-form `hosts` field); JSON re-validated

## 4. Re-theme transactional emails

- [x] 4.1 Created `lib/notifications/email-theme.ts` exporting the shared `C` palette (12 literal-hex brand constants, blue `#135FD1`)
- [x] 4.2 Migrated all 12 `*-template.ts` files: replaced the per-file `const C = {…} as const;` with `import { C } from "./email-theme";` (all 12 already used blue from prior rebrand; now single-sourced)
- [x] 4.3 Confirmed no template defines a local `const C`; typecheck + eslint clean

## 5. Tests & verification

- [x] 5.1 No test changes needed — full suite already green after edits (no test asserted old green/host text)
- [x] 5.2 Full suite green: 1194 passed, 0 failed; `tsc --noEmit` clean; eslint clean
- [x] 5.3 Rendered all 12 email previews to HTML via fixtures; every one contains blue `#135FD1` (3–6×), zero residual green. Live-Chrome screenshot skipped (browser MCP unavailable this session); HTML artifacts left in scratchpad for manual eyeball
