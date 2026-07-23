## Why

Liga MX competition data (competition record, format config, fixtures, and teams) needs to be imported into the production Supabase database so players can start creating pools and submitting predictions for the Mexican league. Migration files already exist locally but the actual data seeding requires an admin operation against the production database.

## What Changes

- Run the existing `20260716000000_liga_mx_tie_key_leg.sql` migration against production Supabase (already applied via migration pipeline)
- Seed La Liga MX fixtures and teams into production via admin tools
- Create the Liga MX competition entry in the admin with proper `format_config`, `providers`, and `branding`
- Set `is_live = true` on the Liga MX competition so it appears in the league catalog and pool picker
- Verify fixtures appear correctly on the public matches page under the `[league]` route

## Capabilities

### New Capabilities
- *None* — this is an operational data import, not a new feature

### Modified Capabilities
- *None* — no spec-level requirement changes

## Impact

- **Database:** One new `competitions` row (Liga MX), ~100+ `matches` rows (fixtures), `competition_rounds` entries
- **Admin UI:** Liga MX appears in competitions list, fixture list
- **Public UI:** Liga MX appears in league catalog, pool picker, and route
- **No code changes:** Data import only
