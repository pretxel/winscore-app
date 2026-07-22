-- Rollback:
-- alter table public.competitions drop column if exists finished_at;
-- drop function if exists public.finish_league(uuid);
-- drop function if exists public.restart_league(uuid);

-- Add finished_at column for league lifecycle management
alter table public.competitions
  add column finished_at timestamptz;

create index competitions_finished_at_idx
  on public.competitions (finished_at);

-- Mark a league as finished. Admin only, idempotent.
create or replace function public.finish_league(p_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can finish a league';
  end if;

  update public.competitions
  set finished_at = now()
  where id = p_id
    and finished_at is null;
end;
$$;

-- Restart a finished league. Admin only.
create or replace function public.restart_league(p_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can restart a league';
  end if;

  update public.competitions
  set finished_at = null
  where id = p_id
    and finished_at is not null;
end;
$$;

revoke execute on function public.finish_league(uuid) from public, anon;
revoke execute on function public.restart_league(uuid) from public, anon;
grant execute on function public.finish_league(uuid) to authenticated;
grant execute on function public.restart_league(uuid) to authenticated;
