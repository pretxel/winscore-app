-- ---------------------------------------------------------------------------
-- Per-request league context (multi-league scoping)
--
-- Redefines active_competition_id() to resolve the league from a per-request
-- `x-league` header (set by the server Supabase client from route/pool context),
-- falling back to the single active competition during the transition. Because
-- every competition-scoped view / RLS policy / function already resolves through
-- active_competition_id(), this one redefinition scopes the entire DB layer to
-- the request's league — with no change to those objects.
--
-- The header is read from PostgREST's request.headers, which is transaction-local
-- per request (pooling-safe, unlike a session GUC). Header set by our server, not
-- the end user.
--
-- Down (manual): restore the single-active body:
--   select id from public.competitions where is_active limit 1;
-- ---------------------------------------------------------------------------

create or replace function public.active_competition_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    -- Request-scoped league from the x-league header (route/pool context).
    (
      select c.id
      from public.competitions c
      where c.slug = nullif(
        current_setting('request.headers', true)::json ->> 'x-league', ''
      )
      limit 1
    ),
    -- Transition fallback: the single active competition.
    (select c.id from public.competitions c where c.is_active limit 1)
  );
$$;
