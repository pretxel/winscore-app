## Context

Scoring today is a single flat sum. `public.scores` holds one row per (user, match) written by `compute_match_scores`, and every ranking surface is an aggregate over it: `v_leaderboard_overall` for the season, `leaderboard_for_day` and `leaderboard_for_stage` for the segmented board, and `leaderboard_for_group` for a friend group. The group function additionally applies per-member join-date scoring — a member only aggregates matches whose `kickoff_at` is on or after their own `group_members.joined_at`. Admins are filtered out inside each aggregate CTE, before `rank()`, so ranks stay contiguous. Ties break on `total_points desc, exact_hits desc, winner_gd_hits desc, first_submit asc`.

Champions League 2026-27 already has both structures a phase could be built on, and neither fits alone:

- `format_config.stages` gives `league`, `po`, `r16`, `qf`, `sf`, `final`.
- `competition_rounds` gives eight matchdays, MD1 on 2026-09-08 through MD8 on 2027-01-27.

The requested phases 1 and 2 split the single `league` stage at 4 November, so a stage key cannot name them. Phases 3 through 7 are stage-aligned. Something that can express both is needed.

Each phase names a winner, and that winner is settled among people who know each other. That constrains where the ranking has to be computed. Not every group wants the same game, either: one wants seven phases, another a single season prize. So the choice of phase structure has to be made by the group, without letting a group redraw its own deadlines once play has started.

## Goals / Non-Goals

**Goals:**

- Express all seven phases, including the two that split a stage.
- Produce a defensible winner per phase for each friend group.
- Let each group choose, when it is created, which phase scheme it plays — including none.
- Keep the season-long overall board exactly as it is today.
- Make a closed phase's winner immune to later result corrections.
- Leave `scores`, `predictions`, and `compute_match_scores` untouched.

**Non-Goals:**

- Tracking any prize attached to a phase. The app names a winner; what that is worth is between the players.
- Notifying winners. Closing a phase sends no email or push; the result is read on the group page. The `winners_email` job stays as it is, for the season podium only.
- Per-group custom boundaries. A group picks from the schemes the competition offers; it does not type its own dates.
- Changing the stage point multipliers. A knockout match is still worth more than a league match, inside its phase and in the overall board.
- Retrofitting phases onto the World Cup, La Liga, or Liga MX. Those competitions simply have no phases defined.

## Decisions

### A phase is a kickoff window, not a stage or a list of rounds

A phase is defined by when its matches kick off. A match belongs to the phase whose window contains its `kickoff_at`.

The alternatives both fail on the requested calendar. Keying on `stage` cannot split `league` into phases 1 and 2. Keying on an explicit set of `competition_rounds` works for the league phase but not for the knockouts, which have no round rows, and it forces a fixture-to-phase reassignment every time a match is added.

A window also gives the behaviour we want for free when a fixture moves: the result sync now reconciles `kickoff_at` to the provider's real schedule, so a postponed match changes phase by itself rather than needing an admin to re-file it.

### Store only the start; derive the end from the next phase

Each phase row stores `starts_at` and `display_order`. Its end is the next phase's `starts_at`, and the last phase runs open-ended.

Storing an explicit `ends_at` alongside reads more naturally in the admin form, but it lets a careless edit create a gap where a match belongs to no phase, or an overlap where it belongs to two and its points are counted twice. Deriving the boundary makes both states unrepresentable: the phases of a competition always partition the timeline. The cost is a `lead()` window function in the ranking queries, which is contained in one CTE.

The first phase starts at the competition's start, so no played match can fall before phase 1.

### Schemes belong to the competition; a group picks one at creation; rankings are computed per group

This is the answer to whether the feature lives at group level, and it is a split in three rather than a choice.

The **phase boundaries are competition-scoped**, bundled as named schemes. The seven Champions League phases are facts about its fixture list, not preferences of a friend group. Defining them once means every group on a scheme shares the same boundaries, an admin closes a phase once for all of them, and two groups on the same scheme compare like for like. Letting each group type its own dates would multiply the admin surface, make cross-group comparison meaningless, and invite disputes about whether a group moved its own deadline after seeing the standings.

The **choice of scheme is group-scoped and made at creation**. `groups.phase_scheme_id` is nullable; null is "no phases" and the default, which keeps the create-group flow one step for anyone who does not care. The owner can pick any scheme the competition offers. The field is locked once the group exists: with the Champions League already under way, an editable scheme is exactly the "move the deadline after seeing the standings" problem the competition-level boundaries were meant to prevent. A group that wants a different scheme creates a new group. That applies to groups created before this ships as well: they stay on no phases, with no migration or adopt action. The product owner confirmed this.

The **ranking is group-scoped**, because a phase winner only means something among people who play against each other. A global winner across every Winscore user is a stranger to most groups. So the winner has to be the best member of one group, each group gets its own winner per phase, and one phase can produce as many winners as there are groups on that scheme.

A global per-phase board ships too, reusing the existing `?segment=` pattern, over the competition's default scheme. It is for bragging rights. The phase winner is bound to the group board.

The alternative of letting a group define arbitrary boundaries was considered and rejected for now. It needs per-group phase rows, a per-group close (by the owner, or automatically by date), and a lock rule that has to reason about which matches have kicked off. Schemes give the owner a real choice with none of that, and custom boundaries can be layered on later as "a scheme owned by one group" without changing the ranking functions.

This split also inherits the group board's existing fairness rule rather than inventing a second one: `leaderboard_for_group_phase` keeps the `m.kickoff_at >= gm.joined_at` predicate, so someone who joins mid-phase scores only from the matches they could actually have predicted. The UI should mark such a member as a late joiner so the result is not argued over.

### A phase is a filtered view, never a reset

"Resetting the score each phase" is a presentation concern. No rows are deleted, no scores are recomputed, and nothing is copied into a per-phase table. A phase ranking is the same aggregate as today with one extra predicate on `m.kickoff_at`.

That keeps the overall board correct by construction — it is still the unfiltered sum — and makes the whole feature reversible: dropping the phase rows returns the product to its current behaviour with no data loss. It also means phases can be re-cut after the fact if a boundary was wrong, as long as the affected phase has not been closed.

### Phases are labelled by number; the closing date is context, not the name

Phases 1 and 2 are called "Phase 1" and "Phase 2", with the closing date shown beside the name wherever the phase is presented, not folded into the label. The product owner chose this over date-based names. Knockout phases keep their stage names, since "Round of 16" is already what players call them.

### The group page keeps every phase browsable and summarises the season

A member can open any phase of the group's scheme, past or current, through the same switcher: a closed phase shows its recorded winner and its live standing, an active one shows the provisional standing. On top of that the group page carries a season summary: one row per member, one column per closed phase, marking who won each, so the running tally of phases won is visible without clicking through them. The summary reads only from the recorded winners, so it is stable and cheap. It is empty until the first phase closes.

### Closing a phase freezes its winner

Phases move `pending` → `active` → `closed`. Closing writes one `competition_phase_winners` row per group on that phase's scheme, capturing the winner and their scoring columns at that moment. Groups on another scheme, or on none, are untouched.

Without the freeze, a corrected result weeks later could silently change a winner that has already been announced. After close, the group page shows the frozen winner and stops recomputing it; the live board remains available as the current standing but is no longer what the result refers to.

Ties are recorded rather than broken arbitrarily: if two members are still level after all four tie-breakers, both are written with rank 1 as joint winners. A group created after a phase closed has no frozen row for that phase, which the UI shows as "phase closed before this group existed".

### New SQL functions rather than parameters on the existing ones

`leaderboard_for_phase(p_phase_id uuid)` and `leaderboard_for_group_phase(p_group_id uuid, p_phase_id uuid)` are added alongside the current functions instead of adding optional arguments to them.

Overloading `leaderboard_for_group` with a nullable phase argument would change a function that four surfaces already call and that has its own spec and tests. Separate functions keep the existing contract untouched, and the shared aggregate shape means the UI table component is reused as-is.

## Risks / Trade-offs

- **A fixture is postponed across a phase boundary after players have picked** → The phase is defined by real kickoff time, so the match silently moves phase and both phases' standings shift. This is the correct outcome but a surprising one; the phase board should state that it follows actual kickoff dates, and the admin phase screen should list fixtures that changed phase since the last sync.
- **A result is corrected after a phase closes** → The frozen winner protects the announced result, but the frozen row and the live standing then disagree. Show the frozen winner as the phase result and label it with its decision date rather than hiding the discrepancy.
- **A group's members joined at very different times** → Join-date scoring already handles the arithmetic, but a member who joined halfway through a phase can still look like they underperformed. Mark late joiners on the phase board.
- **Groups on different schemes cannot be compared phase by phase** → Accepted. The overall board is the shared yardstick; phase boards are per group by design. The leaderboard's global phase segment uses the competition's default scheme and says so.
- **A group picks a scheme whose first phase has already closed** → The group has no recorded winner for that phase and the page says the phase closed before the group existed, same as a late-created group on any scheme.
- **Seven phases dilute the season champion** → The overall board is unchanged and still shown first; phases are an additional axis, not a replacement. If the phase framing takes over the product's identity, the fix is presentational.
- **Knockout phase dates are not final when the phases are seeded** → Knockout windows are best-guess at seed time and an admin may need to adjust `starts_at` before those phases go active. Editing the start of a `pending` phase is safe; editing a `closed` one is refused.
- **A competition with no phases** → Every phase surface must degrade to nothing rather than erroring. The World Cup, La Liga, and Liga MX will be in this state on day one, so it is the default path, not an edge case.

## Migration Plan

1. Ship the tables and functions. With no scheme rows and every existing group on `phase_scheme_id = null`, every new surface renders nothing and the product is unchanged.
2. Seed the Champions League scheme with its seven phases through the admin screen, marked as the competition's default, with phase 1 `active` and the rest `pending`.
3. Enable the scheme picker on group creation and the phase selector on the leaderboard and group pages. Existing groups stay on no phases; an owner who wants phases creates a new group.
4. Close phase 1 after 4 November, which writes the first frozen winners for every group on the scheme.

Rollback is deleting the phase rows: the overall and group boards are computed from `scores`, which this change never writes to.

## Open Questions

None. Every question raised during the proposal was decided by the product owner and is recorded under Decisions or Non-Goals.
