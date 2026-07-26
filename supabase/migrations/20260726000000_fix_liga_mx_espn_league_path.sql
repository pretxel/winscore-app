-- Fix the ESPN league path for Liga MX so result sync actually reaches it.
--
-- The seed recorded `espn.leaguePath = 'mex.liga'`, which ESPN rejects with
-- HTTP 400 "Failed to get events endpoint." on every request. The correct path
-- is `mex.1`, verified live: it returns the 9 Jornada 3 fixtures with kickoff
-- times matching ours exactly.
--
-- ESPN is the fallback provider and, unlike football-data.org, needs no API key,
-- so a broken path here meant Liga MX had no working fallback at all — results
-- would silently never update, and a wagered round could never reach a
-- settleable state (settlement requires every fixture final with scores).
--
-- World Cup's `fifa.world` is correct and left alone.
--
-- Rollback:
-- update public.competitions
-- set providers = jsonb_set(providers, '{espn,leaguePath}', '"mex.liga"')
-- where slug = 'liga-mx-apertura-2026';

update public.competitions
set providers = jsonb_set(providers, '{espn,leaguePath}', '"mex.1"'),
    updated_at = now()
where slug = 'liga-mx-apertura-2026'
  and providers -> 'espn' ->> 'leaguePath' = 'mex.liga';

do $$
declare v_path text;
begin
  select providers -> 'espn' ->> 'leaguePath' into v_path
  from public.competitions where slug = 'liga-mx-apertura-2026';

  if v_path is distinct from 'mex.1' then
    raise exception 'Liga MX espn.leaguePath is %, expected mex.1', coalesce(v_path, 'null');
  end if;
end $$;
