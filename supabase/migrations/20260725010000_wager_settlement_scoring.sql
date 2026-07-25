-- Canonical scoring for wagered entries.
--
-- 20260722211034 states that wager settlement MUST call score_prediction and
-- resolve_stage_multiplier rather than duplicating the CASE expressions. The
-- settlement manifest builder was scoring picks in TypeScript with hardcoded
-- 5/3/1 points and no stage multiplier, so a wagered standing could diverge
-- from the free standing on any round outside the group stage.
--
-- This function is the single entry point settlement uses to score and rank the
-- confirmed entries of a wager round. It reads the immutable snapshot in
-- wager_entry_predictions (never public.predictions), so a later edit to a
-- user's free picks cannot change a settled result.
--
-- Tie-break is the canonical order used elsewhere: total points, then exact
-- hits, then winner+GD hits, then the earliest source submission.
--
-- Rollback:
-- drop function if exists public.score_wager_round_entries(uuid);

create or replace function public.score_wager_round_entries(p_wager_round_id uuid)
returns table (
  entry_id uuid,
  user_id uuid,
  wallet_address bytea,
  total_points int,
  exact_hits int,
  winner_gd_hits int,
  winner_hits int,
  first_submit timestamptz,
  rank int
)
language sql
stable
security definer
set search_path = public
as $$
  with round as (
    select wr.id, wr.round_id
    from public.wager_rounds wr
    where wr.id = p_wager_round_id
  ),
  -- Only entries that actually hold a confirmed or locked stake participate.
  -- Cancelled/refunded entries are out; already-settled ones are included so
  -- that re-deriving a manifest for an audit reproduces the same ranking.
  entries as (
    select e.id, e.user_id, e.wallet_address, e.intent_id
    from public.wager_entries e
    join round r on r.id = e.wager_round_id
    where e.state in ('confirmed', 'locked', 'settled')
  ),
  -- Score each snapshot pick against its final fixture, via the canonical
  -- primitives. Non-final or unscored fixtures contribute nothing.
  scored as (
    select
      e.id as entry_id,
      e.user_id,
      e.wallet_address,
      p.source_submitted_at,
      sp.points,
      sp.hit_type
    from entries e
    join public.wager_entry_predictions p on p.intent_id = e.intent_id
    join public.matches m on m.id = p.match_id
    join round r on r.round_id = m.round_id
    cross join lateral public.score_prediction(
      p.home_goals,
      p.away_goals,
      m.home_score,
      m.away_score,
      public.resolve_stage_multiplier(m.competition_id, m.stage)
    ) sp
    where m.status = 'final'
      and m.home_score is not null
      and m.away_score is not null
  ),
  totals as (
    select
      e.id as entry_id,
      e.user_id,
      e.wallet_address,
      coalesce(sum(s.points), 0)::int as total_points,
      coalesce(count(*) filter (where s.hit_type = 'exact'), 0)::int as exact_hits,
      coalesce(count(*) filter (where s.hit_type = 'winner_gd'), 0)::int as winner_gd_hits,
      coalesce(count(*) filter (where s.hit_type = 'winner'), 0)::int as winner_hits,
      min(s.source_submitted_at) as first_submit
    from entries e
    left join scored s on s.entry_id = e.id
    group by e.id, e.user_id, e.wallet_address
  )
  select
    t.entry_id,
    t.user_id,
    t.wallet_address,
    t.total_points,
    t.exact_hits,
    t.winner_gd_hits,
    t.winner_hits,
    t.first_submit,
    rank() over (
      order by
        t.total_points desc,
        t.exact_hits desc,
        t.winner_gd_hits desc,
        t.first_submit asc nulls last
    )::int as rank
  from totals t
  order by rank, t.first_submit nulls last;
$$;

-- Settlement runs server-side under the service role. Entrants read their own
-- standing through the settlement manifest, not by calling this directly.
revoke all on function public.score_wager_round_entries(uuid) from public, anon, authenticated;
grant execute on function public.score_wager_round_entries(uuid) to service_role;
