## 1. Database migration

- [x] 1.1 Create migration adding `status` text column with CHECK constraint (`active`, `manage`, `finished`) and default `manage`
- [x] 1.2 Backfill existing rows: `is_live = true` → `active`, `is_active = true` → `active`, else `manage`
- [x] 1.3 Set `status NOT NULL` and drop `is_live` and `is_active` columns
- [x] 1.4 Update any RLS policies or functions referencing `is_live`/`is_active`

## 2. TypeScript types and helpers

- [x] 2.1 Regenerate or update `lib/database.types.ts` to include `status` column and remove `is_live`/`is_active`
- [x] 2.2 Update `lib/competition.ts` helpers (`getLeagueFromContext`, etc.) to use `status` instead of `is_live`
- [x] 2.3 Audit and fix codebase references to `is_live`/`is_active` on competitions

## 3. Catalog page

- [x] 3.1 Update catalog query: filter by `status IN ('active', 'finished')` instead of `is_live = true`
- [x] 3.2 Add "Finished" tag on competition cards when `status = 'finished'`

## 4. Admin UI

- [x] 4.1 Replace `is_live` toggle with a `status` dropdown (`active` / `manage` / `finished`) in the admin competition form
- [x] 4.2 Update admin competition list to show status badges for all three states

## 5. Verification

- [x] 5.1 Run typecheck and fix any errors
- [x] 5.2 Push migration to local and verify catalog shows correct competitions
- [x] 5.3 Verify admin can toggle statuses and catalog reflects changes
