## Context

The app currently resolves its canonical URL from `NEXT_PUBLIC_SITE_URL` → Vercel env → `localhost` (see `lib/env.ts:11-17`). In production it serves from `world-pool.edselserrano.com` (custom domain on Vercel). The metadata base, OG images, JSON-LD, sitemap, and all email links are built from `env.siteUrl`.

The flag system comprises 48 SVGs in `public/flags/`, a mapping module (`lib/team-flag.ts`), a `TeamFlag` React component, a locale-flag map (`LOCALE_FLAG_SLUG`), and consumers in 10+ components.

The landing page currently includes a `.recent-recap-images` gallery section showing up to 5 recent match comic thumbnails. The full match-comic pipeline (prompt generation, Leonardo render, reactions, sharing, digest email, match-detail display) remains untouched.

## Goals / Non-Goals

**Goals:**
- Canonical domain is `winscore.me` across metadata, JSON-LD, sitemap, emails, OG images
- New favicon set (`.ico`, `.svg`, `.png`, `apple-icon.png`) reflecting the winscore.me brand
- All country/locale flag SVGs, the `TeamFlag` component, `flagSlug()`, `TEAM_FLAG` map, and `LOCALE_FLAG_SLUG` are removed; consumers are refactored
- Landing-page comic gallery (`components/recent-recap-images.tsx`) is removed
- Logotype glyphs updated to reflect new brand
- `site.webmanifest` updated to "Winscore" (drops stale "World Cup 2026 Pool" name)

**Non-Goals:**
- The match comic pipeline is **not** removed — prompt generation, Leonardo render, reactions, sharing, digest email, one-click, and match-detail comic display all remain intact
- AI text recaps remain unchanged
- League branding system (`lib/competition.ts`, `competitions` table, `LeagueRail`) is unchanged
- No database schema changes
- No changes to the multi-league routing structure

## Decisions

### 1. Domain swap: env-first, then hardcoded refs

**Decision:** Update `lib/env.ts`'s `resolveSiteUrl()` to default to `https://winscore.me` when no explicit `NEXT_PUBLIC_SITE_URL` or Vercel env is set. Also update `.env.example`, README.

**Rationale:** The env-var chain already works correctly for local dev (`localhost:3000`) and Vercel deploys. Adding `winscore.me` as the production default ensures all derived URLs (metadata, sitemap, emails) resolve correctly.

**Alternative considered:** Hardcoding `winscore.me` everywhere. Rejected — `env.siteUrl` is already used consistently; change it in one place.

### 2. Favicon: replace files, keep Next.js 16 file-convention pattern

**Decision:** Replace the 4 icon files in `app/` (`favicon.ico`, `icon.svg`, `icon.png`, `apple-icon.png`) with winscore.me-branded versions. No code changes needed — Next.js 16 file-based metadata convention picks them up automatically.

**Rationale:** The `brand-identity` spec already established the file-convention pattern. Swapping assets without touching layout code.

### 3. Flag removal: delete assets + component, refactor consumers inline

**Decision:** Delete `public/flags/` (48 SVGs), `components/team-flag.tsx`, and the mapping logic in `lib/team-flag.ts`. For each consumer component, remove `<TeamFlag>` JSX and any flag-related layout spacing. Remove `LOCALE_FLAG_SLUG` and flag rendering from `language-switcher.tsx` — the locale buttons keep text labels only (e.g., "EN", "ES", "FR", "DE").

**Rationale:** Flags were central to World Cup 2026 identity. In a multi-league context, club teams don't need flags. Removing flags simplifies the UI and drops 20+ imports. No migration or DB change required.

### 4. Landing comic gallery removal: delete component, remove section from page

**Decision:** Delete `components/recent-recap-images.tsx` and remove its rendering from the landing page (`app/[locale]/page.tsx`). The rest of the comic pipeline is untouched.

**Rationale:** The landing page is content-heavy. The comic gallery is purely visual filler on the landing page — comics remain accessible on individual match pages. Strip the landing page without disrupting the pipeline.

### 5. Logotype update

**Decision:** Update the SVG paths in `components/logotype.tsx` to reflect the new winscore.me brand mark. The three-size system (`xs`, `md`, `xl`) and `viewBox` strategy remain unchanged. The `edition` prop is retained for competition subtitles.

**Rationale:** The `brand-identity` spec already enforces a single-component, three-size architecture. Changing the visual content without breaking the component contract.

## Risks / Trade-offs

- **[SEO] Domain change** — Search engines will see a new canonical domain. The old domain should 301-redirect to `winscore.me`. Mitigation: Vercel custom domain with redirect rules.
- **[Broken links] Hardcoded URLs** — Any external services, bookmarks, or deep links pointing to `world-pool.edselserrano.com` will break. Mitigation: 301 redirects on Vercel.
- **[A11y] Flag removal** — TeamFlag provided visual team identification at a glance. Mitigation: team names are always rendered alongside flags in every consumer; removing flags leaves text labels intact.
- **[Landing] Gallery removal** — Users browsing the landing page won't see the comic gallery. Mitigation: comics remain discoverable on match detail pages and via the digest email.

## Migration Plan

1. Replace favicon assets in `app/`
2. Update `lib/env.ts` domain default
3. Update `site.webmanifest` name/short_name
4. Update Logotype SVG
5. Remove landing comic gallery
6. Remove flag assets and component, refactor all consumers
7. Strip flag/gallery i18n keys
8. `pnpm typecheck && pnpm lint && pnpm test`
9. Deploy with Vercel domain pointing to `winscore.me`
10. Configure 301 redirect from old domain

Rollback: revert the commit. All functionality is additive in terms of what stays (comic pipeline preserved, flags removed).
