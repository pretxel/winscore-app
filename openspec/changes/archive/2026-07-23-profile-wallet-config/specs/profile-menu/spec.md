## ADDED Requirements

### Requirement: Profile menu links to the profile page

The profile menu (UserMenu) SHALL include an entry point linking to the authenticated profile page at `/[locale]/profile`, with a localized label.

#### Scenario: Profile link present for a signed-in user
- **WHEN** a signed-in user opens the profile menu
- **THEN** a "Profile" (account) entry linking to `/[locale]/profile` is present
- **AND** its label is localized for the active locale
