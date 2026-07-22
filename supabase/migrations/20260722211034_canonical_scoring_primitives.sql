-- Rollback:
-- drop function if exists public.score_prediction(int,int,int,int,int);
-- drop function if exists public.resolve_stage_multiplier(uuid,text);
-- Restore compute_match_scores from prior migration if needed.

-- Canonical prediction-scoring primitive.
-- Takes home/away picks, home/away results, and an integer multiplier.
-- Returns (points integer, hit_type text).
-- Rules: exact=5, winner_gd=3, winner=1, miss=0, all × multiplier.
-- This is the single source of truth for scoring — both normal play and wager
-- settlement MUST call this function rather than duplicating CASE expressions.
create or replace function public.score_prediction(
  p_home_pick int,
  p_away_pick int,
  p_home_result int,
  p_away_result int,
  p_multiplier int default 1
)
returns table (
  points int,
  hit_type text
)
language sql
immutable
security invoker
as $$
  select
    case
      when p_home_pick = p_home_result and p_away_pick = p_away_result then 5
      when sign(p_home_pick - p_away_pick) = sign(p_home_result - p_away_result)
           and (p_home_pick - p_away_pick) = (p_home_result - p_away_result) then 3
      when sign(p_home_pick - p_away_pick) = sign(p_home_result - p_away_result) then 1
      else 0
    end * p_multiplier,
    case
      when p_home_pick = p_home_result and p_away_pick = p_away_result then 'exact'
      when sign(p_home_pick - p_away_pick) = sign(p_home_result - p_away_result)
           and (p_home_pick - p_away_pick) = (p_home_result - p_away_result) then 'winner_gd'
      when sign(p_home_pick - p_away_pick) = sign(p_home_result - p_away_result) then 'winner'
      else 'miss'
    end;
$$;

-- Canonical stage-multiplier resolver.
-- Looks up `format_config.stages[].pointMultiplier` for the given stage key.
-- Falls back to the hardcoded STAGE_POINT_MULTIPLIER map.
-- Unknown/unmapped stages default to ×1 (never zero).
-- This is the single source of truth for multiplier resolution — both
-- compute_match_scores and wager settlement MUST call this function.
create or replace function public.resolve_stage_multiplier(
  p_competition_id uuid,
  p_stage_key text
)
returns int
language sql
stable
security invoker
as $$
  select coalesce(
    (
      select (s ->> 'pointMultiplier')::int
      from public.competitions c
      cross join lateral jsonb_array_elements(c.format_config -> 'stages') s
      where c.id = p_competition_id
        and s ->> 'key' = p_stage_key
        and (s ->> 'pointMultiplier') is not null
      limit 1
    ),
    case p_stage_key
      when 'group' then 1
      when 'r32'   then 2
      when 'r16'   then 4
      when 'qf'    then 6
      when 'sf'    then 8
      when 'final' then 10
      when 'third' then 4
      else 1
    end
  );
$$;

-- Grant to authenticated; both are immutable/stable reads (safe for RLS)
grant execute on function public.score_prediction(int,int,int,int,int) to authenticated;
grant execute on function public.resolve_stage_multiplier(uuid,text) to authenticated;
