## 1. Blue palette tokens (`app/globals.css`)

- [ ] 1.1 Convert `#135FD1` to oklch and set it as `--primary` in `:root`; derive `--ring`, `--sidebar-primary`, `--sidebar-ring`, `--chart-1`, and `--pitch` from the same blue hue (~262)
- [ ] 1.2 Rewrite the `.dark` block: blue `--primary`/`--primary-foreground`, `--ring`, `--sidebar-primary`, `--chart-1`, and `--pitch` adjusted for dark surfaces
- [ ] 1.3 Retune neutrals (`--background`, `--foreground`, `--muted-foreground`, `--border`, `--input`, `--secondary`) so they read against the new blue in both themes; keep the gold `--flag`/`--accent` family and red `--destructive`/`--live` family
- [ ] 1.4 Verify WCAG AA: `--foreground`/`--background` and `--primary-foreground`/`--primary` ≥ 4.5:1; `--border`/`--input` ≥ 3:1 — in light and dark
- [ ] 1.5 Visually check nav, buttons, cards, sidebar, charts, and focus rings in both themes

## 2. New blue logo asset + derivatives

- [ ] 2.1 Add the new blue logo asset (SVG) to the repo at the path provided by the user
- [ ] 2.2 Confirm `components/logotype.tsx` tile fills from `var(--pitch)` so it inherits blue; adjust only if the new mark's geometry/copy differs
- [ ] 2.3 Regenerate the favicon set from the asset: `app/icon.svg`, `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`
- [ ] 2.4 Regenerate `app/opengraph-image.*` so the OG card shows the blue mark; keep 1200×630
- [ ] 2.5 Read the relevant Next 16 metadata/favicon/OG guide in `node_modules/next/dist/docs/` before touching these files

## 3. Remove footer host-nations tagline

- [ ] 3.1 Delete the `<span className="text-muted-foreground/70">{t("hosts")}</span>` in `components/site-nav.tsx` (~line 114); tidy surrounding flex row
- [ ] 3.2 Remove the `footer.hosts` key from `messages/en.json`, `messages/de.json`, `messages/fr.json`, and `messages/es.json` if it exists

## 4. Re-theme transactional emails

- [ ] 4.1 Create `lib/notifications/email-theme.ts` exporting named literal-hex brand constants (brand blue = `#135FD1`, background, surface, text, muted, accent) matching the site palette
- [ ] 4.2 Migrate every `lib/notifications/*-template.ts` off its inline brand hex (`#FAF9F4`, `#E7B53C`, `#135FD1`, etc.) to import from `email-theme.ts`, inlining the literals into `style` attributes
- [ ] 4.3 Confirm no email template defines brand hex independently of the shared module (grep the templates)

## 5. Tests & verification

- [ ] 5.1 Update tests referencing old green colors, host tagline, or per-template hex (brand/logotype, footer, i18n, `*-email*` template tests)
- [ ] 5.2 Run the full test suite green
- [ ] 5.3 Review emails in the admin email-preview view (`app/[locale]/(admin)/admin/operations/`) to confirm the blue brand renders across templates
