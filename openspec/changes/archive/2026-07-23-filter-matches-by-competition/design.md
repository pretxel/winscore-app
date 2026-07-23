## Context

The matches page fetches via `supabase.from("matches").select("*").order("kickoff_at")` without a `competition_id` filter. The RLS policy is `using (true)` for select (public read), so the `x-league` header doesn't scope matches. This means every competition's matches page shows ALL matches from ALL competitions.

The server client is already scoped with the league slug via the `x-league` header, and `getLeagueFromContext` resolves the competition. Adding `.eq("competition_id", activeCompetition.id)` is a one-line fix.

## Goals / Non-Goals

**Goals:**
- Scope match queries to the current competition

**Non-Goals:**
- Changing RLS policies on the matches table
- Adding filters to other pages

## Decisions

**Application-level filter over RLS.** Adding `.eq("competition_id", ...)` is simpler and more explicit than modifying the auth-agnostic RLS policy. The competition ID is already resolved from the route slug.

## Risks / Trade-offs

- No risk — this is a bug fix. Matches were incorrectly showing cross-competition data.
