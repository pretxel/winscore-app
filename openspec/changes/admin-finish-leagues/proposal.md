## Why

Admins currently have no way to formally close a league competition. Leagues remain `live` indefinitely even after all matches are complete, there's no visual indication of completion, and no guard preventing predictions on concluded competitions. Adding a finish action gives admins lifecycle control and provides clear UX for players.

## What Changes

- Add a `finished_at` timestamp to competitions and a `finish_league()` admin function, distinct from the existing `is_live` toggle
- Show a finished state in the admin competitions list with a dedicated badge and finish/restart actions
- Block predictions on finished leagues — reuse the existing prediction lock patterns to return a "League is finished" message
- Display finished-state badges on public competition selectors and match lists
- Add finished-state filtering to admin fixture list and competition management views
- Add i18n keys for finished states across `en`, `es`, `fr`, `de`

## Capabilities

### New Capabilities
- `admin-finish-league`: Admin lifecycle action to mark a competition as finished, preventing predictions and showing closed state across the UI

### Modified Capabilities
- `admin-competitions`: Add finish action, finished badge, and filtering to the admin competitions view
- `predictions`: Block submission when the competition is finished (reuse existing lock patterns)
- `multi-league-pools`: Show finished-state badges on league selectors and match lists

## Impact

- **Database:** Add `finished_at timestamptz` to `competitions` and `finish_league()` SQL function (security definer, admin-only)
- **Admin UI:** New finish/restart buttons in competitions list; finished badge in status column
- **Public UI:** Finished badge on league selector (`ManagedContextBar`), matches list header, prediction form gate
- **i18n:** New `finished` status key in `admin`, `matchStatus`, and `common` namespaces
- **No breaking changes:** Existing live/active flags remain; finished is additive
