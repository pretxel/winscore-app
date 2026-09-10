## ADDED Requirements

### Requirement: A competition offers named phase schemes

A competition SHALL support zero or more phase schemes. Each scheme SHALL belong to exactly one competition and SHALL carry a key unique within that competition and a localised label. At most one scheme per competition SHALL be marked as the default, which the global phase board uses. A competition with no schemes SHALL behave exactly as it does without this feature.

#### Scenario: A competition can offer several schemes
- **WHEN** a competition has a seven-phase scheme and a per-matchday scheme
- **THEN** both are offered to group owners at creation
- **AND** only the one marked default drives the global phase board

#### Scenario: A competition without schemes is unaffected
- **WHEN** a competition has no scheme rows
- **THEN** no phase surface is offered anywhere in the product
- **AND** the overall and group boards render exactly as before

#### Scenario: Only one default per competition
- **WHEN** an admin marks a second scheme as default
- **THEN** the previous default is cleared so exactly one remains

### Requirement: A scheme is divided into ordered phases

Each phase SHALL belong to exactly one scheme and SHALL carry a display order unique within that scheme, a localised label, and a `starts_at` timestamp. A phase SHALL NOT store its own end; the end of a phase SHALL be the `starts_at` of the next phase in display order within the same scheme, and the last phase SHALL run open-ended.

#### Scenario: Phases partition the scheme's timeline
- **WHEN** a scheme has phases ordered 1 through 7
- **THEN** phase 1 covers kickoffs from its own `starts_at` until phase 2's `starts_at`
- **AND** phase 7 covers every kickoff from its `starts_at` onward
- **AND** no kickoff time falls inside two phases of the same scheme

#### Scenario: Display order is unique per scheme
- **WHEN** an admin tries to save a phase whose display order is already used in that scheme
- **THEN** the save is refused and the existing phases are unchanged

### Requirement: A match belongs to the phase containing its kickoff

Within a scheme, a match SHALL belong to the phase whose window contains the match's current `kickoff_at`. Phase membership SHALL NOT be stored on the match and SHALL be derived at query time, so that a fixture rescheduled by the result sync moves between phases without any further action.

#### Scenario: A postponed fixture moves phase on its own
- **WHEN** a match's `kickoff_at` is reconciled to a date that falls in the following phase
- **THEN** the match's points count toward the following phase
- **AND** neither phase's stored definition changes

#### Scenario: A match before the first phase still counts somewhere
- **WHEN** a scheme's first phase starts at the competition's start
- **THEN** every played match falls inside exactly one phase of that scheme

### Requirement: Phases move through a lifecycle

A phase SHALL have a status of `pending`, `active`, or `closed`. A `pending` phase SHALL be fully editable. An `active` phase SHALL accept label edits but SHALL refuse changes to `starts_at`. A `closed` phase SHALL refuse all edits.

#### Scenario: Editing a pending phase's start is allowed
- **WHEN** an admin changes the `starts_at` of a phase whose status is `pending`
- **THEN** the change is saved
- **AND** the boundaries of the surrounding phases shift accordingly

#### Scenario: Editing a closed phase is refused
- **WHEN** an admin tries to change any field of a phase whose status is `closed`
- **THEN** the change is refused with an explanation that the phase's result is already decided

### Requirement: Closing a phase freezes its winners for every group on the scheme

Closing a phase SHALL record, for every group on that phase's scheme that existed at the time of closing, the member ranked first over that phase together with their points, exact hits, winner-with-goal-difference hits, winner hits, and the timestamp of the decision. Groups on another scheme or on no scheme SHALL NOT be touched. When members remain level after every tie-breaker, all of them SHALL be recorded as rank 1. Once a phase is closed, its recorded winners SHALL NOT change, even if a match result inside that phase is later corrected.

#### Scenario: Closing writes one winner per group on the scheme
- **WHEN** an admin closes a phase and three groups use its scheme while a fourth uses none
- **THEN** each of the three groups has a recorded winner for that phase
- **AND** the fourth group has no row

#### Scenario: A later result correction does not move the result
- **WHEN** an admin corrects a match result inside a phase that is already closed
- **THEN** the recorded winner for every group is unchanged
- **AND** the group page continues to show the recorded winner as the phase result

#### Scenario: An unbroken tie records both members
- **WHEN** two members of a group are level on points, exact hits, winner-with-goal-difference hits, and first submission time when a phase closes
- **THEN** both are recorded as rank 1 for that phase

#### Scenario: A group created after the close has no recorded winner
- **WHEN** a group on the scheme is created after a phase was closed
- **THEN** that phase shows no winner for the group
- **AND** the group page explains that the phase closed before the group existed

### Requirement: Admins manage schemes and phases from the competition editor

The admin competition editor SHALL provide a surface to list, create, and mark as default a competition's schemes, and within a scheme to list, create, reorder, and close its phases. The surface SHALL show each phase's derived window, its status, how many matches currently fall inside it, and how many groups use the scheme. It SHALL list any fixtures that changed phase since the previous view.

#### Scenario: Admin sees the derived window and adoption
- **WHEN** an admin opens the phases surface for a scheme
- **THEN** each phase row shows the date range it currently covers and the number of matches inside it
- **AND** the scheme shows how many groups have chosen it

#### Scenario: Admin is warned about fixtures that changed phase
- **WHEN** a fixture has moved to a different phase since the admin last viewed the surface
- **THEN** that fixture is listed with its old and new phase

#### Scenario: Non-admins cannot manage schemes or phases
- **WHEN** a signed-in non-admin requests the management surface or its actions
- **THEN** the request is refused and nothing is created, edited, or closed
