## Context

Competitions currently use two separate booleans: `is_live` (controls catalog visibility) and `is_active` (legacy single-active flag). The `concurrent_leagues` migration introduced `is_live` to allow multiple live leagues, but the lifecycle is still binary — a competition is either live or not. There's no way to distinguish a competition being configured by admins from one that's completed and should remain visible as a historical record.

The catalog page (`app/[locale]/catalog/`) queries competitions and filters by visibility. The admin form edits competitions. Several backend functions reference `is_live` or `is_active`.

## Goals / Non-Goals

**Goals:**
- Replace `is_live` and `is_active` with a single `status` text column constrained to `active`, `manage`, `finished`
- Catalog shows `active` and `finished` competitions; `manage` is admin-only
- Admin form exposes a status selector instead of the `is_live` toggle
- Backward-compatible migration that preserves existing behavior

**Non-Goals:**
- Adding status-specific UI logic beyond catalog filtering and a "Finished" tag
- Status-based access control beyond admin visibility
- Automated status transitions (clock-driven lifecycle)

## Decisions

**Text enum over boolean pair.** A single constrained text column (`CHECK status IN ('active','manage','finished')`) is more expressive and self-documenting than two booleans. It eliminates the confusing `is_live` vs `is_active` distinction.

**Migration strategy: add column, backfill, then drop old columns.** The migration will:
1. Add `status` as nullable with a CHECK constraint
2. Backfill from existing flags: `is_live=true` → `active`, `is_active=true` → `active`, else `manage`
3. Set `status NOT NULL` with default `manage`
4. Drop `is_live` and `is_active` columns

**Catalog query: simple status filter.** The catalog page changes its query from `is_live = true` to `status IN ('active', 'finished')`. No new indexes needed — the status column is low-cardinality and the competitions table is small (<100 rows).

**Default status for new competitions: `manage`.** New competitions created via admin form start in `manage` status, hidden from the catalog until an admin explicitly activates them.

## Risks / Trade-offs

- **Code references to `is_live`/`is_active` may be scattered** → Grep the entire codebase before migration; update all TypeScript types, queries, and helper functions.
- **RLS policies may reference `is_live`** → Audit all RLS policies; update any that filter on the old columns.
- **Supabase TypeScript types regenerate** → If using `supabase gen types`, re-run after migration.

## Migration Plan

1. Create migration adding `status` column, backfilling, dropping old columns
2. Regenerate database types
3. Update catalog page query
4. Update admin form status control
5. Update `getLeagueFromContext` and related helpers
6. Audit and update RLS policies if needed
7. Deploy migration + code together
