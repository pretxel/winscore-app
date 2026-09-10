## ADDED Requirements

### Requirement: A phase ranking aggregates existing scores over the phase window

A phase ranking SHALL be computed by aggregating `public.scores` restricted to matches whose `kickoff_at` falls inside the phase's window. It SHALL NOT delete, rewrite, or recompute any score row, and SHALL NOT store a per-phase copy of any score. It SHALL return the same columns as the overall board — total points, exact hits, winner-with-goal-difference hits, winner hits, and rank — and SHALL break ties on total points descending, then exact hits descending, then winner-with-goal-difference hits descending, then earliest first submission. Admin accounts SHALL be excluded before ranks are assigned, so ranks remain contiguous.

#### Scenario: Phase ranking counts only that phase's matches
- **WHEN** a phase ranking is requested for a phase covering matchdays 1 to 4
- **THEN** only scores for matches whose kickoff falls in that window are aggregated
- **AND** scores from later matchdays are absent from the totals

#### Scenario: Scores are never modified
- **WHEN** any phase ranking is computed
- **THEN** no row in `scores` is inserted, updated, or deleted

#### Scenario: Phase ranking uses the overall board's columns and tie-breakers
- **WHEN** two players are level on points within a phase
- **THEN** the one with more exact hits ranks higher
- **AND** the row shape matches the overall board's

#### Scenario: Admins are absent and ranks stay contiguous
- **WHEN** a phase ranking is rendered for a competition whose players include an admin
- **THEN** the admin does not appear
- **AND** the remaining ranks run 1, 2, 3 with no gap

### Requirement: The overall ranking is unaffected by phases

The all-time ranking SHALL continue to aggregate every match of the competition regardless of phase, and SHALL be unchanged by the existence, editing, or closing of any phase.

#### Scenario: Overall board still sums every phase
- **WHEN** a competition has seven phases and four of them are closed
- **THEN** the overall board's totals equal the sum across all matches
- **AND** they match what the board showed before phases existed

### Requirement: A group phase ranking decides the phase winner

A phase ranking SHALL also be available scoped to a single friend group, ranking only that group's members over a phase of the group's own scheme. This group-scoped ranking SHALL be the one that determines the phase winner. Requesting a phase from a scheme the group does not use SHALL return no rows. It SHALL apply the same per-member join-date rule as the existing group board: a member SHALL be aggregated only over matches whose `kickoff_at` is on or after that member's own `joined_at`. It SHALL be visible only to members of the group.

#### Scenario: Only group members are ranked
- **WHEN** a member opens their group's phase board
- **THEN** only that group's members appear
- **AND** players outside the group are absent regardless of their score

#### Scenario: A mid-phase joiner scores only from their join date
- **WHEN** a member joined halfway through a phase
- **THEN** their phase total counts only matches that kicked off on or after they joined
- **AND** the board marks them as having joined mid-phase

#### Scenario: A non-member cannot read a group's phase board
- **WHEN** a signed-in user who is not a member requests a group's phase ranking
- **THEN** no rows are returned

#### Scenario: Different groups can have different winners for the same phase
- **WHEN** two groups on the same scheme both play the same phase
- **THEN** each group's ranking is computed over its own members
- **AND** each group has its own first-placed member

#### Scenario: A phase from another scheme returns nothing
- **WHEN** a member requests their group's board for a phase that belongs to a scheme the group did not choose
- **THEN** no rows are returned

### Requirement: A global phase board is available for the whole competition

A phase ranking across every non-admin player of the competition SHALL be available as a public surface, over the phases of the competition's default scheme. It SHALL be presentational only and SHALL NOT determine any winner.

#### Scenario: Global phase board ranks the whole competition
- **WHEN** a visitor opens the global board for a phase
- **THEN** every non-admin player of that competition is ranked over that phase's matches

#### Scenario: The winner is not read from the global board
- **WHEN** a phase is closed
- **THEN** the recorded winners are taken from each group's ranking, not from the global board

#### Scenario: Global board follows the default scheme
- **WHEN** a competition has two schemes and one is marked default
- **THEN** the global phase board offers only the default scheme's phases

### Requirement: A closed phase shows its recorded winner rather than a live standing

Once a phase is closed, the surface that presents its result SHALL show the winner recorded at close, labelled with the date the result was decided. The live standing for that phase MAY still be shown, but SHALL be clearly distinguished from the recorded result.

#### Scenario: Closed phase presents the recorded winner
- **WHEN** a member opens a group's board for a closed phase
- **THEN** the recorded winner is shown together with the date it was decided

#### Scenario: Open phase presents the live standing
- **WHEN** a member opens a group's board for an active phase
- **THEN** the current standing is shown
- **AND** it is labelled as provisional until the phase closes

### Requirement: Phase surfaces explain that phases follow real kickoff times

Any surface presenting a phase ranking SHALL make clear that a phase is defined by when matches actually kick off, so that a rescheduled fixture moving between phases is understandable rather than surprising.

#### Scenario: The phase board states its boundary rule
- **WHEN** a phase board is rendered
- **THEN** it states the window it covers and that fixtures are placed by their actual kickoff time
