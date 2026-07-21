-- ---------------------------------------------------------------------------
-- Concurrent leagues (multi-league pool platform)
--
-- Lifts the single-active-competition invariant so any number of leagues can be
-- "live" at once. Additive + backward-compatible: is_active / active_competition_id()
-- / set_active_competition() are kept during the transition and dropped in a
-- later cleanup migration once the app resolves league from route/pool context.
--
-- Down (manual):
--   drop function if exists public.league_id_for_slug(text);
--   drop function if exists public.set_league_live(uuid, boolean);
--   alter table public.competitions drop column if exists is_live;
--   create unique index competitions_one_active
--     on public.competitions (is_active) where is_active;
-- ---------------------------------------------------------------------------

-- 1.1 Per-row live flag; backfill from the current single active competition.
alter table public.competitions
  add column if not exists is_live boolean not null default false;

-- Backfill runs before the guard is extended (the existing guard fences only
-- is_active), so this update is permitted.
update public.competitions set is_live = is_active;

-- 1.2 Remove the single-active constraint. Multiple rows may now be live.
drop index if exists public.competitions_one_active;

-- 1.4 Extend the flag guard to also fence is_live behind its own GUC, mirroring
-- the is_active pattern. New rows are born not-live; is_live only changes through
-- set_league_live().
create or replace function public.guard_competitions_is_active()
returns trigger
language plpgsql
as $$
declare
  v_active_allowed boolean := coalesce(
    current_setting('app.allow_active_change', true) = '1', false
  );
  v_live_allowed boolean := coalesce(
    current_setting('app.allow_live_change', true) = '1', false
  );
begin
  if tg_op = 'INSERT' then
    if new.is_active and not v_active_allowed then
      new.is_active := false;
    end if;
    if new.is_live and not v_live_allowed then
      new.is_live := false;
    end if;
    return new;
  end if;

  if new.is_active is distinct from old.is_active and not v_active_allowed then
    raise exception 'is_active can only be changed via set_active_competition()';
  end if;
  if new.is_live is distinct from old.is_live and not v_live_allowed then
    raise exception 'is_live can only be changed via set_league_live()';
  end if;
  return new;
end;
$$;

-- 1.5 Slug → league id resolver. Replaces the single active_competition_id()
-- anchor with a per-league lookup used by views / RLS / domain / sync scoped to
-- a league resolved from route or pool context.
create or replace function public.league_id_for_slug(p_slug text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.competitions where slug = p_slug limit 1;
$$;

-- 1.3 The only mutation path for is_live. Admin-guarded, raises on unknown id,
-- sets ONLY the target league's flag — never displaces another league.
create or replace function public.set_league_live(p_id uuid, p_live boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if not exists (select 1 from public.competitions where id = p_id) then
    raise exception 'competition % does not exist', p_id;
  end if;
  perform set_config('app.allow_live_change', '1', true);
  update public.competitions set is_live = p_live where id = p_id;
  perform set_config('app.allow_live_change', '0', true);
end;
$$;

grant execute on function public.league_id_for_slug(text) to anon, authenticated;
grant execute on function public.set_league_live(uuid, boolean) to authenticated;
