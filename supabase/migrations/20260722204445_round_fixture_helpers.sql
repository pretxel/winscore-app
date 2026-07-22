-- Rollback:
-- drop function if exists public.round_eligible_fixtures(uuid);
-- drop function if exists public.round_effective_close(uuid);
-- drop function if exists public.round_can_accept_wager(uuid);

-- Return eligible fixtures for a round: assigned, not cancelled, ordered by kickoff
create or replace function public.round_eligible_fixtures(p_round_id uuid)
returns table (
  match_id uuid,
  home_team text,
  away_team text,
  kickoff_at timestamptz,
  stage text,
  group_code text,
  status text
)
language sql stable security definer
set search_path = public
as $$
  select
    m.id,
    m.home_team,
    m.away_team,
    m.kickoff_at,
    m.stage,
    m.group_code,
    m.status
  from public.matches m
  where m.round_id = p_round_id
    and m.status <> 'cancelled'
  order by m.kickoff_at asc;
$$;

-- Compute the effective close time for a wager round.
-- Uses the database clock and excludes cancelled fixtures.
-- Returns the earlier of admin_closes_at or the earliest eligible fixture kickoff.
create or replace function public.round_effective_close(p_round_id uuid)
returns timestamptz
language sql stable security definer
set search_path = public
as $$
  select least(
    cr.admin_closes_at,
    (
      select min(m.kickoff_at)
      from public.matches m
      where m.round_id = p_round_id
        and m.status <> 'cancelled'
    )
  )
  from public.competition_rounds cr
  where cr.id = p_round_id;
$$;

-- Check whether a round can accept wager initialization or entry.
-- Requires at least one eligible fixture assigned.
create or replace function public.round_can_accept_wager(p_round_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches m
    where m.round_id = p_round_id
      and m.status <> 'cancelled'
  );
$$;

-- Revoke public execution; grant to authenticated
revoke execute on function public.round_eligible_fixtures(uuid) from public, anon;
revoke execute on function public.round_effective_close(uuid) from public, anon;
revoke execute on function public.round_can_accept_wager(uuid) from public, anon;

grant execute on function public.round_eligible_fixtures(uuid) to authenticated;
grant execute on function public.round_effective_close(uuid) to authenticated;
grant execute on function public.round_can_accept_wager(uuid) to authenticated;
