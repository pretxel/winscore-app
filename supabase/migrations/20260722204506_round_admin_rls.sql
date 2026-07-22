-- Rollback:
-- drop function if exists public.create_competition_round(uuid,text,timestamptz,int,jsonb,int,timestamptz,text,jsonb);
-- drop function if exists public.update_competition_round(uuid,text,int,jsonb,int,timestamptz,timestamptz,text,jsonb,text);
-- drop function if exists public.assign_fixture_to_round(uuid,uuid);
-- drop function if exists public.unassign_fixture_from_round(uuid);
-- drop function if exists public.mark_round_reviewed(uuid,text);
-- drop function if exists public.close_round(uuid);

-- Create a competition round (admin only)
create or replace function public.create_competition_round(
  p_competition_id uuid,
  p_round_key text,
  p_opens_at timestamptz,
  p_round_number int default null,
  p_labels jsonb default '{}'::jsonb,
  p_display_order int default 0,
  p_admin_closes_at timestamptz default null,
  p_status text default 'pending',
  p_provider_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_round_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can create competition rounds';
  end if;

  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata
  ) values (
    p_competition_id, p_round_key, p_round_number, p_labels, p_display_order,
    p_opens_at, p_admin_closes_at, p_status, p_provider_metadata
  )
  returning id into v_round_id;

  return v_round_id;
end;
$$;

-- Update a competition round (admin only)
create or replace function public.update_competition_round(
  p_round_id uuid,
  p_round_key text default null,
  p_round_number int default null,
  p_labels jsonb default null,
  p_display_order int default null,
  p_opens_at timestamptz default null,
  p_admin_closes_at timestamptz default null,
  p_status text default null,
  p_provider_metadata jsonb default null,
  p_provider_review_status text default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can update competition rounds';
  end if;

  update public.competition_rounds
  set
    round_key = coalesce(p_round_key, round_key),
    round_number = coalesce(p_round_number, round_number),
    labels = coalesce(p_labels, labels),
    display_order = coalesce(p_display_order, display_order),
    opens_at = coalesce(p_opens_at, opens_at),
    admin_closes_at = coalesce(p_admin_closes_at, admin_closes_at),
    status = coalesce(p_status, status),
    provider_metadata = coalesce(p_provider_metadata, provider_metadata),
    provider_review_status = coalesce(p_provider_review_status, provider_review_status)
  where id = p_round_id;
end;
$$;

-- Assign a fixture (match) to a round; validates same competition
create or replace function public.assign_fixture_to_round(
  p_match_id uuid,
  p_round_id uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_round_competition_id uuid;
  v_match_competition_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can assign fixtures to rounds';
  end if;

  select competition_id into v_round_competition_id
  from public.competition_rounds where id = p_round_id;

  select competition_id into v_match_competition_id
  from public.matches where id = p_match_id;

  if v_round_competition_id is null then
    raise exception 'Round not found: %', p_round_id;
  end if;

  if v_match_competition_id is null then
    raise exception 'Match not found: %', p_match_id;
  end if;

  if v_round_competition_id <> v_match_competition_id then
    raise exception 'Cross-competition assignment denied: round competition % does not match match competition %',
      v_round_competition_id, v_match_competition_id;
  end if;

  update public.matches
  set round_id = p_round_id
  where id = p_match_id;
end;
$$;

-- Unassign a fixture from its round
create or replace function public.unassign_fixture_from_round(
  p_match_id uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can unassign fixtures from rounds';
  end if;

  update public.matches
  set round_id = null
  where id = p_match_id;
end;
$$;

-- Mark a round as reviewed (admin only, records reviewer)
create or replace function public.mark_round_reviewed(
  p_round_id uuid,
  p_provider_review_status text default 'reviewed'
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can mark rounds as reviewed';
  end if;

  update public.competition_rounds
  set
    provider_review_status = p_provider_review_status,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_round_id;
end;
$$;

-- Close a round (admin only, transitions to 'closed' status)
create or replace function public.close_round(
  p_round_id uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can close rounds';
  end if;

  update public.competition_rounds
  set status = 'closed'
  where id = p_round_id
    and status in ('pending', 'active');
end;
$$;

-- Revoke public execution on all admin functions
revoke execute on function public.create_competition_round(uuid,text,timestamptz,int,jsonb,int,timestamptz,text,jsonb) from public, anon;
revoke execute on function public.update_competition_round(uuid,text,int,jsonb,int,timestamptz,timestamptz,text,jsonb,text) from public, anon;
revoke execute on function public.assign_fixture_to_round(uuid,uuid) from public, anon;
revoke execute on function public.unassign_fixture_from_round(uuid) from public, anon;
revoke execute on function public.mark_round_reviewed(uuid,text) from public, anon;
revoke execute on function public.close_round(uuid) from public, anon;

grant execute on function public.create_competition_round(uuid,text,timestamptz,int,jsonb,int,timestamptz,text,jsonb) to authenticated;
grant execute on function public.update_competition_round(uuid,text,int,jsonb,int,timestamptz,timestamptz,text,jsonb,text) to authenticated;
grant execute on function public.assign_fixture_to_round(uuid,uuid) to authenticated;
grant execute on function public.unassign_fixture_from_round(uuid) to authenticated;
grant execute on function public.mark_round_reviewed(uuid,text) to authenticated;
grant execute on function public.close_round(uuid) to authenticated;
