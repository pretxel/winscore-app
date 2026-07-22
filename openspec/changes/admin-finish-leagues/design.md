## Context

Competitions currently have two lifecycle flags — `is_active` (which competition is the public one) and `is_live` (whether the league is accepting pools). There is no "finished" state. Once a league's fixtures are all final, there's nothing preventing users from submitting predictions (they'd be locked at per-match kickoff anyway) but there's no admin action to formally close it, no badge to communicate completion, and no way to distinguish "done" from "live" in the admin list or public pickers.

The existing pattern for admin lifecycle actions uses security-definer RPC functions (`set_active_competition`, `set_league_live`) triggered from admin Server Actions behind confirmation dialogs. The same pattern applies here.

## Goals / Non-Goals

**Goals:**
- Add a `finished_at` timestamp and admin-only `finish_league()` / `restart_league()` functions
- Show finished status badge in admin competitions list, league selector, matches list, and prediction form
- Block predictions on finished leagues with a clear "League is finished" message
- Filter finished leagues in admin fixture list

**Non-Goals:**
- Auto-finish on last match becoming final (needs cron/scheduler — future change)
- Data deletion or purging for finished leagues
- Changing the `is_live` or `is_active` flags — these remain independent

## Decisions

### 1. Add `finished_at` rather than a `status` enum

Adding a nullable `finished_at timestamptz` to `competitions` preserves backward compatibility (null = not finished) and provides an audit trail of when the league was closed. A status enum would collapse `is_live` and `finished` into one field, forcing migration of existing logic.

Alternative considered: `status` enum (`upcoming`/`live`/`finished`). Rejected because `is_live` is already well-established in the codebase and reworking it would touch pool creation, leaderboards, and league catalog — far more risk than a simple additive column.

### 2. Mirror the existing `set_league_live` pattern

The `finish_league()` function follows the same security-definer, admin-only, fixed-search-path pattern as `set_league_live()`. The admin Server Action calls it via `admin.rpc("finish_league", { p_id })`. Confirmation is done client-side via the existing `SubmitButton confirmText` pattern.

### 3. Reuse prediction lock patterns for finished-league blocking

The prediction submit action already checks match status and kickoff time. Adding a finished-league check is a single additional condition: `competition.finished_at IS NOT NULL → return error`. No new RLS policy needed — the server action handles this before the database write.

### 4. Show finished badge in existing badge positions

The `ManagedContextBar` league selector already shows `is_live` badges. Adding a "Finished" variant in the same position is zero-layout-change. The admin competitions list adds a `Badge` in the row. The matches list header shows it next to the league name.

## Risks / Trade-offs

- **Finished league can't be restarted by users** → Mitigation: The `restart_league()` function sets `finished_at = NULL`. Only admins can invoke it. This is intentional — finished means finished to users.
- **Finished leagues still appear in league catalog** → Mitigation: They're visible but clearly marked as finished. Hiding them would orphan users' pool dashboards. A future change can add a catalog filter.

## Migration Plan

1. Create additive migration: `ALTER TABLE competitions ADD COLUMN finished_at timestamptz`
2. Create `finish_league(uuid)` and `restart_league(uuid)` SQL functions
3. Regenerate `lib/database.types.ts`
4. Add admin Server Action and wire into competitions list and edit page
5. Add finished-league check to prediction submit action
6. Add finished badge to `ManagedContextBar`, matches list, and prediction form
7. Add i18n keys for `en`, `es`, `fr`, `de`
8. Deploy — no rollback needed (column is nullable, new functions are additive)

## Open Questions

- Should finished leagues be hidden from the public league catalog? (TBD — keep visible for now per decision 4)
- Should a finished league automatically block new pool creation? (Yes — pool creation already requires `is_live = true`, and finished leagues would need `is_live = false`)
