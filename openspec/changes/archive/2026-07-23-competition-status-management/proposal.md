## Why

The current binary `is_live` / `is_active` model doesn't distinguish between competitions in need of admin attention (configured but not yet live), active competitions visible to users, and completed competitions that should remain visible as historical records. As the platform adds more leagues (Liga MX, La Liga), admins need a clear lifecycle: manage → active → finished.

## What Changes

- Add a `status` column to the `competitions` table with values `active`, `manage`, and `finished`
- **active**: Shown in `/catalog` for all users; predictions and pools are open
- **manage**: Hidden from the public catalog; only visible to admins (for setup/testing)
- **finished**: Shown in `/catalog` with a "Finished" tag; results are viewable but predictions are closed
- Migrate existing `is_live`/`is_active` flags to the new `status` column
- Update the catalog page to respect the new status
- Update admin UI to toggle between the three statuses

## Capabilities

### New Capabilities
- `competition-status-lifecycle`: Defines the three competition statuses (active, manage, finished) and their visibility rules.

### Modified Capabilities
- `competition-management`: Replace `is_live`/`is_active` booleans with the new `status` column. Admin form SHALL expose a status selector.
- `multi-league-pools`: Catalog visibility rules change from `is_live=true` to `status IN ('active', 'finished')`.

## Impact

- `supabase/migrations/` — new migration adding `status` column, migrating existing data, adding constraint
- `app/[locale]/catalog/` — catalog page filtering logic
- `components/admin/` — admin competition form status control
- `lib/competition.ts` — `getLeagueFromContext` and related helpers
- `lib/database.types.ts` — regenerate or manually update types
