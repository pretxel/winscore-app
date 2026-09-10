## Why

A season-long pool has one winner and one moment of suspense. By the time the Champions League reaches the knockouts the overall board is usually settled, and everyone outside the top two has nothing left to play for. Splitting the competition into seven phases, each with its own winner, gives every player a fresh, reachable contest roughly every month while the overall board still crowns a season champion.

The phase winner is settled among the friends who play together, so it has to come from within a group. That makes the group — not the global ranking — the unit that decides each phase.

## What Changes

- Introduce **phase schemes**: a competition can offer one or more named schemes, each an ordered set of kickoff windows (phases). A phase is a filter over existing scores, not a new scoring pass — `public.scores` is untouched and the overall board keeps summing every match.
- Let a **group owner pick a scheme when creating the group**, including "no phases", which is the default and today's behaviour. The choice is locked once the group exists, so nobody can move a deadline after seeing the standings.
- Seed one scheme with the seven phases for Champions League 2026-27:

  | # | Phase | Window |
  |---|---|---|
  | 1 | League phase, part 1 | through 4 Nov 2026 (matchdays 1–4) |
  | 2 | League phase, part 2 | through 27 Jan 2027 (matchdays 5–8) |
  | 3 | Knockout play-off | stage `po` |
  | 4 | Round of 16 | stage `r16` |
  | 5 | Quarter-final | stage `qf` |
  | 6 | Semi-final | stage `sf` |
  | 7 | Final | stage `final` |

  Phases 1 and 2 split the single `league` stage in two, which is why `leaderboard_for_stage` cannot express them and a phase needs its own kickoff window.
- Add **phase rankings** in two scopes: per group over the group's own scheme (who wins the phase) and across the whole league over the competition's default scheme (bragging rights), both reusing the existing score columns and tie-breakers.
- Give each phase a lifecycle (`pending` → `active` → `closed`). Closing a phase **freezes its winner** into a record, so a late result correction cannot retroactively change a winner already announced.
- Surface the current phase, its closing date, and the phase-vs-overall distinction on the leaderboard and on the group page.
- Add admin screens to define schemes, their phases, and to close a phase for every group on that scheme.

Nothing about existing scoring, predictions, or the overall board changes. A deployment with no schemes defined, or a group that picked none, behaves exactly as today.

## Capabilities

### New Capabilities

- `competition-phases`: the scheme and phase model — named schemes per competition, each an ordered set of kickoff windows, their lifecycle, the admin surface that defines and closes them, and the frozen winner recorded at close.
- `phase-leaderboards`: ranking players over a single phase, both within a group and across the whole competition, including how mid-phase joiners and postponed fixtures are treated.

### Modified Capabilities

- `segmented-leaderboard`: the `?segment=` parameter gains a `phase` value alongside `overall`, `week`, and `stage`, selected by a `phase` query parameter.
- `groups`: group creation gains a phase-scheme picker, locked after creation; the group mini board gains a phase selector over the chosen scheme and shows the frozen phase winner once a phase closes.

## Impact

- **Database:** new `competition_phase_schemes`, `competition_phases`, and `competition_phase_winners` tables; a nullable `groups.phase_scheme_id`; new SQL functions `leaderboard_for_phase(uuid)` and `leaderboard_for_group_phase(uuid, uuid)`; a `close_phase(uuid)` function that writes the frozen winner for every group on the scheme. No change to `scores`, `predictions`, or `matches`.
- **Public UI:** scheme picker on the create-group form; phase selector on `/[league]/leaderboard`; phase board and winner banner on the group page; current-phase context on the pool dashboard.
- **Admin UI:** a phases tab under the competition editor to create schemes, their phases, reorder them, and close a phase.
- **Data:** one seeded scheme with seven phases for Champions League 2026-27. Other competitions get none and are unaffected.
- **Depends on** `kickoff_at` tracking the provider's real schedule, which the result sync now reconciles — a fixture moved across a phase boundary changes phase on its own.
