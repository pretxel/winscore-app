## REMOVED Requirements

### Requirement: Matches page offers a team filter control

**Reason**: The team filter unnecessarily complicates the matches page. Each competition has its own dedicated page, and the filter adds visual noise without proportional utility.

**Migration**: Users who bookmarked filtered URLs (e.g., `?team=América`) will see the full unfiltered list. The `team` query parameter will be silently ignored.

### Requirement: Selecting teams filters the match list

**Reason**: Removed alongside the team filter UI — no filter exists to drive this behavior.

**Migration**: The `filterableTeams`, `matchInvolvesTeam`, `parseTeamParam`, and `reconcileSelectedTeams` utility functions will be removed if no other consumers exist.

## MODIFIED Requirements

### Requirement: Active filter is encoded in the URL

The active status filter selection and needs-pick toggle SHALL be reflected in the page URL as `status` and `picks` query parameters so the filtered view is shareable and survives reload and browser back/forward navigation. On load, the server SHALL read these parameters, ignore unknown values, and render the corresponding filtered list. Updating the selection SHALL preserve the locale path prefix and any unrelated query parameters.

#### Scenario: Selection writes the URL
- **WHEN** the user activates the "Live" stat card on `/matches`
- **THEN** the URL updates to include `status=live` (preserving the locale prefix)

#### Scenario: Filtered URL renders filtered list on load
- **WHEN** a user opens `/matches?status=final` directly
- **THEN** the server renders only final-status matches

#### Scenario: Unknown param value ignored
- **WHEN** a user opens `/matches?status=banana&team=Atlantis`
- **THEN** the page does not error
- **AND** the full unfiltered list is rendered (no valid filter selected)

#### Scenario: Clearing selection clears the param
- **WHEN** the user deactivates the "Final" stat card while `status=final` is in the URL
- **THEN** the `status` parameter is removed from the URL

### Requirement: Status filter via interactive header stats

The `/matches` page SHALL let the user filter the match list by status — `upcoming`, `live`, or `final` — by activating the corresponding header stat card, which SHALL behave as a single-select toggle (`aria-pressed` button). The active status SHALL be encoded as a `status` query parameter; activating the active card again SHALL clear the filter and remove the parameter. Unknown `status` values SHALL be ignored, rendering the unfiltered set.

#### Scenario: Select live
- **WHEN** the user activates the "Live" stat card
- **THEN** the URL gains `status=live` and only matches with live status render
- **AND** the "Live" card is shown active (`aria-pressed="true"`)

#### Scenario: Toggle off
- **WHEN** `status=final` is active and the user activates the "Final" card again
- **THEN** the `status` parameter is removed and all statuses render

#### Scenario: Switch selection
- **WHEN** `status=live` is active and the user activates "Upcoming"
- **THEN** the URL parameter becomes `status=upcoming` (single-select, not additive)

#### Scenario: Unknown status ignored
- **WHEN** a user opens `/matches?status=banana`
- **THEN** the page does not error and no status filter is applied

### Requirement: Needs-pick filter for signed-in users

For signed-in users, the `/matches` page SHALL offer a "needs my pick" toggle that filters the list to matches the user has not predicted AND that are still open for picks (scheduled and unlocked). The toggle SHALL display a count of such matches. The active state SHALL be encoded as `picks=needed` in the URL. The control SHALL NOT render for anonymous visitors, and a `picks` parameter on an anonymous request SHALL be ignored. The filter SHALL compose with the status filter.

#### Scenario: Filter to unpicked open matches
- **WHEN** a signed-in user with 3 unpicked open matches activates the needs-pick toggle
- **THEN** the URL gains `picks=needed` and exactly those 3 matches render

#### Scenario: Hidden for anonymous visitors
- **WHEN** an anonymous visitor views `/matches`
- **THEN** no needs-pick control is rendered

#### Scenario: Anonymous request with picks param
- **WHEN** an anonymous visitor opens `/matches?picks=needed`
- **THEN** the page does not error and the parameter is ignored (unfiltered by picks)

#### Scenario: Locked unpicked match excluded
- **WHEN** a signed-in user has not picked a match whose pick deadline has passed
- **THEN** that match is not included in the needs-pick filtered set or count

### Requirement: Header stats and day counts reflect the filtered set

The header stat cards SHALL display three buckets — `upcoming` (scheduled plus locked), `live`, and `final` — whose counts sum to the total of the visible match list (cancelled matches excepted). Each matchday's match-count label SHALL be computed from the fully filtered list, so the displayed totals always match the rows shown for the current selection.

#### Scenario: Locked matches count as upcoming
- **WHEN** the visible list contains 4 scheduled, 2 locked, 1 live, and 3 final matches
- **THEN** the upcoming stat reads 6, live reads 1, final reads 3

#### Scenario: Stats stable under status selection
- **WHEN** the user activates the "Final" stat card
- **THEN** the three stat counts do not change (they reflect the pre-status-filter distribution)

### Requirement: Filter-aware empty state

When any filter (status or needs-pick) is active and no fixture matches the combined selection, the page SHALL render an empty state that communicates the selection matched no fixtures and offers a way to clear all active filters. This SHALL be distinct from the empty state shown when the schedule itself contains no matches.

#### Scenario: No fixtures for combined selection
- **WHEN** filters are active and no fixture satisfies them
- **THEN** a "no matches for the current filters" empty state is rendered with a clear-filters affordance
- **AND** the generic "no matches scheduled" copy is not shown

#### Scenario: Clear removes all filter params
- **WHEN** the user activates the clear-filter affordance while `status` and `picks` parameters are present
- **THEN** all parameters are removed and the full list renders

### Requirement: Filter UI strings are localized

All user-facing strings introduced by the match list filters (stat card labels including "upcoming", needs-pick toggle label and count, filtered empty state, clear-filter affordance) SHALL be provided through the existing `matches` i18n namespace and resolved for the active locale, with entries present in every supported locale message file.

#### Scenario: Localized label in each locale
- **WHEN** the matches page is rendered in `en`, `es`, and `fr`
- **THEN** the filter control labels, stat card labels, and needs-pick toggle render localized text from that locale's `matches` namespace (no missing-key fallback)
