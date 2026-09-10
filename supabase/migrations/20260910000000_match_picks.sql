-- ===========================================================================
-- Everyone's picks for a locked match
-- ---------------------------------------------------------------------------
-- Once a match locks (kickoff passed, live, final, or cancelled), any signed-in
-- player can see how every other player predicted it. Before that a pick stays
-- private: nobody should be able to copy a friend's scoreline while picks are
-- still open. The predictions RLS only opens rows after the final, so this is
-- a security-definer function that enforces the lock itself, matching the
-- lockReason rule the app uses for the prediction form.
--
-- One row per submitted pick, with the scored points once the match is final.
-- Admin accounts are operators, not contestants, and are left out unless the
-- caller is the admin.
--
-- Rollback: drop function public.match_picks(uuid);
-- ===========================================================================

create or replace function public.match_picks(p_match_id uuid)
returns table (
  user_id uuid,
  display_name text,
  home_goals smallint,
  away_goals smallint,
  points smallint,
  hit_type text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.id as user_id,
    pr.display_name,
    p.home_goals,
    p.away_goals,
    s.points,
    s.hit_type
  from public.predictions p
  join public.profiles pr on pr.id = p.user_id
  left join public.scores s
    on s.user_id = p.user_id and s.match_id = p.match_id
  where p.match_id = p_match_id
    and auth.uid() is not null
    and (pr.is_admin = false or pr.id = auth.uid())
    and exists (
      select 1 from public.matches m
      where m.id = p_match_id
        and (m.kickoff_at <= now() or m.status in ('live', 'final', 'cancelled'))
    )
  order by
    s.points desc nulls last,
    pr.display_name asc nulls last,
    pr.id asc;
$$;

grant execute on function public.match_picks(uuid) to authenticated;
