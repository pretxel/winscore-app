-- Rollback:
-- drop function if exists public.create_wager_intent_and_snapshot(uuid,uuid,uuid,uuid,bytea,smallint,jsonb,text);

-- Atomic snapshot-and-intent function.
-- Under row locks, validates membership, eligibility, close, and complete predictions.
-- Copies the user's current free predictions to wager_entry_predictions as immutable
-- snapshots, then creates a wager_intent with a unique idempotency key.
-- All-or-nothing: if any check fails, nothing is written.
create or replace function public.create_wager_intent_and_snapshot(
  p_user_id uuid,
  p_group_id uuid,
  p_round_id uuid,
  p_wallet_link_id uuid,
  p_pick_commitment bytea default null,
  p_canonicalization_version smallint default 1,
  p_eligibility_check jsonb default '{}'::jsonb,
  p_consent_version text default null
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_membership record;
  v_wager_round record;
  v_round record;
  v_close timestamptz;
  v_intent_id uuid;
  v_idempotency_key uuid;
  v_fixture_count int;
  v_prediction_count int;
  v_pred record;
begin
  -- Validate membership
  select * into v_membership
  from public.group_members
  where group_id = p_group_id and user_id = p_user_id;

  if not found then
    raise exception 'User is not a member of this pool';
  end if;

  -- Validate wallet link is active and owned by this user
  if not exists (
    select 1 from public.wallet_links
    where id = p_wallet_link_id
      and user_id = p_user_id
      and is_active = true
  ) then
    raise exception 'Wallet is not linked or link is not active';
  end if;

  -- Validate wager round exists and is initialized
  select * into v_wager_round
  from public.wager_rounds
  where group_id = p_group_id and round_id = p_round_id
    and state = 'initialized'
  for update;

  if not found then
    raise exception 'Wager round is not initialized or not in initialized state';
  end if;

  -- Validate round is still open
  v_close := v_wager_round.closes_at;
  if v_close <= now() then
    raise exception 'Wager round has closed';
  end if;

  -- Count eligible, non-cancelled fixtures for this round
  select count(*) into v_fixture_count
  from public.matches
  where round_id = p_round_id and status <> 'cancelled';

  if v_fixture_count = 0 then
    raise exception 'Round has no eligible fixtures';
  end if;

  -- Count user predictions for those fixtures
  select count(*) into v_prediction_count
  from public.predictions p
  join public.matches m on m.id = p.match_id
  where p.user_id = p_user_id
    and m.round_id = p_round_id
    and m.status <> 'cancelled';

  if v_prediction_count < v_fixture_count then
    raise exception 'Not all fixtures have predictions (% of %)',
      v_prediction_count, v_fixture_count;
  end if;

  -- Lock predictions to prevent concurrent changes during snapshot
  perform 1 from public.predictions p
  join public.matches m on m.id = p.match_id
  where p.user_id = p_user_id
    and m.round_id = p_round_id
    and m.status <> 'cancelled'
  for update;

  -- Create the intent
  v_idempotency_key := gen_random_uuid();

  insert into public.wager_intents (
    user_id, group_id, round_id, wallet_link_id,
    wager_round_id, pick_commitment, canonicalization_version,
    idempotency_key, state, eligibility_check, consent_version,
    consent_accepted_at
  ) values (
    p_user_id, p_group_id, p_round_id, p_wallet_link_id,
    v_wager_round.id, p_pick_commitment, p_canonicalization_version,
    v_idempotency_key, 'preparing',
    p_eligibility_check, p_consent_version,
    case when p_consent_version is not null then now() else null end
  )
  returning id into v_intent_id;

  -- Snapshot predictions (linked to intent for now; entry_id filled after confirmation)
  insert into public.wager_entry_predictions (
    intent_id, entry_id, match_id, home_goals, away_goals, source_submitted_at
  )
  select
    v_intent_id,
    null,
    p.match_id,
    p.home_goals,
    p.away_goals,
    p.submitted_at
  from public.predictions p
  join public.matches m on m.id = p.match_id
  where p.user_id = p_user_id
    and m.round_id = p_round_id
    and m.status <> 'cancelled';

  return v_intent_id;
end;
$$;

revoke execute on function public.create_wager_intent_and_snapshot(uuid,uuid,uuid,uuid,bytea,smallint,jsonb,text) from public, anon;
grant execute on function public.create_wager_intent_and_snapshot(uuid,uuid,uuid,uuid,bytea,smallint,jsonb,text) to authenticated;
