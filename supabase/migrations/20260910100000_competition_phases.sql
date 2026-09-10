-- ===========================================================================
-- Competition phases: schemes, phases, per-group phase rankings, frozen winners
-- ---------------------------------------------------------------------------
-- A competition can offer named phase schemes. Each scheme is an ordered set
-- of kickoff windows: a phase stores only its start, and its end is the next
-- phase's start (derived with lead()), so a scheme always partitions the
-- timeline — no gaps, no double counting. A group picks a scheme when it is
-- created and the choice is locked afterwards.
--
-- A phase ranking is the existing scores aggregate with one extra predicate on
-- kickoff_at. Nothing in scores/predictions/matches changes. Closing a phase
-- freezes each group's winner so later result corrections cannot move it.
--
-- Rollback: drop function close_phase, leaderboard_for_group_phase,
-- group_phase_standing, leaderboard_for_phase, phase_bounds; drop tables
-- competition_phase_winners, competition_phases, competition_phase_schemes;
-- alter table groups drop column phase_scheme_id; restore create_group(text,
-- uuid) from 20260724000000_competition_status.sql.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Schemes
-- ---------------------------------------------------------------------------
create table public.competition_phase_schemes (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  scheme_key text not null,
  labels jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_phase_schemes_key_length check (char_length(scheme_key) between 1 and 60),
  constraint competition_phase_schemes_unique_key unique (competition_id, scheme_key)
);
-- At most one default scheme per competition; it drives the global phase board.
create unique index competition_phase_schemes_one_default
  on public.competition_phase_schemes (competition_id) where is_default;

create trigger trg_competition_phase_schemes_updated_at
  before update on public.competition_phase_schemes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Phases
-- ---------------------------------------------------------------------------
create table public.competition_phases (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.competition_phase_schemes(id) on delete cascade,
  phase_key text not null,
  labels jsonb not null default '{}'::jsonb,
  display_order int not null,
  starts_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_phases_key_length check (char_length(phase_key) between 1 and 60),
  constraint competition_phases_unique_order unique (scheme_id, display_order),
  constraint competition_phases_unique_key unique (scheme_id, phase_key)
);
create index competition_phases_scheme_order_idx
  on public.competition_phases (scheme_id, display_order);

create trigger trg_competition_phases_updated_at
  before update on public.competition_phases
  for each row execute function public.set_updated_at();

-- Lifecycle guard: a closed phase is immutable (its winners are recorded); an
-- active phase keeps its boundary (moving it would re-cut a running contest).
create or replace function public.competition_phases_guard_edit()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'closed' then
    raise exception 'phase is closed; its result is already decided';
  end if;
  if old.status = 'active' and (new.starts_at <> old.starts_at or new.display_order <> old.display_order) then
    raise exception 'phase is active; its window cannot move';
  end if;
  return new;
end;
$$;

create trigger trg_competition_phases_guard_edit
  before update on public.competition_phases
  for each row execute function public.competition_phases_guard_edit();

-- ---------------------------------------------------------------------------
-- 3. Groups choose a scheme at creation; the choice is locked
-- ---------------------------------------------------------------------------
-- on delete restrict: a scheme in use by a group cannot be deleted, which also
-- keeps the lock trigger below from firing on a cascade.
alter table public.groups
  add column phase_scheme_id uuid references public.competition_phase_schemes(id) on delete restrict;
create index groups_phase_scheme_id_idx on public.groups (phase_scheme_id);

create or replace function public.groups_guard_phase_scheme()
returns trigger
language plpgsql
as $$
declare
  v_scheme_comp uuid;
begin
  if tg_op = 'UPDATE' and new.phase_scheme_id is distinct from old.phase_scheme_id then
    raise exception 'a group''s phase scheme is locked after creation';
  end if;
  if new.phase_scheme_id is not null then
    select competition_id into v_scheme_comp
    from public.competition_phase_schemes where id = new.phase_scheme_id;
    if v_scheme_comp is null or v_scheme_comp <> new.competition_id then
      raise exception 'phase scheme belongs to another competition';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_groups_guard_phase_scheme
  before insert or update on public.groups
  for each row execute function public.groups_guard_phase_scheme();

-- ---------------------------------------------------------------------------
-- 4. Frozen winners
-- ---------------------------------------------------------------------------
-- Several rank-1 rows per (phase, group) are legal: an unbroken tie records
-- every member still level, and the group sees them as joint winners.
create table public.competition_phase_winners (
  phase_id uuid not null references public.competition_phases(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  total_points int not null,
  exact_hits int not null,
  winner_gd_hits int not null,
  winner_hits int not null,
  decided_at timestamptz not null default now(),
  primary key (phase_id, group_id, user_id)
);
create index competition_phase_winners_group_idx
  on public.competition_phase_winners (group_id, phase_id);

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
alter table public.competition_phase_schemes enable row level security;
alter table public.competition_phases enable row level security;
alter table public.competition_phase_winners enable row level security;

-- Schemes and phases are as public as the competition itself.
create policy "competition_phase_schemes_select_all"
  on public.competition_phase_schemes for select
  to anon, authenticated
  using (true);
create policy "competition_phase_schemes_admin_write"
  on public.competition_phase_schemes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "competition_phases_select_all"
  on public.competition_phases for select
  to anon, authenticated
  using (true);
create policy "competition_phases_admin_write"
  on public.competition_phases for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Recorded winners: members of the group read them. Writes only via
-- close_phase() (security definer); no insert/update/delete policies.
create policy "competition_phase_winners_select_members"
  on public.competition_phase_winners for select
  to authenticated
  using (public.is_group_member(group_id));

-- ---------------------------------------------------------------------------
-- 6. Window resolution — the one definition every ranking shares
-- ---------------------------------------------------------------------------
create or replace function public.phase_bounds(p_phase_id uuid)
returns table (
  phase_id uuid,
  scheme_id uuid,
  competition_id uuid,
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with ordered as (
    select
      p.id,
      p.scheme_id,
      s.competition_id,
      p.starts_at,
      lead(p.starts_at) over (partition by p.scheme_id order by p.display_order) as ends_at
    from public.competition_phases p
    join public.competition_phase_schemes s on s.id = p.scheme_id
    where p.scheme_id = (select scheme_id from public.competition_phases where id = p_phase_id)
  )
  select id, scheme_id, competition_id, starts_at, ends_at
  from ordered
  where id = p_phase_id;
$$;

grant execute on function public.phase_bounds(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Global phase board (presentational; pins the competition via the phase)
-- ---------------------------------------------------------------------------
create or replace function public.leaderboard_for_phase(p_phase_id uuid)
returns table (
  user_id uuid,
  display_name text,
  total_points int,
  exact_hits int,
  winner_gd_hits int,
  winner_hits int,
  first_submit timestamptz,
  rank bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with b as (select * from public.phase_bounds(p_phase_id)),
  agg as (
    select
      s.user_id,
      sum(s.points)::int as total_points,
      count(*) filter (where s.hit_type = 'exact')::int as exact_hits,
      count(*) filter (where s.hit_type = 'winner_gd')::int as winner_gd_hits,
      count(*) filter (where s.hit_type = 'winner')::int as winner_hits,
      min(p.submitted_at) as first_submit
    from public.scores s
    join public.matches m on m.id = s.match_id
    join b
      on m.competition_id = b.competition_id
     and m.kickoff_at >= b.starts_at
     and (b.ends_at is null or m.kickoff_at < b.ends_at)
    join public.predictions p on p.user_id = s.user_id and p.match_id = s.match_id
    join public.profiles pr_f on pr_f.id = s.user_id and pr_f.is_admin = false
    group by s.user_id
  )
  select
    a.user_id,
    pr.display_name,
    a.total_points,
    a.exact_hits,
    a.winner_gd_hits,
    a.winner_hits,
    a.first_submit,
    rank() over (
      order by a.total_points desc, a.exact_hits desc, a.winner_gd_hits desc, a.first_submit asc
    ) as rank
  from agg a
  join public.profiles pr on pr.id = a.user_id;
$$;

grant execute on function public.leaderboard_for_phase(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Group phase standing — the aggregate that decides the winner
-- ---------------------------------------------------------------------------
-- Internal: no membership guard, so close_phase() can run it for every group.
-- Not granted to app roles; the guarded wrapper below is the public surface.
-- Keeps the per-member join-date rule from leaderboard_for_group, and refuses
-- a phase that is not on the group's own scheme.
create or replace function public.group_phase_standing(p_group_id uuid, p_phase_id uuid)
returns table (
  user_id uuid,
  display_name text,
  total_points int,
  exact_hits int,
  winner_gd_hits int,
  winner_hits int,
  first_submit timestamptz,
  rank bigint,
  joined_mid_phase boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with b as (
    select pb.*
    from public.phase_bounds(p_phase_id) pb
    join public.groups g on g.id = p_group_id and g.phase_scheme_id = pb.scheme_id
  ),
  agg as (
    select
      s.user_id,
      sum(s.points)::int as total_points,
      count(*) filter (where s.hit_type = 'exact')::int as exact_hits,
      count(*) filter (where s.hit_type = 'winner_gd')::int as winner_gd_hits,
      count(*) filter (where s.hit_type = 'winner')::int as winner_hits,
      min(p.submitted_at) as first_submit,
      bool_or(gm.joined_at > b.starts_at) as joined_mid_phase
    from public.scores s
    join public.group_members gm on gm.user_id = s.user_id and gm.group_id = p_group_id
    join b on true
    join public.matches m
      on m.id = s.match_id
     and m.competition_id = b.competition_id
     and m.kickoff_at >= b.starts_at
     and (b.ends_at is null or m.kickoff_at < b.ends_at)
     and m.kickoff_at >= gm.joined_at
    join public.predictions p on p.user_id = s.user_id and p.match_id = s.match_id
    join public.profiles pr_f on pr_f.id = s.user_id and pr_f.is_admin = false
    group by s.user_id
  )
  select
    a.user_id,
    pr.display_name,
    a.total_points,
    a.exact_hits,
    a.winner_gd_hits,
    a.winner_hits,
    a.first_submit,
    rank() over (
      order by a.total_points desc, a.exact_hits desc, a.winner_gd_hits desc, a.first_submit asc
    ) as rank,
    a.joined_mid_phase
  from agg a
  join public.profiles pr on pr.id = a.user_id;
$$;

revoke all on function public.group_phase_standing(uuid, uuid) from public, anon, authenticated;

create or replace function public.leaderboard_for_group_phase(p_group_id uuid, p_phase_id uuid)
returns table (
  user_id uuid,
  display_name text,
  total_points int,
  exact_hits int,
  winner_gd_hits int,
  winner_hits int,
  first_submit timestamptz,
  rank bigint,
  joined_mid_phase boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.group_phase_standing(p_group_id, p_phase_id)
  where public.is_group_member(p_group_id);
$$;

grant execute on function public.leaderboard_for_group_phase(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Closing a phase freezes each group's winner
-- ---------------------------------------------------------------------------
-- Admin only. Records rank-1 rows for every group on the scheme that exists at
-- close (joint winners included), marks the phase closed, and activates the
-- next pending phase of the scheme so the group page names what is next.
create or replace function public.close_phase(p_phase_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scheme uuid;
  v_status text;
  v_order int;
  v_written int := 0;
  g record;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select scheme_id, status, display_order into v_scheme, v_status, v_order
  from public.competition_phases where id = p_phase_id for update;
  if v_scheme is null then
    raise exception 'phase % does not exist', p_phase_id;
  end if;
  if v_status = 'closed' then
    raise exception 'phase is already closed';
  end if;

  for g in
    select id from public.groups where phase_scheme_id = v_scheme
  loop
    insert into public.competition_phase_winners
      (phase_id, group_id, user_id, total_points, exact_hits, winner_gd_hits, winner_hits)
    select p_phase_id, g.id, st.user_id, st.total_points, st.exact_hits, st.winner_gd_hits, st.winner_hits
    from public.group_phase_standing(g.id, p_phase_id) st
    where st.rank = 1;
  end loop;

  update public.competition_phases set status = 'closed' where id = p_phase_id;

  update public.competition_phases
  set status = 'active'
  where id = (
    select id from public.competition_phases
    where scheme_id = v_scheme and status = 'pending' and display_order > v_order
    order by display_order
    limit 1
  );

  select count(*)::int into v_written
  from public.competition_phase_winners where phase_id = p_phase_id;
  return v_written;
end;
$$;

grant execute on function public.close_phase(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. create_group() accepts an optional scheme
-- ---------------------------------------------------------------------------
-- PostgREST resolves overloads by argument names, so the two-argument version
-- is dropped rather than kept alongside; the third argument defaults to null.
drop function if exists public.create_group(text, uuid);

create or replace function public.create_group(
  p_name text,
  p_competition_id uuid default null,
  p_phase_scheme_id uuid default null
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
  v_status text;
  v_prefix text;
  v_scheme_comp uuid;
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

  select status, coalesce(branding ->> 'joinCodePrefix', 'WC')
    into v_status, v_prefix
  from public.competitions where id = v_competition_id;

  if v_status is null then
    raise exception 'league % does not exist', v_competition_id;
  end if;
  if v_status <> 'active' then
    raise exception 'league is not active';
  end if;

  if p_phase_scheme_id is not null then
    select competition_id into v_scheme_comp
    from public.competition_phase_schemes where id = p_phase_scheme_id;
    if v_scheme_comp is null or v_scheme_comp <> v_competition_id then
      raise exception 'phase scheme belongs to another competition';
    end if;
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_code := public.generate_join_code(v_prefix);
    begin
      insert into public.groups (name, owner_id, join_code, competition_id, phase_scheme_id)
      values (v_name, v_uid, v_code, v_competition_id, p_phase_scheme_id)
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

grant execute on function public.create_group(text, uuid, uuid) to authenticated;
