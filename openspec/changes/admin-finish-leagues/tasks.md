## 1. Database Migration

- [x] 1.1 Add `finished_at timestamptz` column to `competitions` table
- [x] 1.2 Create `finish_league(p_id uuid)` SQL function — security definer, admin-only, sets `finished_at = now()` if null
- [x] 1.3 Create `restart_league(p_id uuid)` SQL function — security definer, admin-only, sets `finished_at = NULL`
- [x] 1.4 Regenerate `lib/database.types.ts` from local Supabase

## 2. Admin Server Actions

- [x] 2.1 Add `finishLeagueAction` and `restartLeagueAction` to `app/[locale]/(admin)/admin/competitions/actions.ts`
- [x] 2.2 Wire actions into admin competitions list page with inline forms using `SubmitButton confirmText`

## 3. Admin Competitions List UI

- [x] 3.1 Add "Finished" badge (outline variant, muted) next to ACTIVE/MANAGED badges for competitions with `finished_at`
- [x] 3.2 Add "Finish" button (with confirmation) on live, non-finished competition rows
- [x] 3.3 Add "Restart" button (with confirmation) on finished competition rows
- [x] 3.4 Ensure finish/restart buttons are hidden for the active competition and World Cup seed

## 4. Prediction Gating

- [x] 4.1 Add finished-league check to single-match prediction submit action — return "League is finished" error when `competition.finished_at IS NOT NULL`
- [x] 4.2 Add finished-league check to bulk round prediction submit action
- [x] 4.3 Hide prediction edit controls on finished leagues in the match detail page and my-picks page

## 5. Public UI Badges

- [x] 5.1 Add "Finished" badge to `ManagedContextBar` league selector when league is finished
- [x] 5.2 Add "Finished" badge to public matches list header
- [x] 5.3 Add "Finished" badge to league catalog entries
- [x] 5.4 Ensure finished leagues are not shown as startable in pool creation picker

## 6. i18n

- [x] 6.1 Add `admin.finished`, `admin.restart`, `admin.finishConfirm`, `admin.restartConfirm` keys to en.json
- [x] 6.2 Add corresponding translations to es.json, fr.json, de.json
- [x] 6.3 Add `matchStatus.finished` and `common.leagueFinished` keys to all four locales

## 7. Verification

- [x] 7.1 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` — all must pass
- [x] 7.2 Run local Supabase migration and verify the new column and functions exist
- [ ] 7.3 Manual test: finish a league in admin, verify badge appears, verify predictions are blocked
- [ ] 7.4 Manual test: restart a league, verify badge disappears, verify predictions work again
