-- Rollback:
-- drop function if exists public.check_round_close_shortening(uuid);
-- drop function if exists public.flag_rounds_for_shortening();

-- When a fixture kickoff changes, check if the wager round's effective close
-- needs shortening. Returns the new effective close if it changed, null otherwise.
create or replace function public.check_round_close_shortening(p_match_id uuid)
returns timestamptz
language plpgsql security definer
set search_path = public
as $$
declare
  v_round_id uuid;
  v_new_close timestamptz;
  v_current_open_close timestamptz;
begin
  select round_id into v_round_id from public.matches where id = p_match_id;
  if v_round_id is null then
    return null;
  end if;

  -- Compute the new effective close (earliest non-cancelled fixture)
  select min(m.kickoff_at) into v_new_close
  from public.matches m
  where m.round_id = v_round_id
    and m.status <> 'cancelled';

  if v_new_close is null then
    -- No eligible fixtures — flag for cancellation review
    update public.competition_rounds
    set provider_review_status = 'changed',
        provider_metadata = provider_metadata || jsonb_build_object(
          'shortening_candidate', true,
          'shortening_reason', 'no_eligible_fixtures',
          'shortening_checked_at', now()
        )
    where id = v_round_id;
    return null;
  end if;

  -- Check admin_closes_at vs new close
  select admin_closes_at into v_current_open_close
  from public.competition_rounds where id = v_round_id;

  -- Only flag if new close is strictly earlier than existing effective close
  if v_current_open_close is null or v_new_close < v_current_open_close then
    update public.competition_rounds
    set provider_review_status = 'changed',
        provider_metadata = provider_metadata || jsonb_build_object(
          'shortening_candidate', true,
          'shortening_reason', 'kickoff_moved_earlier',
          'new_effective_close', v_new_close,
          'shortening_checked_at', now()
        )
    where id = v_round_id;

    return v_new_close;
  end if;

  return null;
end;
$$;

-- Scan all active rounds and flag those whose earliest fixture kickoff
-- moved earlier than the recorded admin_closes_at. Intended for cron/job use.
create or replace function public.flag_rounds_for_shortening()
returns setof uuid
language plpgsql security definer
set search_path = public
as $$
declare
  r record;
  v_new_close timestamptz;
begin
  for r in
    select cr.id, cr.admin_closes_at
    from public.competition_rounds cr
    where cr.status in ('pending', 'active')
  loop
    select min(m.kickoff_at) into v_new_close
    from public.matches m
    where m.round_id = r.id
      and m.status <> 'cancelled';

    if v_new_close is not null
       and (r.admin_closes_at is null or v_new_close < r.admin_closes_at) then
      update public.competition_rounds
      set provider_review_status = 'changed',
          provider_metadata = provider_metadata || jsonb_build_object(
            'shortening_candidate', true,
            'shortening_reason', 'kickoff_moved_earlier',
            'new_effective_close', v_new_close,
            'shortening_checked_at', now()
          )
      where id = r.id;

      return next r.id;
    end if;
  end loop;
end;
$$;

revoke execute on function public.check_round_close_shortening(uuid) from public, anon;
revoke execute on function public.flag_rounds_for_shortening() from public, anon;
grant execute on function public.check_round_close_shortening(uuid) to authenticated;
grant execute on function public.flag_rounds_for_shortening() to authenticated;
