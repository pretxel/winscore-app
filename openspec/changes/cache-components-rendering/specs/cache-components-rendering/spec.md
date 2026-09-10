## ADDED Requirements

### Requirement: The app renders with Cache Components enabled

The application SHALL enable Cache Components so that Partial Prerendering is the rendering model. Every route's static shell SHALL be prerendered at build time, cached sections SHALL be included in that shell, and request-bound content SHALL stream behind Suspense boundaries.

#### Scenario: A public page ships a static shell
- **WHEN** a visitor requests the league catalog
- **THEN** the response begins with the prerendered shell before any request-time work completes
- **AND** the catalog content is served from cache rather than rendered per request

#### Scenario: Session-bound routes are unaffected
- **WHEN** a member requests their group page
- **THEN** the page renders per request exactly as before

### Requirement: Shared content is read through a cookie-free client

Cached loaders SHALL read through a public Supabase client that carries no cookies and runs as the anonymous role. Any data the anonymous role cannot read SHALL NOT be cached and SHALL stay on the session client.

#### Scenario: A cached loader never touches request cookies
- **WHEN** the catalog loader runs inside a cached function
- **THEN** it completes without reading `cookies()` or `headers()`

#### Scenario: Per-user data stays on the session client
- **WHEN** the leaderboard resolves the viewer's own row for the "you" highlight
- **THEN** that read uses the session client and is not cached

### Requirement: The site navigation does not make the shell dynamic

The site navigation SHALL render its static frame in the prerendered shell and SHALL resolve the viewer's session inside a Suspense boundary whose fallback is a same-sized placeholder.

#### Scenario: Shell renders before the session resolves
- **WHEN** any page is requested
- **THEN** the navigation frame is in the initial HTML
- **AND** the account slot streams in after the session check

#### Scenario: No layout shift when the avatar arrives
- **WHEN** the account slot resolves
- **THEN** the navigation's height and the position of its other controls are unchanged

### Requirement: Shared content uses the remote cache with tags and lifetimes

Every cached shared section SHALL use the remote cache variant, SHALL declare a lifetime, and SHALL carry the tags for the league or match it derives from. Tag names SHALL come from one shared module.

#### Scenario: A league-derived section carries the league tag
- **WHEN** the group tables for a league are cached
- **THEN** the entry is tagged `league:<slug>`

#### Scenario: A match-derived section carries both tags
- **WHEN** a match page's shared block is cached
- **THEN** the entry is tagged `match:<id>` and `league:<slug>`

#### Scenario: A live match has a short lifetime
- **WHEN** the shared block of a match whose status is live is cached
- **THEN** its lifetime is measured in minutes, not hours

### Requirement: Per-user content streams and is never cached

On every converted public page, the viewer's own picks, highlights, suggestions, reactions, and timezone-dependent grouping SHALL render inside Suspense boundaries at request time and SHALL NOT be written to any shared cache.

#### Scenario: Fixture list keeps personal markers per request
- **WHEN** a signed-in visitor opens the fixture list
- **THEN** the picked markers reflect their own picks
- **AND** the day grouping follows their timezone cookie
- **AND** the shared fixture data underneath came from the league cache

#### Scenario: Two visitors in different timezones share one cache entry
- **WHEN** two visitors with different `tz` cookies open the same league's fixtures
- **THEN** both are served from the same cached fixture data
- **AND** each sees days grouped by their own timezone

### Requirement: Writes invalidate the caches they change

Every write path that changes shared content SHALL invalidate the affected tags after committing: the result sync for each finalised, live-flipped, or rescheduled match and once per league; admin result edits; phase close and scheme edits; competition edits; and the news sync.

#### Scenario: A synced result reaches the public pages
- **WHEN** the result sync writes a final score for a match
- **THEN** `match:<id>` and its `league:<slug>` are invalidated
- **AND** the next request for the match page or the leaderboard reflects the result

#### Scenario: An admin edit is visible on the confirmation page
- **WHEN** an admin saves a corrected result
- **THEN** the tags are updated immediately so the page the admin lands on shows the correction

#### Scenario: Closing a phase refreshes the boards
- **WHEN** a phase is closed
- **THEN** `league:<slug>` is invalidated

### Requirement: No cached section depends on the current time or randomness

Cached sections SHALL NOT read the clock or random values. Anything that must vary per request SHALL defer to request time and render behind Suspense.

#### Scenario: Countdowns stay client-side
- **WHEN** a fixture list is served from cache
- **THEN** the closing-soon countdowns compute the remaining time in the browser, not in the cached markup

### Requirement: Each phase is measured before the next begins

Each delivery phase SHALL record production time-to-first-byte and payload size for its pages before and after, using the same method, and SHALL NOT proceed while any page regressed or served stale content after a write.

#### Scenario: A phase that regresses does not merge
- **WHEN** a converted page's production measurement is slower than before
- **THEN** the phase is held until the cause is found and fixed
