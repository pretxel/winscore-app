-- ===========================================================================
-- UEFA Champions League 2026-2027 — competition, league-phase fixtures, rounds
-- Source: football-data.org CL season=2026 (144 fixtures, 8 matchdays)
-- ===========================================================================
-- The 2024-25 format: a single 36-team league phase where every club plays 8
-- different opponents. Fixtures and matchdays come straight from
-- football-data's `matchday` field — provider round data, not inferred from
-- dates, per 20260722204537_round_backfill_template.sql.
--
-- Only the league phase is seeded: the knockout play-off and the bracket that
-- follows are drawn after matchday 8 (from 2027-01-27), so no fixtures exist
-- yet. format_config still declares those stages with their point multipliers
-- so the rounds can be added later without touching the competition row.
--
-- Team names are the canonical short forms in lib/team-name-aliases.ts. Both
-- providers normalize to these same 36 names (verified live against
-- football-data CL and ESPN uefa.champions), so results land from either
-- source. Barcelona, Real Madrid, Atlético Madrid, Betis and Villarreal reuse
-- the names La Liga already seeded.
--
-- status='manage': the competition is not exposed to players until an admin
-- flips it to 'active'. Rounds are 'pending' for the same reason.
--
-- Rollback:
-- delete from public.competition_rounds where competition_id =
--   (select id from public.competitions where slug='champions-league-2026-2027');
-- delete from public.matches where competition_id =
--   (select id from public.competitions where slug='champions-league-2026-2027');
-- delete from public.competitions where slug='champions-league-2026-2027';

do $$
declare
  v_comp_id uuid;
  v_round_id uuid;
  v_assigned int;
  v_total int := 0;
begin
  insert into public.competitions (
    slug, kind, name, short_name, season,
    tournament_start_at, tournament_end_at,
    status, format_config, providers, branding
  ) values (
    'champions-league-2026-2027',
    'custom',
    'UEFA Champions League 2026-2027',
    'Champions League 26-27',
    '2026-2027',
    '2026-09-08T16:45:00Z',
    '2027-05-29T00:00:00Z',
    'manage',
    jsonb_build_object(
      'stages', jsonb_build_array(
        jsonb_build_object('key','league','kind','league','order',1,'icon','league','hasGroupCode',false,
          'pointMultiplier', 1,
          'labels', jsonb_build_object('en','League phase','es','Fase de liga','fr','Phase de ligue','de','Ligaphase')),
        jsonb_build_object('key','po','kind','knockout','order',2,'icon','r32','hasGroupCode',false,
          'pointMultiplier', 2,
          'labels', jsonb_build_object('en','Knockout play-off','es','Play-off eliminatorio','fr','Barrages','de','Play-offs')),
        jsonb_build_object('key','r16','kind','knockout','order',3,'icon','r16','hasGroupCode',false,
          'pointMultiplier', 4,
          'labels', jsonb_build_object('en','Round of 16','es','Octavos de final','fr','Huitièmes','de','Achtelfinale')),
        jsonb_build_object('key','qf','kind','knockout','order',4,'icon','qf','hasGroupCode',false,
          'pointMultiplier', 6,
          'labels', jsonb_build_object('en','Quarter-final','es','Cuartos de final','fr','Quarts de finale','de','Viertelfinale')),
        jsonb_build_object('key','sf','kind','knockout','order',5,'icon','sf','hasGroupCode',false,
          'pointMultiplier', 8,
          'labels', jsonb_build_object('en','Semi-final','es','Semifinal','fr','Demi-finale','de','Halbfinale')),
        jsonb_build_object('key','final','kind','knockout','order',6,'icon','final','hasGroupCode',false,
          'pointMultiplier', 10,
          'labels', jsonb_build_object('en','Final','es','Final','fr','Finale','de','Finale'))
      ),
      'groups', jsonb_build_object('enabled', false)
    ),
    jsonb_build_object(
      'footballData', jsonb_build_object('code','CL','season','2026'),
      'espn', jsonb_build_object('leaguePath','uefa.champions')
    ),
    jsonb_build_object(
      'brandCode', 'UCL',
      'joinCodePrefix', 'UCL',
      'newsQuery', '"Champions League" OR "UEFA Champions League"',
      'emailFromName', 'Champions League Pools',
      'hosts', jsonb_build_array('Europe')
    )
  )
  on conflict (slug) do update set
    status = excluded.status,
    tournament_end_at = excluded.tournament_end_at,
    format_config = excluded.format_config,
    providers = excluded.providers,
    branding = excluded.branding
  returning id into v_comp_id;

  -- ===== Matchday 1 (18 fixtures, first kickoff 2026-09-08 16:45:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 1', 1,
    '{"en": "Matchday 1", "es": "Jornada 1", "fr": "Journée 1", "de": "Spieltag 1"}'::jsonb,
    1,
    '2026-09-08 16:45:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "LEAGUE_STAGE:1", "code": "CL", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('AEK Athens', 'LASK Linz', '2026-09-08 16:45:00+00'::timestamptz),
      ('Club Brugge', 'Aston Villa', '2026-09-08 16:45:00+00'::timestamptz),
      ('Borussia Dortmund', 'Villarreal', '2026-09-08 19:00:00+00'::timestamptz),
      ('Lille', 'Betis', '2026-09-08 19:00:00+00'::timestamptz),
      ('Porto', 'Manchester City', '2026-09-08 19:00:00+00'::timestamptz),
      ('Real Madrid', 'Inter Milan', '2026-09-08 19:00:00+00'::timestamptz),
      ('Barcelona', 'Feyenoord', '2026-09-09 16:45:00+00'::timestamptz),
      ('VfB Stuttgart', 'Viking FK', '2026-09-09 16:45:00+00'::timestamptz),
      ('Liverpool', 'Atlético Madrid', '2026-09-09 19:00:00+00'::timestamptz),
      ('Napoli', 'Arsenal', '2026-09-09 19:00:00+00'::timestamptz),
      ('Paris Saint-Germain', 'Slovan Bratislava', '2026-09-09 19:00:00+00'::timestamptz),
      ('Sporting CP', 'Galatasaray', '2026-09-09 19:00:00+00'::timestamptz),
      ('Fenerbahçe', 'AS Roma', '2026-09-10 16:45:00+00'::timestamptz),
      ('PSV', 'Shakhtar Donetsk', '2026-09-10 16:45:00+00'::timestamptz),
      ('Bayern Munich', 'Bodø/Glimt', '2026-09-10 19:00:00+00'::timestamptz),
      ('Como', 'RB Leipzig', '2026-09-10 19:00:00+00'::timestamptz),
      ('Manchester United', 'Sabah FK', '2026-09-10 19:00:00+00'::timestamptz),
      ('Slavia Prague', 'Lens', '2026-09-10 19:00:00+00'::timestamptz)
  )
  insert into public.matches (
    competition_id, round_id, stage, home_team, away_team, kickoff_at, status, venue
  )
  select v_comp_id, v_round_id, 'league', fx.home_team, fx.away_team, fx.kickoff_at,
         'scheduled', null
  from fx
  on conflict do nothing;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;

  -- ===== Matchday 2 (18 fixtures, first kickoff 2026-10-13 16:45:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 2', 2,
    '{"en": "Matchday 2", "es": "Jornada 2", "fr": "Journée 2", "de": "Spieltag 2"}'::jsonb,
    2,
    '2026-10-13 16:45:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "LEAGUE_STAGE:2", "code": "CL", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Lens', 'Sporting CP', '2026-10-13 16:45:00+00'::timestamptz),
      ('Sabah FK', 'Slavia Prague', '2026-10-13 16:45:00+00'::timestamptz),
      ('Arsenal', 'Lille', '2026-10-13 19:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Manchester United', '2026-10-13 19:00:00+00'::timestamptz),
      ('Galatasaray', 'Barcelona', '2026-10-13 19:00:00+00'::timestamptz),
      ('Inter Milan', 'Club Brugge', '2026-10-13 19:00:00+00'::timestamptz),
      ('RB Leipzig', 'PSV', '2026-10-13 19:00:00+00'::timestamptz),
      ('Viking FK', 'Bayern Munich', '2026-10-13 19:00:00+00'::timestamptz),
      ('Villarreal', 'Napoli', '2026-10-13 19:00:00+00'::timestamptz),
      ('Feyenoord', 'Como', '2026-10-14 16:45:00+00'::timestamptz),
      ('LASK Linz', 'Liverpool', '2026-10-14 16:45:00+00'::timestamptz),
      ('AS Roma', 'Real Madrid', '2026-10-14 19:00:00+00'::timestamptz),
      ('Aston Villa', 'Fenerbahçe', '2026-10-14 19:00:00+00'::timestamptz),
      ('Betis', 'Porto', '2026-10-14 19:00:00+00'::timestamptz),
      ('Bodø/Glimt', 'Borussia Dortmund', '2026-10-14 19:00:00+00'::timestamptz),
      ('Manchester City', 'Paris Saint-Germain', '2026-10-14 19:00:00+00'::timestamptz),
      ('Shakhtar Donetsk', 'AEK Athens', '2026-10-14 19:00:00+00'::timestamptz),
      ('Slovan Bratislava', 'VfB Stuttgart', '2026-10-14 19:00:00+00'::timestamptz)
  )
  insert into public.matches (
    competition_id, round_id, stage, home_team, away_team, kickoff_at, status, venue
  )
  select v_comp_id, v_round_id, 'league', fx.home_team, fx.away_team, fx.kickoff_at,
         'scheduled', null
  from fx
  on conflict do nothing;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;

  -- ===== Matchday 3 (18 fixtures, first kickoff 2026-10-20 16:45:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 3', 3,
    '{"en": "Matchday 3", "es": "Jornada 3", "fr": "Journée 3", "de": "Spieltag 3"}'::jsonb,
    3,
    '2026-10-20 16:45:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "LEAGUE_STAGE:3", "code": "CL", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Fenerbahçe', 'Slavia Prague', '2026-10-20 16:45:00+00'::timestamptz),
      ('Sabah FK', 'Borussia Dortmund', '2026-10-20 16:45:00+00'::timestamptz),
      ('AS Roma', 'Slovan Bratislava', '2026-10-20 19:00:00+00'::timestamptz),
      ('Liverpool', 'Villarreal', '2026-10-20 19:00:00+00'::timestamptz),
      ('Manchester City', 'AEK Athens', '2026-10-20 19:00:00+00'::timestamptz),
      ('Napoli', 'Bodø/Glimt', '2026-10-20 19:00:00+00'::timestamptz),
      ('Paris Saint-Germain', 'Barcelona', '2026-10-20 19:00:00+00'::timestamptz),
      ('Porto', 'PSV', '2026-10-20 19:00:00+00'::timestamptz),
      ('VfB Stuttgart', 'Atlético Madrid', '2026-10-20 19:00:00+00'::timestamptz),
      ('Como', 'Manchester United', '2026-10-21 16:45:00+00'::timestamptz),
      ('Lille', 'Galatasaray', '2026-10-21 16:45:00+00'::timestamptz),
      ('Aston Villa', 'Viking FK', '2026-10-21 19:00:00+00'::timestamptz),
      ('Bayern Munich', 'Arsenal', '2026-10-21 19:00:00+00'::timestamptz),
      ('Betis', 'Feyenoord', '2026-10-21 19:00:00+00'::timestamptz),
      ('Club Brugge', 'Lens', '2026-10-21 19:00:00+00'::timestamptz),
      ('Inter Milan', 'Shakhtar Donetsk', '2026-10-21 19:00:00+00'::timestamptz),
      ('Real Madrid', 'RB Leipzig', '2026-10-21 19:00:00+00'::timestamptz),
      ('Sporting CP', 'LASK Linz', '2026-10-21 19:00:00+00'::timestamptz)
  )
  insert into public.matches (
    competition_id, round_id, stage, home_team, away_team, kickoff_at, status, venue
  )
  select v_comp_id, v_round_id, 'league', fx.home_team, fx.away_team, fx.kickoff_at,
         'scheduled', null
  from fx
  on conflict do nothing;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;

  -- ===== Matchday 4 (18 fixtures, first kickoff 2026-11-03 17:45:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 4', 4,
    '{"en": "Matchday 4", "es": "Jornada 4", "fr": "Journée 4", "de": "Spieltag 4"}'::jsonb,
    4,
    '2026-11-03 17:45:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "LEAGUE_STAGE:4", "code": "CL", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Galatasaray', 'VfB Stuttgart', '2026-11-03 17:45:00+00'::timestamptz),
      ('Shakhtar Donetsk', 'Sporting CP', '2026-11-03 17:45:00+00'::timestamptz),
      ('Atlético Madrid', 'Bayern Munich', '2026-11-03 20:00:00+00'::timestamptz),
      ('Barcelona', 'Aston Villa', '2026-11-03 20:00:00+00'::timestamptz),
      ('Bodø/Glimt', 'Lille', '2026-11-03 20:00:00+00'::timestamptz),
      ('Feyenoord', 'Inter Milan', '2026-11-03 20:00:00+00'::timestamptz),
      ('LASK Linz', 'Slovan Bratislava', '2026-11-03 20:00:00+00'::timestamptz),
      ('Manchester United', 'AS Roma', '2026-11-03 20:00:00+00'::timestamptz),
      ('Villarreal', 'Paris Saint-Germain', '2026-11-03 20:00:00+00'::timestamptz),
      ('AEK Athens', 'Real Madrid', '2026-11-04 17:45:00+00'::timestamptz),
      ('Fenerbahçe', 'Liverpool', '2026-11-04 17:45:00+00'::timestamptz),
      ('Borussia Dortmund', 'Betis', '2026-11-04 20:00:00+00'::timestamptz),
      ('Lens', 'Como', '2026-11-04 20:00:00+00'::timestamptz),
      ('PSV', 'Club Brugge', '2026-11-04 20:00:00+00'::timestamptz),
      ('Porto', 'Napoli', '2026-11-04 20:00:00+00'::timestamptz),
      ('RB Leipzig', 'Manchester City', '2026-11-04 20:00:00+00'::timestamptz),
      ('Slavia Prague', 'Arsenal', '2026-11-04 20:00:00+00'::timestamptz),
      ('Viking FK', 'Sabah FK', '2026-11-04 20:00:00+00'::timestamptz)
  )
  insert into public.matches (
    competition_id, round_id, stage, home_team, away_team, kickoff_at, status, venue
  )
  select v_comp_id, v_round_id, 'league', fx.home_team, fx.away_team, fx.kickoff_at,
         'scheduled', null
  from fx
  on conflict do nothing;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;

  -- ===== Matchday 5 (18 fixtures, first kickoff 2026-11-24 17:45:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 5', 5,
    '{"en": "Matchday 5", "es": "Jornada 5", "fr": "Journée 5", "de": "Spieltag 5"}'::jsonb,
    5,
    '2026-11-24 17:45:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "LEAGUE_STAGE:5", "code": "CL", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Bodø/Glimt', 'LASK Linz', '2026-11-24 17:45:00+00'::timestamptz),
      ('Galatasaray', 'Aston Villa', '2026-11-24 17:45:00+00'::timestamptz),
      ('Arsenal', 'Borussia Dortmund', '2026-11-24 20:00:00+00'::timestamptz),
      ('Como', 'AEK Athens', '2026-11-24 20:00:00+00'::timestamptz),
      ('Feyenoord', 'Porto', '2026-11-24 20:00:00+00'::timestamptz),
      ('Manchester City', 'Napoli', '2026-11-24 20:00:00+00'::timestamptz),
      ('RB Leipzig', 'Lens', '2026-11-24 20:00:00+00'::timestamptz),
      ('Real Madrid', 'PSV', '2026-11-24 20:00:00+00'::timestamptz),
      ('Slovan Bratislava', 'Betis', '2026-11-24 20:00:00+00'::timestamptz),
      ('Sabah FK', 'Barcelona', '2026-11-25 17:45:00+00'::timestamptz),
      ('Slavia Prague', 'Villarreal', '2026-11-25 17:45:00+00'::timestamptz),
      ('Atlético Madrid', 'Viking FK', '2026-11-25 20:00:00+00'::timestamptz),
      ('Club Brugge', 'Liverpool', '2026-11-25 20:00:00+00'::timestamptz),
      ('Inter Milan', 'VfB Stuttgart', '2026-11-25 20:00:00+00'::timestamptz),
      ('Lille', 'Bayern Munich', '2026-11-25 20:00:00+00'::timestamptz),
      ('Paris Saint-Germain', 'AS Roma', '2026-11-25 20:00:00+00'::timestamptz),
      ('Shakhtar Donetsk', 'Fenerbahçe', '2026-11-25 20:00:00+00'::timestamptz),
      ('Sporting CP', 'Manchester United', '2026-11-25 20:00:00+00'::timestamptz)
  )
  insert into public.matches (
    competition_id, round_id, stage, home_team, away_team, kickoff_at, status, venue
  )
  select v_comp_id, v_round_id, 'league', fx.home_team, fx.away_team, fx.kickoff_at,
         'scheduled', null
  from fx
  on conflict do nothing;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;

  -- ===== Matchday 6 (18 fixtures, first kickoff 2026-12-08 17:45:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 6', 6,
    '{"en": "Matchday 6", "es": "Jornada 6", "fr": "Journée 6", "de": "Spieltag 6"}'::jsonb,
    6,
    '2026-12-08 17:45:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "LEAGUE_STAGE:6", "code": "CL", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Viking FK', 'Feyenoord', '2026-12-08 17:45:00+00'::timestamptz),
      ('Villarreal', 'Sabah FK', '2026-12-08 17:45:00+00'::timestamptz),
      ('AEK Athens', 'Galatasaray', '2026-12-08 20:00:00+00'::timestamptz),
      ('AS Roma', 'Sporting CP', '2026-12-08 20:00:00+00'::timestamptz),
      ('Aston Villa', 'Paris Saint-Germain', '2026-12-08 20:00:00+00'::timestamptz),
      ('Barcelona', 'Manchester City', '2026-12-08 20:00:00+00'::timestamptz),
      ('Bayern Munich', 'Slavia Prague', '2026-12-08 20:00:00+00'::timestamptz),
      ('Manchester United', 'RB Leipzig', '2026-12-08 20:00:00+00'::timestamptz),
      ('Napoli', 'Club Brugge', '2026-12-08 20:00:00+00'::timestamptz),
      ('Betis', 'Como', '2026-12-09 17:45:00+00'::timestamptz),
      ('Slovan Bratislava', 'Shakhtar Donetsk', '2026-12-09 17:45:00+00'::timestamptz),
      ('Arsenal', 'Real Madrid', '2026-12-09 20:00:00+00'::timestamptz),
      ('Borussia Dortmund', 'Inter Milan', '2026-12-09 20:00:00+00'::timestamptz),
      ('LASK Linz', 'Fenerbahçe', '2026-12-09 20:00:00+00'::timestamptz),
      ('Lens', 'Bodø/Glimt', '2026-12-09 20:00:00+00'::timestamptz),
      ('Liverpool', 'Porto', '2026-12-09 20:00:00+00'::timestamptz),
      ('PSV', 'Atlético Madrid', '2026-12-09 20:00:00+00'::timestamptz),
      ('VfB Stuttgart', 'Lille', '2026-12-09 20:00:00+00'::timestamptz)
  )
  insert into public.matches (
    competition_id, round_id, stage, home_team, away_team, kickoff_at, status, venue
  )
  select v_comp_id, v_round_id, 'league', fx.home_team, fx.away_team, fx.kickoff_at,
         'scheduled', null
  from fx
  on conflict do nothing;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;

  -- ===== Matchday 7 (18 fixtures, first kickoff 2027-01-19 17:45:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 7', 7,
    '{"en": "Matchday 7", "es": "Jornada 7", "fr": "Journée 7", "de": "Spieltag 7"}'::jsonb,
    7,
    '2027-01-19 17:45:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "LEAGUE_STAGE:7", "code": "CL", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Bodø/Glimt', 'Atlético Madrid', '2027-01-19 17:45:00+00'::timestamptz),
      ('Galatasaray', 'Feyenoord', '2027-01-19 17:45:00+00'::timestamptz),
      ('AEK Athens', 'AS Roma', '2027-01-19 20:00:00+00'::timestamptz),
      ('Aston Villa', 'Borussia Dortmund', '2027-01-19 20:00:00+00'::timestamptz),
      ('Inter Milan', 'Liverpool', '2027-01-19 20:00:00+00'::timestamptz),
      ('Lille', 'Slovan Bratislava', '2027-01-19 20:00:00+00'::timestamptz),
      ('Porto', 'Slavia Prague', '2027-01-19 20:00:00+00'::timestamptz),
      ('Real Madrid', 'LASK Linz', '2027-01-19 20:00:00+00'::timestamptz),
      ('VfB Stuttgart', 'Club Brugge', '2027-01-19 20:00:00+00'::timestamptz),
      ('Fenerbahçe', 'Villarreal', '2027-01-20 17:45:00+00'::timestamptz),
      ('Sabah FK', 'Napoli', '2027-01-20 17:45:00+00'::timestamptz),
      ('Betis', 'Arsenal', '2027-01-20 20:00:00+00'::timestamptz),
      ('Como', 'Paris Saint-Germain', '2027-01-20 20:00:00+00'::timestamptz),
      ('Lens', 'Manchester City', '2027-01-20 20:00:00+00'::timestamptz),
      ('Manchester United', 'Bayern Munich', '2027-01-20 20:00:00+00'::timestamptz),
      ('RB Leipzig', 'Shakhtar Donetsk', '2027-01-20 20:00:00+00'::timestamptz),
      ('Sporting CP', 'Barcelona', '2027-01-20 20:00:00+00'::timestamptz),
      ('Viking FK', 'PSV', '2027-01-20 20:00:00+00'::timestamptz)
  )
  insert into public.matches (
    competition_id, round_id, stage, home_team, away_team, kickoff_at, status, venue
  )
  select v_comp_id, v_round_id, 'league', fx.home_team, fx.away_team, fx.kickoff_at,
         'scheduled', null
  from fx
  on conflict do nothing;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;

  -- ===== Matchday 8 (18 fixtures, first kickoff 2027-01-27 20:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 8', 8,
    '{"en": "Matchday 8", "es": "Jornada 8", "fr": "Journée 8", "de": "Spieltag 8"}'::jsonb,
    8,
    '2027-01-27 20:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "LEAGUE_STAGE:8", "code": "CL", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('AS Roma', 'Lille', '2027-01-27 20:00:00+00'::timestamptz),
      ('Arsenal', 'Sabah FK', '2027-01-27 20:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Fenerbahçe', '2027-01-27 20:00:00+00'::timestamptz),
      ('Barcelona', 'Como', '2027-01-27 20:00:00+00'::timestamptz),
      ('Bayern Munich', 'Betis', '2027-01-27 20:00:00+00'::timestamptz),
      ('Borussia Dortmund', 'AEK Athens', '2027-01-27 20:00:00+00'::timestamptz),
      ('Club Brugge', 'Bodø/Glimt', '2027-01-27 20:00:00+00'::timestamptz),
      ('Feyenoord', 'RB Leipzig', '2027-01-27 20:00:00+00'::timestamptz),
      ('LASK Linz', 'Porto', '2027-01-27 20:00:00+00'::timestamptz),
      ('Liverpool', 'Lens', '2027-01-27 20:00:00+00'::timestamptz),
      ('Manchester City', 'Sporting CP', '2027-01-27 20:00:00+00'::timestamptz),
      ('Napoli', 'Viking FK', '2027-01-27 20:00:00+00'::timestamptz),
      ('PSV', 'VfB Stuttgart', '2027-01-27 20:00:00+00'::timestamptz),
      ('Paris Saint-Germain', 'Galatasaray', '2027-01-27 20:00:00+00'::timestamptz),
      ('Shakhtar Donetsk', 'Real Madrid', '2027-01-27 20:00:00+00'::timestamptz),
      ('Slavia Prague', 'Aston Villa', '2027-01-27 20:00:00+00'::timestamptz),
      ('Slovan Bratislava', 'Inter Milan', '2027-01-27 20:00:00+00'::timestamptz),
      ('Villarreal', 'Manchester United', '2027-01-27 20:00:00+00'::timestamptz)
  )
  insert into public.matches (
    competition_id, round_id, stage, home_team, away_team, kickoff_at, status, venue
  )
  select v_comp_id, v_round_id, 'league', fx.home_team, fx.away_team, fx.kickoff_at,
         'scheduled', null
  from fx
  on conflict do nothing;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;

  raise notice 'Champions League 2026-2027: % fixtures seeded across 8 matchdays', v_total;
end;
$$;
