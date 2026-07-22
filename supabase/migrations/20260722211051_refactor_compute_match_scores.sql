-- Rollback: restore previous compute_match_scores definition from
-- 20260716000000_liga_mx_tie_key_leg.sql

-- Refactor compute_match_scores to call the shared canonical primitives
-- (score_prediction and resolve_stage_multiplier) instead of duplicating
-- CASE expressions. The output (scores table contents) and idempotent
-- result-update behavior are unchanged.
create or replace function public.compute_match_scores(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  v_mult int;
  v_pred record;
  v_points int;
  v_hit_type text;
begin
  -- Always clear existing scores for this match first.
  delete from public.scores where match_id = p_match_id;

  select id, home_score, away_score, status, stage, competition_id
    into m
  from public.matches
  where id = p_match_id;

  -- If the match doesn't exist, isn't final, or has no scores, leave scores empty.
  if m is null then
    return;
  end if;
  if m.status <> 'final' or m.home_score is null or m.away_score is null then
    return;
  end if;

  -- Resolve multiplier from the canonical function
  v_mult := public.resolve_stage_multiplier(m.competition_id, m.stage);

  -- Score each prediction via the canonical primitive, inserting one row at a time.
  for v_pred in
    select p.user_id, p.match_id, p.home_goals, p.away_goals
    from public.predictions p
    where p.match_id = p_match_id
  loop
    select sp.points, sp.hit_type
    into v_points, v_hit_type
    from public.score_prediction(
      v_pred.home_goals,
      v_pred.away_goals,
      m.home_score,
      m.away_score,
      v_mult
    ) sp;

    insert into public.scores (user_id, match_id, points, hit_type, computed_at)
    values (v_pred.user_id, v_pred.match_id, v_points, v_hit_type, now());
  end loop;
end;
$$;

grant execute on function public.compute_match_scores(uuid) to authenticated;
