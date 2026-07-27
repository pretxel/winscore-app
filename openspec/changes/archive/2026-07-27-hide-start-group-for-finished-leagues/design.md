## Context

`listLiveLeagues()` in `lib/competition.ts` selects
`status in ('active', 'finished')` and is consumed by five call sites with two
incompatible intents:

| Call site | Wants finished leagues? |
| --- | --- |
| `groups/page.tsx` → create-pool picker | **no** — `create_group()` rejects them |
| `catalog/page.tsx` | yes — browsing past leagues is the point |
| `admin/quiz/page.tsx` | yes — admins manage finished leagues |
| `cron/for-each-league.ts` | yes — a finished league still syncs results |
| `tournament-countdown.tsx` | yes — "is any league live" check |

Only the first is wrong, and it is the one the spec already constrains. The
helper's name is also misleading: "live" reads as active, but the function
deliberately includes finished.

`create_group()` already enforces the rule server-side, raising
`'league is not active'`. `createGroupAction` collapses every RPC error to
`{ error: "errorGeneric" }`, so the user sees a generic failure after filling in
the form.

## Goals / Non-Goals

**Goals:**

- A finished league is never offered as a place to start a pool.
- The "Start a group" affordance is absent wherever it would lead to a league
  that cannot accept pools.
- If an admin finishes a league between page render and form submit, the user
  gets an explanatory message, not a generic error.
- The four call sites that legitimately want finished leagues keep working
  unchanged.

**Non-Goals:**

- Changing `create_group()`. Its guard is correct and is the real enforcement
  point; the UI change is about not offering an action that will fail.
- Hiding or archiving finished leagues anywhere else — the catalog, crons, and
  admin surfaces keep seeing them.
- Preventing access to existing pools in a finished league. Those stay readable;
  only *creating* is gated.
- Adding a "league finished" empty state to the groups page beyond the existing
  `noLiveLeagues` message.

## Decisions

**Split the helper rather than filter at each call site.**
Add `listStartableLeagues()` returning `status = 'active'` only, and keep the
existing broader list for browsing. Filtering inline at the picker would work but
leaves the next caller free to make the same mistake; a named function encodes
which question is being asked. The existing function is renamed to
`listCatalogLeagues()` so neither name implies the other's semantics — "live" is
what caused the confusion.

**Derive the lane's affordance from the competition status, not from the pools.**
`LeaguePools` gains `status`. A lane for a finished league still renders — the
user's pools there are still theirs to open — but its "Start a group" link is
omitted. Hiding the whole lane would lose access to existing pools.

**Hide, do not disable.**
A disabled button that explains itself on hover is worse here than absence: there
is no action to recover, and the league simply is over. The catalog remains the
place to see finished leagues.

**Map the RPC rejection by message, and treat it as a narrow addition.**
`createGroupAction` gains one branch: when the error text matches the not-active
rejection, return a specific key; everything else stays `errorGeneric`. Matching
on a Postgres error string is brittle in general, but the alternative — a custom
`SQLSTATE` — means a migration to change a function that is otherwise correct.
The branch fails safe: if the message ever changes, the user gets the generic
error, which is today's behavior.

**Keep the server-side guard as the source of truth.**
Every UI change here is advisory. The race is real (an admin can finish a league
while a form is open) and the database is what actually prevents a pool from
being created in a finished league.

## Risks / Trade-offs

**Renaming `listLiveLeagues` touches five call sites** → All five are in-repo and
type-checked; the compiler finds every one. The rename is what prevents a future
caller from reaching for the wrong list, which is the bug being fixed.

**Error-string matching could silently stop working** → It degrades to the
current generic error rather than breaking the flow, and the spec scenario covers
the behavior so a regression is visible in tests rather than only in production.

**A user viewing a stale page still sees "Start a group"** → Unavoidable without
polling. The server guard rejects the submit and, with this change, explains why.

## Migration Plan

Pure application change: no migration, no data change, no env vars. Deploy with
the next release; revert the commit to roll back. Because no competition is
`finished` today, the change is behaviorally inert until the first league
finishes — which also makes it safe to ship ahead of need.

## Open Questions

None. Each call site's intent was confirmed by reading it.
