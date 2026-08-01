-- ===========================================================================
-- Server-side rate limiting for wager operations
-- ---------------------------------------------------------------------------
-- lib/wager/rate-limits.ts counted rows in wager_chain_events, which cannot
-- work: that table's event_type CHECK only accepts the eight on-chain event
-- names, so 'wallet_challenge', 'wager_intent', 'wager_init' and friends could
-- never be stored there, the count was always 0, and every limit silently
-- allowed everything. There was also no writer at all, so nothing incremented.
--
-- This gives the limiter its own append-only ledger. One row per attempt,
-- written before the work is done, so a request that fails still consumes
-- budget and a retry loop cannot be used to bypass the window.
--
-- Service-role only: RLS is enabled with no policies, matching the posture of
-- announcement_email_log and winners_email_log. End users must never read
-- another user's attempt history or forge their own.
-- ===========================================================================

create table public.wager_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  operation text not null,
  observed_at timestamptz not null default now()
);

alter table public.wager_rate_limit_events enable row level security;

-- The limiter always queries (user_id, operation) over a trailing time window,
-- so lead with those and keep observed_at as the range column.
create index wager_rate_limit_events_lookup_idx
  on public.wager_rate_limit_events (user_id, operation, observed_at desc);

-- Lets a maintenance job prune the whole table by age without touching the
-- lookup index.
create index wager_rate_limit_events_observed_idx
  on public.wager_rate_limit_events (observed_at);
