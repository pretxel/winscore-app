## 1. Data model

- [x] 1.1 Write a migration creating `public.competition_phase_schemes` (`id`, `competition_id`, `scheme_key`, `labels jsonb`, `is_default`, timestamps) with a unique `(competition_id, scheme_key)` and a partial unique index enforcing one default per competition
- [x] 1.2 In the same migration create `public.competition_phases` (`id`, `scheme_id` referencing schemes, `phase_key`, `labels jsonb`, `display_order int`, `starts_at timestamptz not null`, `status` checked against `pending|active|closed`, timestamps) with unique `(scheme_id, display_order)` and `(scheme_id, phase_key)`
- [x] 1.3 Add nullable `groups.phase_scheme_id` referencing schemes, with a check that the scheme's competition matches `groups.competition_id`
- [x] 1.4 Add `public.competition_phase_winners` (`phase_id`, `group_id`, `user_id`, `total_points`, `exact_hits`, `winner_gd_hits`, `winner_hits`, `decided_at`) with a primary key that allows several rank-1 rows per `(phase_id, group_id)` tie
- [x] 1.5 Enable RLS: schemes and phases readable by anyone who can read the competition; recorded winners readable by members of the group they belong to; writes restricted to admins
- [x] 1.6 Add a helper that resolves a scheme's phase windows by deriving each end from the next phase's `starts_at` via `lead()`, so every ranking function shares one definition of a window
- [x] 1.7 Regenerate `lib/database.types.ts` with the Supabase CLI and check the new tables appear

## 2. Ranking functions

- [x] 2.1 Add `leaderboard_for_phase(p_phase_id uuid)` returning the overall board's columns, aggregating scores over the phase window, excluding admins inside the CTE, with the existing four tie-breakers
- [x] 2.2 Add `leaderboard_for_group_phase(p_group_id uuid, p_phase_id uuid)` doing the same for one group's members, keeping the `m.kickoff_at >= gm.joined_at` predicate and the `is_group_member` guard, and returning no rows when the phase's scheme is not the group's
- [x] 2.3 Return a per-row flag marking members whose `joined_at` falls inside the selected phase, so the UI can label late joiners without a second query
- [x] 2.4 Grant execute on both functions to `authenticated`, and to `anon` only for the global one
- [x] 2.5 Write SQL-level tests covering: window boundaries are half-open, admins excluded with contiguous ranks, non-members get no rows, a phase from another scheme gets no rows, a mid-phase joiner's total excludes matches before their join

## 3. Closing and freezing

- [x] 3.1 Add `close_phase(p_phase_id uuid)` that sets the phase to `closed` and inserts one recorded-winner row per group on that phase's scheme that existed at close, including every member still tied at rank 1, and leaves groups on other schemes untouched
- [x] 3.2 Make `close_phase` refuse a phase that is already closed, and refuse edits to a closed phase's `starts_at` and `display_order`
- [x] 3.3 Verify a result correction inside a closed phase leaves the recorded rows untouched

## 4. Server data layer

- [x] 4.1 Add `lib/phases.ts` exposing a competition's schemes and its default, a scheme's phases, the currently active phase, and the phase containing a given instant
- [x] 4.2 Add loaders for the global phase board and the group phase board, plus the recorded winners for a group
- [x] 4.3 Add unit tests for phase resolution: no schemes, a scheme with one active phase, all phases closed, an instant before the first phase, a group with no scheme

## 5. Leaderboard UI

- [x] 5.1 Extend the segment switcher with a `phase` segment over the competition's default scheme, shown only when a default scheme exists
- [x] 5.2 Read `?segment=phase&phase=<id>`, defaulting to the active phase, then the most recently closed one, and falling back to overall for an unknown id
- [x] 5.3 Render the phase board with the existing leaderboard table component and state the window it covers
- [x] 5.4 Add the new copy to all four locales

## 6. Group creation and group page UI

- [x] 6.1 Add a scheme picker to the create-group form, preselecting "no phases", shown only when the competition offers schemes, and persist the choice through `create_group`
- [x] 6.2 Refuse any later change to `groups.phase_scheme_id` from the owner, members, or the join flow, and cover the refusal with a test
- [x] 6.3 Add a board switcher between the all-time mini board and a single phase of the group's scheme, defaulting to all-time, hidden when the group has no scheme
- [x] 6.4 Name the active phase and its closing date above the board
- [x] 6.5 Show each closed phase's recorded winner with the date it was decided, the joint-winner case, and the message for a group created after the phase closed
- [x] 6.6 Mark late joiners on the phase board
- [x] 6.7 Add a season summary to the group page: a row per member, a column per closed phase, winners marked, phases-won total per member, hidden until the first close
- [x] 6.8 Add the new copy to all four locales

## 7. Admin

- [x] 7.1 Add a phases surface to the competition editor listing schemes with their adoption count and default flag, and each phase with its derived window, status, and current match count
- [x] 7.2 Add create, edit, reorder, and set-default actions for schemes and phases, refusing edits per the lifecycle rules
- [x] 7.3 Add a close action with a confirmation that names the winners about to be recorded
- [x] 7.4 List fixtures that changed phase since the last view
- [x] 7.5 Guard every action behind the admin check and cover the refusal paths with tests

## 8. Seed and verify

- [x] 8.1 Seed one default Champions League 2026-27 scheme with seven phases: two league-phase windows closing 4 Nov 2026 and 27 Jan 2027, then play-off, round of 16, quarter-final, semi-final, and final
- [x] 8.2 Confirm every played Champions League match falls into exactly one phase and the phase totals sum to the overall totals
- [x] 8.3 Confirm competitions without schemes, and existing groups with no scheme, render unchanged on the leaderboard, create-group, and group pages
- [x] 8.4 Run typecheck, lint, and the full test suite, then verify both boards in the browser at desktop and mobile widths
