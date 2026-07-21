-- ---------------------------------------------------------------------------
-- Pools: create in a chosen live league
--
-- A pool (group) becomes explicitly league-scoped at creation. create_group
-- gains an optional target competition; the resolved league MUST be live.
-- Backward-compatible: omitting the competition falls back to the (still) active
-- competition, which is_live after the concurrent-leagues backfill, so existing
-- callers keep working during the transition.
--
-- Down (manual): restore the single-arg create_group(p_name text) from
-- 20260614000300_groups_competition_scope.sql.
-- ---------------------------------------------------------------------------

create or replace function public.create_group(
  p_name text,
  p_competition_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_group_id uuid;
  v_code text;
  v_attempts int := 0;
  v_name text := btrim(coalesce(p_name, ''));
  v_competition_id uuid := coalesce(p_competition_id, public.active_competition_id());
  v_is_live boolean;
  v_prefix text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    raise exception 'group name must be between 2 and 40 characters';
  end if;
  if v_competition_id is null then
    raise exception 'no league selected';
  end if;

  select is_live, coalesce(branding ->> 'joinCodePrefix', 'WC')
    into v_is_live, v_prefix
  from public.competitions where id = v_competition_id;

  if v_is_live is null then
    raise exception 'league % does not exist', v_competition_id;
  end if;
  if not v_is_live then
    raise exception 'league is not live';
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_code := public.generate_join_code(v_prefix);
    begin
      insert into public.groups (name, owner_id, join_code, competition_id)
      values (v_name, v_uid, v_code, v_competition_id)
      returning id into v_group_id;
      exit;
    exception when unique_violation then
      if v_attempts >= 10 then
        raise exception 'could not generate a unique join code';
      end if;
    end;
  end loop;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_uid, 'owner');

  return v_group_id;
end;
$$;
