## Context

Liga MX competition structure is already defined in migration `20260716000000_liga_mx_tie_key_leg.sql`. This migration creates the competition record with a league format (no groups, single league stage with two-legged knockout ties), populates teams and fixtures, and configures providers (ESPN league path). The production database needs these rows to exist for the league to be playable.

The migration has already been applied locally and verified. The production Supabase instance needs the same migration applied, followed by admin-level verification.

## Goals / Non-Goals

**Goals:**
- Ensure the Liga MX competition appears in production with correct `format_config`, fixtures, and teams
- Set `is_live = true` after verification so the league is startable
- Verify all fixtures render correctly at the `/la-liga-mx` route

**Non-Goals:**
- Changing the Liga MX format or fixture data
- Adding new leagues beyond Liga MX
- Modifying the migration itself

## Decisions

### 1. Use the existing migration rather than manual admin creation

The Liga MX migration is idempotent and already tested locally. Running it via the Supabase migration pipeline is safer than manually creating the competition + 100+ fixtures through the admin UI.

### 2. Verify via admin UI and public route before setting live

After migration, verify the competition appears in `/admin/competitions`, fixtures appear in `/admin/matches`, and the public route `/la-liga-mx/matches` renders correctly. Set `is_live = true` only after verification.

## Risks / Trade-offs

- **Migration is large (teams + fixtures)** → Already tested locally, no risk of partial failure
- **ESPN provider may have different fixture coverage** → Use the admin sync tools to verify provider integration

## Migration Plan

1. Verify the migration exists in production Supabase migration history
2. If not applied, run `supabase migration up` against production (requires admin credentials)
3. Verify competition + fixtures in admin UI
4. Set `is_live = true` via admin UI or SQL
5. Verify public route renders correctly
6. Verify pool creation works for Liga MX

Rollback: set `is_live = false`. Data remains for future activation.

## Open Questions

- Has the migration been applied to production already? Check `supabase migration list` against production.
