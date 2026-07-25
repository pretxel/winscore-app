-- Allow global admins (not just pool owners) to configure and initialize
-- wager rounds, so the admin console can enable wagering for any pool.
-- Rollback: restore the is_group_owner-only guards from 20260722211859.

create or replace function public.configure_pool_wager(
  p_group_id uuid,
  p_approved_mint bytea,
  p_approved_token_program bytea,
  p_verified_decimals smallint,
  p_stake_base_units numeric,
  p_cluster text default 'devnet',
  p_limits jsonb default '{}'::jsonb
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_config_id uuid;
begin
  if not (public.is_group_owner(p_group_id) or public.is_admin()) then
    raise exception 'Only the pool owner or an admin can configure wagering';
  end if;

  if length(p_approved_mint) <> 32 then
    raise exception 'approved_mint must be 32 bytes';
  end if;
  if length(p_approved_token_program) <> 32 then
    raise exception 'approved_token_program must be 32 bytes';
  end if;
  if p_verified_decimals < 0 or p_verified_decimals > 9 then
    raise exception 'verified_decimals must be 0-9';
  end if;
  if p_stake_base_units <= 0 then
    raise exception 'stake_base_units must be positive';
  end if;
  if p_cluster <> 'devnet' then
    raise exception 'Only devnet cluster is allowed';
  end if;

  insert into public.group_wager_configs (
    group_id, enabled, approved_mint, approved_token_program,
    verified_decimals, stake_base_units, cluster, limits
  ) values (
    p_group_id, true, p_approved_mint, p_approved_token_program,
    p_verified_decimals, p_stake_base_units, p_cluster, p_limits
  )
  on conflict (group_id) do update set
    enabled = true,
    approved_mint = excluded.approved_mint,
    approved_token_program = excluded.approved_token_program,
    verified_decimals = excluded.verified_decimals,
    stake_base_units = excluded.stake_base_units,
    cluster = excluded.cluster,
    limits = excluded.limits
  returning id into v_config_id;

  return v_config_id;
end;
$$;

create or replace function public.initialize_wager_round(
  p_group_id uuid,
  p_round_id uuid
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_config record;
  v_close timestamptz;
  v_wager_round_id uuid;
begin
  if not (public.is_group_owner(p_group_id) or public.is_admin()) then
    raise exception 'Only the pool owner or an admin can initialize wager rounds';
  end if;

  select * into v_config
  from public.group_wager_configs
  where group_id = p_group_id and enabled = true;

  if not found then
    raise exception 'Wagering is not configured or disabled for this pool';
  end if;

  if not public.round_can_accept_wager(p_round_id) then
    raise exception 'Round has no eligible fixtures';
  end if;

  v_close := public.round_effective_close(p_round_id);
  if v_close <= now() then
    raise exception 'Round has already closed';
  end if;

  insert into public.wager_rounds (
    wager_config_id, group_id, round_id,
    stake_base_units, approved_mint, approved_token_program,
    verified_decimals, closes_at, cluster, program_version
  ) values (
    v_config.id, p_group_id, p_round_id,
    v_config.stake_base_units, v_config.approved_mint,
    v_config.approved_token_program, v_config.verified_decimals,
    v_close, v_config.cluster, 1
  )
  on conflict (group_id, round_id) do nothing
  returning id into v_wager_round_id;

  return v_wager_round_id;
end;
$$;
