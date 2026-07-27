## Context

Leagues currently have three statuses: `manage` (hidden), `active` (live), and `finished` (done). There is no way to show an upcoming league in the catalog before it goes live. La Liga 2026–2027 needs to be visible to users as a "Coming Soon" attraction at least 7 days before its start date, while keeping group creation and prediction features locked.

## Goals / Non-Goals

**Goals:**
- Add an `upcoming` status between `manage` and `active` in the competition lifecycle
- Upcoming leagues appear in the catalog with a "Coming Soon" badge
- Upcoming leagues are excluded from the startable leagues list (no group creation)
- Upcoming league slugs route to a coming-soon placeholder page instead of 404/redirect
- Admin UI supports setting a league to `upcoming` alongside existing `active` / `manage` / `finished`

**Non-Goals:**
- Automatic status transitions based on dates (cron-based promotion from upcoming → active)
- Countdown timer or exact date display on the coming-soon page
- Email notifications or reminders when a league becomes active
- Any changes to how finished leagues behave

## Decisions

**1. New `upcoming` status value (not date-driven visibility)**
A dedicated status is explicit, matches the existing pattern (`manage` → `upcoming` → `active` → `finished`), and gives admins control over when to start teasing a league. Date-based heuristics on `tournament_start_at` would be fragile and implicit.

**2. 7-day threshold is operational guidance, not enforced in code**
The system does not auto-transition or auto-hide based on date math. Admins set `upcoming` when they want the league to appear as coming soon (typically when `tournament_start_at` is at least 7 days out). This keeps the implementation simple and avoids edge cases around date arithmetic and timezone handling.

**3. Coming-soon pages reuse the `[league]` route segment**
Instead of creating a separate route, the existing `[league]/layout.tsx` handles `upcoming` by rendering a coming-soon placeholder for the main content area instead of redirecting to catalog. This keeps the URL structure consistent.

**4. Badge style mirrors "Finished" badge**
The "Coming Soon" badge uses the same `variant="outline"` pattern as the Finished badge but with distinct colors (accent-based vs muted) to be visually distinguishable from both "Live" and "Finished" badges.

## Risks / Trade-offs

- [Admins must remember to promote] → The admin competition list already shows status; the upcoming badges make it clear which leagues need promotion. A future cron job could automate promotion based on `tournament_start_at`.
- [`upcoming` leagues accessible via slug but not startable] → This is the intended UX. The coming-soon page clearly communicates that the league isn't ready yet, preventing confusion.
- [New status value requires DB migration + code changes across query filters] → Mitigated by the existing `competitions_status_check` constraint which uses `IN ('active', 'manage', 'finished')` — just add `'upcoming'` to the list.
