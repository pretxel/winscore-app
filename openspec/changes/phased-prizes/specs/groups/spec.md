## ADDED Requirements

### Requirement: Group creation chooses a phase scheme

When the group's competition offers at least one phase scheme, the create-group form SHALL let the owner choose a scheme or "no phases". "No phases" SHALL be preselected. When the competition offers no schemes, the form SHALL not show the choice and SHALL behave exactly as before. The chosen scheme SHALL be stored on the group.

#### Scenario: Owner picks a scheme at creation
- **WHEN** an owner creates a group in a competition with a seven-phase scheme and selects it
- **THEN** the group is created with that scheme
- **AND** the group page offers that scheme's phases

#### Scenario: No phases is the default
- **WHEN** an owner creates a group without touching the scheme choice
- **THEN** the group is created with no scheme
- **AND** the group page renders exactly as it did before schemes existed

#### Scenario: No choice shown without schemes
- **WHEN** an owner creates a group in a competition that offers no schemes
- **THEN** the form shows no scheme choice

### Requirement: A group's scheme is locked after creation

Once a group exists, its scheme SHALL NOT be changed by its owner, members, or the join flow. Any attempt SHALL be refused. A group that wants a different scheme is a new group.

#### Scenario: Owner cannot change the scheme later
- **WHEN** the owner of an existing group tries to set a different scheme
- **THEN** the request is refused and the group's scheme is unchanged

#### Scenario: Joining does not alter the scheme
- **WHEN** a player joins a group by code
- **THEN** the group's scheme is unchanged

### Requirement: The group page offers a phase board over the group's scheme

When a group has a scheme, the group page SHALL let a member switch its mini board between the all-time ranking and a single phase of that scheme. The all-time board SHALL remain the default. When the group has no scheme, no switcher SHALL appear and the page SHALL render exactly as before.

#### Scenario: Member switches the mini board to a phase
- **WHEN** a member selects a phase on their group page
- **THEN** the mini board ranks the group's members over that phase's matches only
- **AND** the row shape matches the all-time mini board

#### Scenario: All-time remains the default view
- **WHEN** a member opens their group page without choosing a phase
- **THEN** the all-time mini board is shown

#### Scenario: No switcher without a scheme
- **WHEN** a member opens a group that has no scheme
- **THEN** no phase switcher is rendered

### Requirement: The group page names the current phase and when it closes

When the group's scheme has an active phase, the group page SHALL name that phase and state when it closes, so members know what they are currently competing for.

#### Scenario: Active phase is named with its deadline
- **WHEN** a member opens a group page during an active phase of the group's scheme
- **THEN** the page names the phase and shows the date it closes

#### Scenario: No active phase
- **WHEN** every phase of the group's scheme is closed
- **THEN** the page shows no active-phase prompt

### Requirement: The group page shows who won each closed phase

For every closed phase of the group's scheme, the group page SHALL show the member recorded as that group's winner, together with the date the result was decided. When a phase closed before the group existed, the page SHALL say so rather than showing an empty result. When the recorded result is a tie, every tied member SHALL be shown.

#### Scenario: A closed phase shows its winner
- **WHEN** a member opens a group page after a phase of its scheme has closed
- **THEN** the recorded winner for that group is named
- **AND** the date the result was decided is shown

#### Scenario: A phase that closed before the group existed
- **WHEN** a group was created after a phase of its scheme closed
- **THEN** that phase shows an explanation instead of a winner

#### Scenario: A recorded tie names every tied member
- **WHEN** the recorded result for a phase has two members at rank 1
- **THEN** both are shown as joint winners

### Requirement: The group page summarises phases won across the season

When a group has a scheme, the group page SHALL show a season summary with one row per member and one column per closed phase of the scheme, marking the recorded winner of each phase and totalling each member's phases won. Joint winners SHALL each be marked for that phase. The summary SHALL read only from recorded winners and SHALL be absent until at least one phase has closed.

#### Scenario: Summary lists closed phases only
- **WHEN** a scheme has seven phases and two are closed
- **THEN** the summary shows two phase columns
- **AND** each member's total counts only those two

#### Scenario: Joint winners each get the mark
- **WHEN** a closed phase recorded two members at rank 1
- **THEN** both are marked as winners of that phase in the summary

#### Scenario: No summary before the first close
- **WHEN** no phase of the group's scheme has closed yet
- **THEN** the summary is not rendered

#### Scenario: Any past phase remains browsable
- **WHEN** a member selects a closed phase in the switcher
- **THEN** that phase's recorded winner and its standing are shown

### Requirement: The phase board marks members who joined mid-phase

The group phase board SHALL mark any member whose `joined_at` falls inside the selected phase, so that a lower total explained by a late join is visible rather than mistaken for poor form.

#### Scenario: A late joiner is marked on the phase board
- **WHEN** a member joined after the selected phase began
- **THEN** their row is marked as having joined mid-phase

#### Scenario: A member present for the whole phase is not marked
- **WHEN** a member joined before the selected phase began
- **THEN** their row carries no late-join marker
