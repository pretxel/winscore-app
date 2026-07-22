## ADDED Requirements

### Requirement: Finish and restart actions in competitions list

The admin competitions list SHALL display a "Finish" action for live, non-finished competitions and a "Restart" action for finished competitions. Both actions MUST be confirmation-gated using the existing `SubmitButton confirmText` pattern, and MUST invoke the `finish_league` / `restart_league` RPC functions via admin Server Actions.

#### Scenario: Admin finishes a live league from the list
- **WHEN** an admin clicks "Finish" on a live competition row and confirms the dialog
- **THEN** the `finish_league` RPC is called
- **AND** the list revalidates, now showing the "Finished" badge on that row
- **AND** the "Finish" button is replaced by "Restart"

#### Scenario: Admin restarts a finished league from the list
- **WHEN** an admin clicks "Restart" on a finished competition row and confirms
- **THEN** the `restart_league` RPC is called
- **AND** the finished badge is removed
- **AND** the "Restart" button is replaced by "Finish"

### Requirement: Finished badge in competitions list

The admin competitions list SHALL display a "Finished" badge next to the existing ACTIVE and MANAGED badges for any competition with a non-null `finished_at`. The badge SHALL use a distinct visual style (outline variant, muted tone) to differentiate from the active/live states.

#### Scenario: Finished league shows badge
- **WHEN** a competition has `finished_at` set
- **THEN** the admin list row displays a "Finished" badge
- **AND** the badge does not appear for non-finished competitions
