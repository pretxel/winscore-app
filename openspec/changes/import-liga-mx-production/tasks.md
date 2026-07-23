## 1. Verify Migration Status

- [x] 1.1 Check if Liga MX migration (`20260716000000_liga_mx_tie_key_leg.sql`) is already applied in production Supabase
- [x] 1.2 If not applied, run `supabase db push` or apply migration manually

## 2. Verify Data in Admin

- [x] 2.1 Open `/admin/competitions` — confirm Liga MX appears with correct name, slug (`la-liga-mx`), and season
- [x] 2.2 Open `/admin/matches` — confirm Liga MX fixtures appear with correct teams and kickoff dates
- [x] 2.3 Verify `format_config` shows league format with two-legged knockout ties

## 3. Activate League

- [ ] 3.1 Set `is_live = true` on Liga MX competition via admin (or SQL if admin UI doesn't expose it)
- [ ] 3.2 Confirm Liga MX appears in league catalog (`/catalog`)
- [ ] 3.3 Confirm pool creation picker shows Liga MX as a startable option

## 4. Public Verification

- [ ] 4.1 Open `/la-liga-mx/matches` — confirm fixtures render correctly
- [ ] 4.2 Submit a test prediction on a Liga MX match — confirm it saves
- [ ] 4.3 Create a test pool in Liga MX — confirm it creates with correct league scope
- [ ] 4.4 Verify leaderboard works for the Liga MX pool
