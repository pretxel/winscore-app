-- ===========================================================================
-- La Liga 2026-2027 — competition, fixtures, and matchday rounds
-- Source: football-data.org PD season=2026 (380 fixtures, 38 matchdays)
-- ===========================================================================
-- 20260716000001_la_liga_seed.sql is recorded as applied but left no row: it
-- inserted into `is_active`, which 20260724000000 replaced with `status`. So the
-- competition never existed, and its 380 fixtures were never seeded at all.
--
-- This supersedes that seed. Fixtures and matchdays come straight from
-- football-data's `matchday` field — provider round data, not inferred from
-- dates, per 20260722204537_round_backfill_template.sql. La Liga is a double
-- round-robin, so a (home, away) ordered pair is unique across the season
-- (verified: 380 distinct pairs), which makes fixture-to-round assignment
-- unambiguous.
--
-- Team names are the canonical short forms in lib/team-name-aliases.ts. Both
-- providers normalize to these same 20 names (verified live against
-- football-data PD and ESPN esp.1), so results land from either source.
--
-- status='manage': the competition is not exposed to players until an admin
-- flips it to 'active'. Rounds are 'pending' for the same reason.
--
-- Rollback:
-- delete from public.competition_rounds where competition_id =
--   (select id from public.competitions where slug='la-liga-2026-2027');
-- delete from public.matches where competition_id =
--   (select id from public.competitions where slug='la-liga-2026-2027');
-- delete from public.competitions where slug='la-liga-2026-2027';

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
    'la-liga-2026-2027',
    'custom',
    'La Liga 2026-2027',
    'La Liga 2026-27',
    '2026-2027',
    '2026-08-15T00:00:00Z',
    '2027-05-30T00:00:00Z',
    'manage',
    jsonb_build_object(
      'stages', jsonb_build_array(
        jsonb_build_object('key','league','kind','league','order',1,'icon','league','hasGroupCode',false,
          'pointMultiplier', 1,
          'labels', jsonb_build_object('en','Regular season','es','Temporada regular','fr','Saison régulière','de','Hauptrunde'))
      ),
      'groups', jsonb_build_object('enabled', false)
    ),
    jsonb_build_object(
      'footballData', jsonb_build_object('code','PD','season','2026'),
      'espn', jsonb_build_object('leaguePath','esp.1')
    ),
    jsonb_build_object(
      'brandCode', 'LALIGA',
      'joinCodePrefix', 'LL',
      'newsQuery', '"La Liga" OR "LaLiga EA Sports" OR "Primera División"',
      'emailFromName', 'La Liga Pools',
      'hosts', jsonb_build_array('Spain')
    )
  )
  on conflict (slug) do update set
    status = excluded.status,
    tournament_end_at = excluded.tournament_end_at,
    format_config = excluded.format_config,
    providers = excluded.providers,
    branding = excluded.branding
  returning id into v_comp_id;

  -- ===== Matchday 1 (10 fixtures, first kickoff 2026-08-15 17:30:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 1', 1,
    '{"en": "Matchday 1", "es": "Jornada 1", "fr": "Journée 1", "de": "Spieltag 1"}'::jsonb,
    1,
    '2026-08-15 17:30:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:1", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Alavés', 'Getafe', '2026-08-15 17:30:00+00'::timestamptz),
      ('Sevilla', 'Rayo Vallecano', '2026-08-15 19:30:00+00'::timestamptz),
      ('Racing Santander', 'Villarreal', '2026-08-16 15:00:00+00'::timestamptz),
      ('Espanyol', 'Levante', '2026-08-16 17:00:00+00'::timestamptz),
      ('Celta Vigo', 'Osasuna', '2026-08-16 19:30:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Elche', '2026-08-17 19:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Málaga', '2026-08-19 19:00:00+00'::timestamptz),
      ('Valencia', 'Betis', '2026-08-25 19:00:00+00'::timestamptz),
      ('Real Madrid', 'Real Sociedad', '2026-08-26 19:00:00+00'::timestamptz),
      ('Barcelona', 'Athletic Club', '2026-08-27 19:00:00+00'::timestamptz)
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

  -- ===== Matchday 2 (10 fixtures, first kickoff 2026-08-20 19:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 2', 2,
    '{"en": "Matchday 2", "es": "Jornada 2", "fr": "Journée 2", "de": "Spieltag 2"}'::jsonb,
    2,
    '2026-08-20 19:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:2", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Rayo Vallecano', 'Alavés', '2026-08-20 19:00:00+00'::timestamptz),
      ('Betis', 'Real Sociedad', '2026-08-21 19:00:00+00'::timestamptz),
      ('Athletic Club', 'Sevilla', '2026-08-22 15:00:00+00'::timestamptz),
      ('Valencia', 'Celta Vigo', '2026-08-22 17:30:00+00'::timestamptz),
      ('Espanyol', 'Real Madrid', '2026-08-22 19:30:00+00'::timestamptz),
      ('Atlético Madrid', 'Villarreal', '2026-08-23 15:00:00+00'::timestamptz),
      ('Getafe', 'Racing Santander', '2026-08-23 17:30:00+00'::timestamptz),
      ('Elche', 'Barcelona', '2026-08-23 19:30:00+00'::timestamptz),
      ('Osasuna', 'Levante', '2026-08-24 17:30:00+00'::timestamptz),
      ('Málaga', 'Deportivo La Coruña', '2026-08-24 19:30:00+00'::timestamptz)
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

  -- ===== Matchday 3 (10 fixtures, first kickoff 2026-08-28 17:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 3', 3,
    '{"en": "Matchday 3", "es": "Jornada 3", "fr": "Journée 3", "de": "Spieltag 3"}'::jsonb,
    3,
    '2026-08-28 17:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:3", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Racing Santander', 'Elche', '2026-08-28 17:00:00+00'::timestamptz),
      ('Alavés', 'Villarreal', '2026-08-28 19:30:00+00'::timestamptz),
      ('Levante', 'Betis', '2026-08-29 15:00:00+00'::timestamptz),
      ('Real Sociedad', 'Espanyol', '2026-08-29 17:00:00+00'::timestamptz),
      ('Sevilla', 'Atlético Madrid', '2026-08-29 19:30:00+00'::timestamptz),
      ('Real Madrid', 'Málaga', '2026-08-30 15:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Valencia', '2026-08-30 17:30:00+00'::timestamptz),
      ('Celta Vigo', 'Athletic Club', '2026-08-30 19:30:00+00'::timestamptz),
      ('Osasuna', 'Getafe', '2026-08-31 17:30:00+00'::timestamptz),
      ('Barcelona', 'Rayo Vallecano', '2026-08-31 19:30:00+00'::timestamptz)
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

  -- ===== Matchday 4 (10 fixtures, first kickoff 2026-09-06 15:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 4', 4,
    '{"en": "Matchday 4", "es": "Jornada 4", "fr": "Journée 4", "de": "Spieltag 4"}'::jsonb,
    4,
    '2026-09-06 15:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:4", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Elche', 'Real Sociedad', '2026-09-06 15:00:00+00'::timestamptz),
      ('Valencia', 'Barcelona', '2026-09-06 15:00:00+00'::timestamptz),
      ('Rayo Vallecano', 'Racing Santander', '2026-09-06 15:00:00+00'::timestamptz),
      ('Espanyol', 'Sevilla', '2026-09-06 15:00:00+00'::timestamptz),
      ('Villarreal', 'Deportivo La Coruña', '2026-09-06 15:00:00+00'::timestamptz),
      ('Athletic Club', 'Atlético Madrid', '2026-09-06 15:00:00+00'::timestamptz),
      ('Alavés', 'Osasuna', '2026-09-06 15:00:00+00'::timestamptz),
      ('Getafe', 'Celta Vigo', '2026-09-06 15:00:00+00'::timestamptz),
      ('Málaga', 'Levante', '2026-09-06 15:00:00+00'::timestamptz),
      ('Betis', 'Real Madrid', '2026-09-06 15:00:00+00'::timestamptz)
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

  -- ===== Matchday 5 (10 fixtures, first kickoff 2026-09-13 15:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 5', 5,
    '{"en": "Matchday 5", "es": "Jornada 5", "fr": "Journée 5", "de": "Spieltag 5"}'::jsonb,
    5,
    '2026-09-13 15:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:5", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Getafe', 'Deportivo La Coruña', '2026-09-13 15:00:00+00'::timestamptz),
      ('Sevilla', 'Valencia', '2026-09-13 15:00:00+00'::timestamptz),
      ('Racing Santander', 'Alavés', '2026-09-13 15:00:00+00'::timestamptz),
      ('Villarreal', 'Betis', '2026-09-13 15:00:00+00'::timestamptz),
      ('Celta Vigo', 'Málaga', '2026-09-13 15:00:00+00'::timestamptz),
      ('Osasuna', 'Espanyol', '2026-09-13 15:00:00+00'::timestamptz),
      ('Real Sociedad', 'Atlético Madrid', '2026-09-13 15:00:00+00'::timestamptz),
      ('Levante', 'Barcelona', '2026-09-13 15:00:00+00'::timestamptz),
      ('Athletic Club', 'Elche', '2026-09-13 15:00:00+00'::timestamptz),
      ('Real Madrid', 'Rayo Vallecano', '2026-09-13 15:00:00+00'::timestamptz)
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

  -- ===== Matchday 6 (10 fixtures, first kickoff 2026-09-16 15:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 6', 6,
    '{"en": "Matchday 6", "es": "Jornada 6", "fr": "Journée 6", "de": "Spieltag 6"}'::jsonb,
    6,
    '2026-09-16 15:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:6", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Rayo Vallecano', 'Espanyol', '2026-09-16 15:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Sevilla', '2026-09-16 15:00:00+00'::timestamptz),
      ('Alavés', 'Valencia', '2026-09-16 15:00:00+00'::timestamptz),
      ('Elche', 'Real Madrid', '2026-09-16 15:00:00+00'::timestamptz),
      ('Real Sociedad', 'Celta Vigo', '2026-09-16 15:00:00+00'::timestamptz),
      ('Málaga', 'Villarreal', '2026-09-16 15:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Osasuna', '2026-09-16 15:00:00+00'::timestamptz),
      ('Levante', 'Athletic Club', '2026-09-16 15:00:00+00'::timestamptz),
      ('Betis', 'Getafe', '2026-09-16 15:00:00+00'::timestamptz),
      ('Barcelona', 'Racing Santander', '2026-09-16 15:00:00+00'::timestamptz)
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

  -- ===== Matchday 7 (10 fixtures, first kickoff 2026-09-20 15:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 7', 7,
    '{"en": "Matchday 7", "es": "Jornada 7", "fr": "Journée 7", "de": "Spieltag 7"}'::jsonb,
    7,
    '2026-09-20 15:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:7", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Atlético Madrid', 'Real Madrid', '2026-09-20 15:00:00+00'::timestamptz),
      ('Valencia', 'Real Sociedad', '2026-09-20 15:00:00+00'::timestamptz),
      ('Sevilla', 'Barcelona', '2026-09-20 15:00:00+00'::timestamptz),
      ('Athletic Club', 'Alavés', '2026-09-20 15:00:00+00'::timestamptz),
      ('Espanyol', 'Elche', '2026-09-20 15:00:00+00'::timestamptz),
      ('Osasuna', 'Rayo Vallecano', '2026-09-20 15:00:00+00'::timestamptz),
      ('Celta Vigo', 'Racing Santander', '2026-09-20 15:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Betis', '2026-09-20 15:00:00+00'::timestamptz),
      ('Villarreal', 'Levante', '2026-09-20 15:00:00+00'::timestamptz),
      ('Getafe', 'Málaga', '2026-09-20 15:00:00+00'::timestamptz)
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

  -- ===== Matchday 8 (10 fixtures, first kickoff 2026-10-11 15:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 8', 8,
    '{"en": "Matchday 8", "es": "Jornada 8", "fr": "Journée 8", "de": "Spieltag 8"}'::jsonb,
    8,
    '2026-10-11 15:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:8", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Rayo Vallecano', 'Athletic Club', '2026-10-11 15:00:00+00'::timestamptz),
      ('Alavés', 'Atlético Madrid', '2026-10-11 15:00:00+00'::timestamptz),
      ('Barcelona', 'Getafe', '2026-10-11 15:00:00+00'::timestamptz),
      ('Betis', 'Osasuna', '2026-10-11 15:00:00+00'::timestamptz),
      ('Real Madrid', 'Villarreal', '2026-10-11 15:00:00+00'::timestamptz),
      ('Elche', 'Celta Vigo', '2026-10-11 15:00:00+00'::timestamptz),
      ('Levante', 'Sevilla', '2026-10-11 15:00:00+00'::timestamptz),
      ('Racing Santander', 'Valencia', '2026-10-11 15:00:00+00'::timestamptz),
      ('Málaga', 'Espanyol', '2026-10-11 15:00:00+00'::timestamptz),
      ('Real Sociedad', 'Deportivo La Coruña', '2026-10-11 15:00:00+00'::timestamptz)
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

  -- ===== Matchday 9 (10 fixtures, first kickoff 2026-10-18 15:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 9', 9,
    '{"en": "Matchday 9", "es": "Jornada 9", "fr": "Journée 9", "de": "Spieltag 9"}'::jsonb,
    9,
    '2026-10-18 15:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:9", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Villarreal', 'Elche', '2026-10-18 15:00:00+00'::timestamptz),
      ('Real Madrid', 'Sevilla', '2026-10-18 15:00:00+00'::timestamptz),
      ('Espanyol', 'Atlético Madrid', '2026-10-18 15:00:00+00'::timestamptz),
      ('Valencia', 'Athletic Club', '2026-10-18 15:00:00+00'::timestamptz),
      ('Celta Vigo', 'Alavés', '2026-10-18 15:00:00+00'::timestamptz),
      ('Betis', 'Barcelona', '2026-10-18 15:00:00+00'::timestamptz),
      ('Málaga', 'Real Sociedad', '2026-10-18 15:00:00+00'::timestamptz),
      ('Osasuna', 'Racing Santander', '2026-10-18 15:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Levante', '2026-10-18 15:00:00+00'::timestamptz),
      ('Getafe', 'Rayo Vallecano', '2026-10-18 15:00:00+00'::timestamptz)
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

  -- ===== Matchday 10 (10 fixtures, first kickoff 2026-10-25 16:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 10', 10,
    '{"en": "Matchday 10", "es": "Jornada 10", "fr": "Journée 10", "de": "Spieltag 10"}'::jsonb,
    10,
    '2026-10-25 16:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:10", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Rayo Vallecano', 'Elche', '2026-10-25 16:00:00+00'::timestamptz),
      ('Alavés', 'Málaga', '2026-10-25 16:00:00+00'::timestamptz),
      ('Athletic Club', 'Getafe', '2026-10-25 16:00:00+00'::timestamptz),
      ('Sevilla', 'Osasuna', '2026-10-25 16:00:00+00'::timestamptz),
      ('Valencia', 'Villarreal', '2026-10-25 16:00:00+00'::timestamptz),
      ('Barcelona', 'Real Madrid', '2026-10-25 16:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Deportivo La Coruña', '2026-10-25 16:00:00+00'::timestamptz),
      ('Celta Vigo', 'Betis', '2026-10-25 16:00:00+00'::timestamptz),
      ('Real Sociedad', 'Levante', '2026-10-25 16:00:00+00'::timestamptz),
      ('Racing Santander', 'Espanyol', '2026-10-25 16:00:00+00'::timestamptz)
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

  -- ===== Matchday 11 (10 fixtures, first kickoff 2026-11-01 16:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 11', 11,
    '{"en": "Matchday 11", "es": "Jornada 11", "fr": "Journée 11", "de": "Spieltag 11"}'::jsonb,
    11,
    '2026-11-01 16:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:11", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Betis', 'Málaga', '2026-11-01 16:00:00+00'::timestamptz),
      ('Villarreal', 'Espanyol', '2026-11-01 16:00:00+00'::timestamptz),
      ('Elche', 'Valencia', '2026-11-01 16:00:00+00'::timestamptz),
      ('Athletic Club', 'Real Sociedad', '2026-11-01 16:00:00+00'::timestamptz),
      ('Levante', 'Atlético Madrid', '2026-11-01 16:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Osasuna', '2026-11-01 16:00:00+00'::timestamptz),
      ('Barcelona', 'Alavés', '2026-11-01 16:00:00+00'::timestamptz),
      ('Getafe', 'Sevilla', '2026-11-01 16:00:00+00'::timestamptz),
      ('Racing Santander', 'Real Madrid', '2026-11-01 16:00:00+00'::timestamptz),
      ('Rayo Vallecano', 'Celta Vigo', '2026-11-01 16:00:00+00'::timestamptz)
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

  -- ===== Matchday 12 (10 fixtures, first kickoff 2026-11-08 16:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 12', 12,
    '{"en": "Matchday 12", "es": "Jornada 12", "fr": "Journée 12", "de": "Spieltag 12"}'::jsonb,
    12,
    '2026-11-08 16:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:12", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Elche', 'Betis', '2026-11-08 16:00:00+00'::timestamptz),
      ('Osasuna', 'Athletic Club', '2026-11-08 16:00:00+00'::timestamptz),
      ('Sevilla', 'Alavés', '2026-11-08 16:00:00+00'::timestamptz),
      ('Valencia', 'Real Madrid', '2026-11-08 16:00:00+00'::timestamptz),
      ('Celta Vigo', 'Levante', '2026-11-08 16:00:00+00'::timestamptz),
      ('Real Sociedad', 'Rayo Vallecano', '2026-11-08 16:00:00+00'::timestamptz),
      ('Málaga', 'Racing Santander', '2026-11-08 16:00:00+00'::timestamptz),
      ('Espanyol', 'Deportivo La Coruña', '2026-11-08 16:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Barcelona', '2026-11-08 16:00:00+00'::timestamptz),
      ('Villarreal', 'Getafe', '2026-11-08 16:00:00+00'::timestamptz)
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

  -- ===== Matchday 13 (10 fixtures, first kickoff 2026-11-22 16:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 13', 13,
    '{"en": "Matchday 13", "es": "Jornada 13", "fr": "Journée 13", "de": "Spieltag 13"}'::jsonb,
    13,
    '2026-11-22 16:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:13", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Athletic Club', 'Espanyol', '2026-11-22 16:00:00+00'::timestamptz),
      ('Barcelona', 'Villarreal', '2026-11-22 16:00:00+00'::timestamptz),
      ('Racing Santander', 'Real Sociedad', '2026-11-22 16:00:00+00'::timestamptz),
      ('Rayo Vallecano', 'Valencia', '2026-11-22 16:00:00+00'::timestamptz),
      ('Osasuna', 'Málaga', '2026-11-22 16:00:00+00'::timestamptz),
      ('Getafe', 'Atlético Madrid', '2026-11-22 16:00:00+00'::timestamptz),
      ('Real Madrid', 'Celta Vigo', '2026-11-22 16:00:00+00'::timestamptz),
      ('Alavés', 'Deportivo La Coruña', '2026-11-22 16:00:00+00'::timestamptz),
      ('Sevilla', 'Betis', '2026-11-22 16:00:00+00'::timestamptz),
      ('Levante', 'Elche', '2026-11-22 16:00:00+00'::timestamptz)
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

  -- ===== Matchday 14 (10 fixtures, first kickoff 2026-11-29 16:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 14', 14,
    '{"en": "Matchday 14", "es": "Jornada 14", "fr": "Journée 14", "de": "Spieltag 14"}'::jsonb,
    14,
    '2026-11-29 16:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:14", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Celta Vigo', 'Villarreal', '2026-11-29 16:00:00+00'::timestamptz),
      ('Elche', 'Atlético Madrid', '2026-11-29 16:00:00+00'::timestamptz),
      ('Betis', 'Rayo Vallecano', '2026-11-29 16:00:00+00'::timestamptz),
      ('Valencia', 'Osasuna', '2026-11-29 16:00:00+00'::timestamptz),
      ('Real Madrid', 'Alavés', '2026-11-29 16:00:00+00'::timestamptz),
      ('Espanyol', 'Getafe', '2026-11-29 16:00:00+00'::timestamptz),
      ('Real Sociedad', 'Sevilla', '2026-11-29 16:00:00+00'::timestamptz),
      ('Levante', 'Racing Santander', '2026-11-29 16:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Barcelona', '2026-11-29 16:00:00+00'::timestamptz),
      ('Málaga', 'Athletic Club', '2026-11-29 16:00:00+00'::timestamptz)
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

  -- ===== Matchday 15 (10 fixtures, first kickoff 2026-12-06 16:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 15', 15,
    '{"en": "Matchday 15", "es": "Jornada 15", "fr": "Journée 15", "de": "Spieltag 15"}'::jsonb,
    15,
    '2026-12-06 16:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:15", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Osasuna', 'Elche', '2026-12-06 16:00:00+00'::timestamptz),
      ('Sevilla', 'Málaga', '2026-12-06 16:00:00+00'::timestamptz),
      ('Alavés', 'Espanyol', '2026-12-06 16:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Betis', '2026-12-06 16:00:00+00'::timestamptz),
      ('Racing Santander', 'Deportivo La Coruña', '2026-12-06 16:00:00+00'::timestamptz),
      ('Barcelona', 'Celta Vigo', '2026-12-06 16:00:00+00'::timestamptz),
      ('Getafe', 'Valencia', '2026-12-06 16:00:00+00'::timestamptz),
      ('Athletic Club', 'Real Madrid', '2026-12-06 16:00:00+00'::timestamptz),
      ('Villarreal', 'Real Sociedad', '2026-12-06 16:00:00+00'::timestamptz),
      ('Rayo Vallecano', 'Levante', '2026-12-06 16:00:00+00'::timestamptz)
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

  -- ===== Matchday 16 (10 fixtures, first kickoff 2026-12-13 16:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 16', 16,
    '{"en": "Matchday 16", "es": "Jornada 16", "fr": "Journée 16", "de": "Spieltag 16"}'::jsonb,
    16,
    '2026-12-13 16:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:16", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Espanyol', 'Celta Vigo', '2026-12-13 16:00:00+00'::timestamptz),
      ('Málaga', 'Barcelona', '2026-12-13 16:00:00+00'::timestamptz),
      ('Real Madrid', 'Osasuna', '2026-12-13 16:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Athletic Club', '2026-12-13 16:00:00+00'::timestamptz),
      ('Levante', 'Alavés', '2026-12-13 16:00:00+00'::timestamptz),
      ('Elche', 'Sevilla', '2026-12-13 16:00:00+00'::timestamptz),
      ('Villarreal', 'Rayo Vallecano', '2026-12-13 16:00:00+00'::timestamptz),
      ('Betis', 'Racing Santander', '2026-12-13 16:00:00+00'::timestamptz),
      ('Real Sociedad', 'Getafe', '2026-12-13 16:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Valencia', '2026-12-13 16:00:00+00'::timestamptz)
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

  -- ===== Matchday 17 (10 fixtures, first kickoff 2026-12-20 16:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 17', 17,
    '{"en": "Matchday 17", "es": "Jornada 17", "fr": "Journée 17", "de": "Spieltag 17"}'::jsonb,
    17,
    '2026-12-20 16:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:17", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Athletic Club', 'Betis', '2026-12-20 16:00:00+00'::timestamptz),
      ('Getafe', 'Levante', '2026-12-20 16:00:00+00'::timestamptz),
      ('Alavés', 'Elche', '2026-12-20 16:00:00+00'::timestamptz),
      ('Valencia', 'Espanyol', '2026-12-20 16:00:00+00'::timestamptz),
      ('Osasuna', 'Villarreal', '2026-12-20 16:00:00+00'::timestamptz),
      ('Barcelona', 'Real Sociedad', '2026-12-20 16:00:00+00'::timestamptz),
      ('Celta Vigo', 'Atlético Madrid', '2026-12-20 16:00:00+00'::timestamptz),
      ('Rayo Vallecano', 'Málaga', '2026-12-20 16:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Real Madrid', '2026-12-20 16:00:00+00'::timestamptz),
      ('Sevilla', 'Racing Santander', '2026-12-20 16:00:00+00'::timestamptz)
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

  -- ===== Matchday 18 (10 fixtures, first kickoff 2027-01-03 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 18', 18,
    '{"en": "Matchday 18", "es": "Jornada 18", "fr": "Journée 18", "de": "Spieltag 18"}'::jsonb,
    18,
    '2027-01-03 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:18", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Real Madrid', 'Getafe', '2027-01-03 12:00:00+00'::timestamptz),
      ('Real Sociedad', 'Osasuna', '2027-01-03 12:00:00+00'::timestamptz),
      ('Levante', 'Valencia', '2027-01-03 12:00:00+00'::timestamptz),
      ('Racing Santander', 'Athletic Club', '2027-01-03 12:00:00+00'::timestamptz),
      ('Málaga', 'Elche', '2027-01-03 12:00:00+00'::timestamptz),
      ('Betis', 'Alavés', '2027-01-03 12:00:00+00'::timestamptz),
      ('Celta Vigo', 'Deportivo La Coruña', '2027-01-03 12:00:00+00'::timestamptz),
      ('Espanyol', 'Barcelona', '2027-01-03 12:00:00+00'::timestamptz),
      ('Villarreal', 'Sevilla', '2027-01-03 12:00:00+00'::timestamptz),
      ('Rayo Vallecano', 'Atlético Madrid', '2027-01-03 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 19 (10 fixtures, first kickoff 2027-01-10 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 19', 19,
    '{"en": "Matchday 19", "es": "Jornada 19", "fr": "Journée 19", "de": "Spieltag 19"}'::jsonb,
    19,
    '2027-01-10 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:19", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Athletic Club', 'Villarreal', '2027-01-10 12:00:00+00'::timestamptz),
      ('Elche', 'Getafe', '2027-01-10 12:00:00+00'::timestamptz),
      ('Real Madrid', 'Levante', '2027-01-10 12:00:00+00'::timestamptz),
      ('Osasuna', 'Barcelona', '2027-01-10 12:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Rayo Vallecano', '2027-01-10 12:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Racing Santander', '2027-01-10 12:00:00+00'::timestamptz),
      ('Alavés', 'Real Sociedad', '2027-01-10 12:00:00+00'::timestamptz),
      ('Sevilla', 'Celta Vigo', '2027-01-10 12:00:00+00'::timestamptz),
      ('Espanyol', 'Betis', '2027-01-10 12:00:00+00'::timestamptz),
      ('Valencia', 'Málaga', '2027-01-10 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 20 (10 fixtures, first kickoff 2027-01-17 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 20', 20,
    '{"en": "Matchday 20", "es": "Jornada 20", "fr": "Journée 20", "de": "Spieltag 20"}'::jsonb,
    20,
    '2027-01-17 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:20", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Málaga', 'Real Madrid', '2027-01-17 12:00:00+00'::timestamptz),
      ('Barcelona', 'Elche', '2027-01-17 12:00:00+00'::timestamptz),
      ('Villarreal', 'Alavés', '2027-01-17 12:00:00+00'::timestamptz),
      ('Racing Santander', 'Osasuna', '2027-01-17 12:00:00+00'::timestamptz),
      ('Levante', 'Espanyol', '2027-01-17 12:00:00+00'::timestamptz),
      ('Celta Vigo', 'Valencia', '2027-01-17 12:00:00+00'::timestamptz),
      ('Getafe', 'Athletic Club', '2027-01-17 12:00:00+00'::timestamptz),
      ('Rayo Vallecano', 'Sevilla', '2027-01-17 12:00:00+00'::timestamptz),
      ('Betis', 'Deportivo La Coruña', '2027-01-17 12:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Real Sociedad', '2027-01-17 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 21 (10 fixtures, first kickoff 2027-01-24 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 21', 21,
    '{"en": "Matchday 21", "es": "Jornada 21", "fr": "Journée 21", "de": "Spieltag 21"}'::jsonb,
    21,
    '2027-01-24 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:21", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Real Madrid', 'Betis', '2027-01-24 12:00:00+00'::timestamptz),
      ('Getafe', 'Osasuna', '2027-01-24 12:00:00+00'::timestamptz),
      ('Valencia', 'Sevilla', '2027-01-24 12:00:00+00'::timestamptz),
      ('Elche', 'Rayo Vallecano', '2027-01-24 12:00:00+00'::timestamptz),
      ('Alavés', 'Barcelona', '2027-01-24 12:00:00+00'::timestamptz),
      ('Real Sociedad', 'Málaga', '2027-01-24 12:00:00+00'::timestamptz),
      ('Racing Santander', 'Celta Vigo', '2027-01-24 12:00:00+00'::timestamptz),
      ('Athletic Club', 'Levante', '2027-01-24 12:00:00+00'::timestamptz),
      ('Espanyol', 'Villarreal', '2027-01-24 12:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Atlético Madrid', '2027-01-24 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 22 (10 fixtures, first kickoff 2027-01-31 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 22', 22,
    '{"en": "Matchday 22", "es": "Jornada 22", "fr": "Journée 22", "de": "Spieltag 22"}'::jsonb,
    22,
    '2027-01-31 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:22", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Betis', 'Elche', '2027-01-31 12:00:00+00'::timestamptz),
      ('Rayo Vallecano', 'Real Madrid', '2027-01-31 12:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Espanyol', '2027-01-31 12:00:00+00'::timestamptz),
      ('Celta Vigo', 'Getafe', '2027-01-31 12:00:00+00'::timestamptz),
      ('Villarreal', 'Racing Santander', '2027-01-31 12:00:00+00'::timestamptz),
      ('Levante', 'Real Sociedad', '2027-01-31 12:00:00+00'::timestamptz),
      ('Barcelona', 'Valencia', '2027-01-31 12:00:00+00'::timestamptz),
      ('Sevilla', 'Athletic Club', '2027-01-31 12:00:00+00'::timestamptz),
      ('Osasuna', 'Deportivo La Coruña', '2027-01-31 12:00:00+00'::timestamptz),
      ('Málaga', 'Alavés', '2027-01-31 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 23 (10 fixtures, first kickoff 2027-02-07 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 23', 23,
    '{"en": "Matchday 23", "es": "Jornada 23", "fr": "Journée 23", "de": "Spieltag 23"}'::jsonb,
    23,
    '2027-02-07 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:23", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Athletic Club', 'Osasuna', '2027-02-07 12:00:00+00'::timestamptz),
      ('Alavés', 'Celta Vigo', '2027-02-07 12:00:00+00'::timestamptz),
      ('Betis', 'Sevilla', '2027-02-07 12:00:00+00'::timestamptz),
      ('Elche', 'Levante', '2027-02-07 12:00:00+00'::timestamptz),
      ('Espanyol', 'Rayo Vallecano', '2027-02-07 12:00:00+00'::timestamptz),
      ('Getafe', 'Villarreal', '2027-02-07 12:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Málaga', '2027-02-07 12:00:00+00'::timestamptz),
      ('Real Sociedad', 'Real Madrid', '2027-02-07 12:00:00+00'::timestamptz),
      ('Valencia', 'Racing Santander', '2027-02-07 12:00:00+00'::timestamptz),
      ('Barcelona', 'Atlético Madrid', '2027-02-07 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 24 (10 fixtures, first kickoff 2027-02-14 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 24', 24,
    '{"en": "Matchday 24", "es": "Jornada 24", "fr": "Journée 24", "de": "Spieltag 24"}'::jsonb,
    24,
    '2027-02-14 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:24", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Sevilla', 'Espanyol', '2027-02-14 12:00:00+00'::timestamptz),
      ('Osasuna', 'Atlético Madrid', '2027-02-14 12:00:00+00'::timestamptz),
      ('Celta Vigo', 'Rayo Vallecano', '2027-02-14 12:00:00+00'::timestamptz),
      ('Villarreal', 'Barcelona', '2027-02-14 12:00:00+00'::timestamptz),
      ('Real Sociedad', 'Betis', '2027-02-14 12:00:00+00'::timestamptz),
      ('Elche', 'Deportivo La Coruña', '2027-02-14 12:00:00+00'::timestamptz),
      ('Valencia', 'Alavés', '2027-02-14 12:00:00+00'::timestamptz),
      ('Levante', 'Málaga', '2027-02-14 12:00:00+00'::timestamptz),
      ('Racing Santander', 'Getafe', '2027-02-14 12:00:00+00'::timestamptz),
      ('Real Madrid', 'Athletic Club', '2027-02-14 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 25 (10 fixtures, first kickoff 2027-02-21 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 25', 25,
    '{"en": "Matchday 25", "es": "Jornada 25", "fr": "Journée 25", "de": "Spieltag 25"}'::jsonb,
    25,
    '2027-02-21 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:25", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Alavés', 'Racing Santander', '2027-02-21 12:00:00+00'::timestamptz),
      ('Málaga', 'Betis', '2027-02-21 12:00:00+00'::timestamptz),
      ('Villarreal', 'Valencia', '2027-02-21 12:00:00+00'::timestamptz),
      ('Barcelona', 'Levante', '2027-02-21 12:00:00+00'::timestamptz),
      ('Athletic Club', 'Celta Vigo', '2027-02-21 12:00:00+00'::timestamptz),
      ('Espanyol', 'Osasuna', '2027-02-21 12:00:00+00'::timestamptz),
      ('Sevilla', 'Real Madrid', '2027-02-21 12:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Elche', '2027-02-21 12:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Real Sociedad', '2027-02-21 12:00:00+00'::timestamptz),
      ('Rayo Vallecano', 'Getafe', '2027-02-21 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 26 (10 fixtures, first kickoff 2027-02-28 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 26', 26,
    '{"en": "Matchday 26", "es": "Jornada 26", "fr": "Journée 26", "de": "Spieltag 26"}'::jsonb,
    26,
    '2027-02-28 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:26", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Celta Vigo', 'Espanyol', '2027-02-28 12:00:00+00'::timestamptz),
      ('Levante', 'Deportivo La Coruña', '2027-02-28 12:00:00+00'::timestamptz),
      ('Málaga', 'Atlético Madrid', '2027-02-28 12:00:00+00'::timestamptz),
      ('Osasuna', 'Sevilla', '2027-02-28 12:00:00+00'::timestamptz),
      ('Real Madrid', 'Valencia', '2027-02-28 12:00:00+00'::timestamptz),
      ('Getafe', 'Alavés', '2027-02-28 12:00:00+00'::timestamptz),
      ('Athletic Club', 'Barcelona', '2027-02-28 12:00:00+00'::timestamptz),
      ('Racing Santander', 'Rayo Vallecano', '2027-02-28 12:00:00+00'::timestamptz),
      ('Betis', 'Villarreal', '2027-02-28 12:00:00+00'::timestamptz),
      ('Real Sociedad', 'Elche', '2027-02-28 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 27 (10 fixtures, first kickoff 2027-03-07 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 27', 27,
    '{"en": "Matchday 27", "es": "Jornada 27", "fr": "Journée 27", "de": "Spieltag 27"}'::jsonb,
    27,
    '2027-03-07 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:27", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Barcelona', 'Betis', '2027-03-07 12:00:00+00'::timestamptz),
      ('Elche', 'Málaga', '2027-03-07 12:00:00+00'::timestamptz),
      ('Alavés', 'Athletic Club', '2027-03-07 12:00:00+00'::timestamptz),
      ('Rayo Vallecano', 'Osasuna', '2027-03-07 12:00:00+00'::timestamptz),
      ('Sevilla', 'Real Sociedad', '2027-03-07 12:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Celta Vigo', '2027-03-07 12:00:00+00'::timestamptz),
      ('Villarreal', 'Real Madrid', '2027-03-07 12:00:00+00'::timestamptz),
      ('Valencia', 'Levante', '2027-03-07 12:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Getafe', '2027-03-07 12:00:00+00'::timestamptz),
      ('Espanyol', 'Racing Santander', '2027-03-07 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 28 (10 fixtures, first kickoff 2027-03-14 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 28', 28,
    '{"en": "Matchday 28", "es": "Jornada 28", "fr": "Journée 28", "de": "Spieltag 28"}'::jsonb,
    28,
    '2027-03-14 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:28", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Osasuna', 'Celta Vigo', '2027-03-14 12:00:00+00'::timestamptz),
      ('Elche', 'Villarreal', '2027-03-14 12:00:00+00'::timestamptz),
      ('Alavés', 'Sevilla', '2027-03-14 12:00:00+00'::timestamptz),
      ('Athletic Club', 'Valencia', '2027-03-14 12:00:00+00'::timestamptz),
      ('Betis', 'Levante', '2027-03-14 12:00:00+00'::timestamptz),
      ('Racing Santander', 'Atlético Madrid', '2027-03-14 12:00:00+00'::timestamptz),
      ('Málaga', 'Rayo Vallecano', '2027-03-14 12:00:00+00'::timestamptz),
      ('Getafe', 'Real Sociedad', '2027-03-14 12:00:00+00'::timestamptz),
      ('Barcelona', 'Deportivo La Coruña', '2027-03-14 12:00:00+00'::timestamptz),
      ('Real Madrid', 'Espanyol', '2027-03-14 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 29 (10 fixtures, first kickoff 2027-03-21 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 29', 29,
    '{"en": "Matchday 29", "es": "Jornada 29", "fr": "Journée 29", "de": "Spieltag 29"}'::jsonb,
    29,
    '2027-03-21 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:29", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Villarreal', 'Málaga', '2027-03-21 12:00:00+00'::timestamptz),
      ('Sevilla', 'Elche', '2027-03-21 12:00:00+00'::timestamptz),
      ('Levante', 'Osasuna', '2027-03-21 12:00:00+00'::timestamptz),
      ('Celta Vigo', 'Real Madrid', '2027-03-21 12:00:00+00'::timestamptz),
      ('Rayo Vallecano', 'Barcelona', '2027-03-21 12:00:00+00'::timestamptz),
      ('Real Sociedad', 'Alavés', '2027-03-21 12:00:00+00'::timestamptz),
      ('Espanyol', 'Athletic Club', '2027-03-21 12:00:00+00'::timestamptz),
      ('Racing Santander', 'Betis', '2027-03-21 12:00:00+00'::timestamptz),
      ('Valencia', 'Deportivo La Coruña', '2027-03-21 12:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Getafe', '2027-03-21 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 30 (10 fixtures, first kickoff 2027-04-04 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 30', 30,
    '{"en": "Matchday 30", "es": "Jornada 30", "fr": "Journée 30", "de": "Spieltag 30"}'::jsonb,
    30,
    '2027-04-04 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:30", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Levante', 'Rayo Vallecano', '2027-04-04 12:00:00+00'::timestamptz),
      ('Barcelona', 'Sevilla', '2027-04-04 12:00:00+00'::timestamptz),
      ('Málaga', 'Osasuna', '2027-04-04 12:00:00+00'::timestamptz),
      ('Athletic Club', 'Racing Santander', '2027-04-04 12:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Villarreal', '2027-04-04 12:00:00+00'::timestamptz),
      ('Real Sociedad', 'Valencia', '2027-04-04 12:00:00+00'::timestamptz),
      ('Elche', 'Alavés', '2027-04-04 12:00:00+00'::timestamptz),
      ('Real Madrid', 'Atlético Madrid', '2027-04-04 12:00:00+00'::timestamptz),
      ('Getafe', 'Espanyol', '2027-04-04 12:00:00+00'::timestamptz),
      ('Betis', 'Celta Vigo', '2027-04-04 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 31 (10 fixtures, first kickoff 2027-04-11 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 31', 31,
    '{"en": "Matchday 31", "es": "Jornada 31", "fr": "Journée 31", "de": "Spieltag 31"}'::jsonb,
    31,
    '2027-04-11 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:31", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Rayo Vallecano', 'Real Sociedad', '2027-04-11 12:00:00+00'::timestamptz),
      ('Espanyol', 'Málaga', '2027-04-11 12:00:00+00'::timestamptz),
      ('Villarreal', 'Athletic Club', '2027-04-11 12:00:00+00'::timestamptz),
      ('Alavés', 'Betis', '2027-04-11 12:00:00+00'::timestamptz),
      ('Valencia', 'Getafe', '2027-04-11 12:00:00+00'::timestamptz),
      ('Sevilla', 'Deportivo La Coruña', '2027-04-11 12:00:00+00'::timestamptz),
      ('Celta Vigo', 'Elche', '2027-04-11 12:00:00+00'::timestamptz),
      ('Racing Santander', 'Barcelona', '2027-04-11 12:00:00+00'::timestamptz),
      ('Osasuna', 'Real Madrid', '2027-04-11 12:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Levante', '2027-04-11 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 32 (10 fixtures, first kickoff 2027-04-18 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 32', 32,
    '{"en": "Matchday 32", "es": "Jornada 32", "fr": "Journée 32", "de": "Spieltag 32"}'::jsonb,
    32,
    '2027-04-18 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:32", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Atlético Madrid', 'Sevilla', '2027-04-18 12:00:00+00'::timestamptz),
      ('Barcelona', 'Espanyol', '2027-04-18 12:00:00+00'::timestamptz),
      ('Levante', 'Villarreal', '2027-04-18 12:00:00+00'::timestamptz),
      ('Real Sociedad', 'Racing Santander', '2027-04-18 12:00:00+00'::timestamptz),
      ('Málaga', 'Valencia', '2027-04-18 12:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Celta Vigo', '2027-04-18 12:00:00+00'::timestamptz),
      ('Elche', 'Osasuna', '2027-04-18 12:00:00+00'::timestamptz),
      ('Alavés', 'Rayo Vallecano', '2027-04-18 12:00:00+00'::timestamptz),
      ('Betis', 'Athletic Club', '2027-04-18 12:00:00+00'::timestamptz),
      ('Getafe', 'Real Madrid', '2027-04-18 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 33 (10 fixtures, first kickoff 2027-04-21 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 33', 33,
    '{"en": "Matchday 33", "es": "Jornada 33", "fr": "Journée 33", "de": "Spieltag 33"}'::jsonb,
    33,
    '2027-04-21 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:33", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Getafe', 'Betis', '2027-04-21 12:00:00+00'::timestamptz),
      ('Valencia', 'Rayo Vallecano', '2027-04-21 12:00:00+00'::timestamptz),
      ('Celta Vigo', 'Barcelona', '2027-04-21 12:00:00+00'::timestamptz),
      ('Osasuna', 'Alavés', '2027-04-21 12:00:00+00'::timestamptz),
      ('Real Madrid', 'Elche', '2027-04-21 12:00:00+00'::timestamptz),
      ('Athletic Club', 'Deportivo La Coruña', '2027-04-21 12:00:00+00'::timestamptz),
      ('Racing Santander', 'Málaga', '2027-04-21 12:00:00+00'::timestamptz),
      ('Villarreal', 'Atlético Madrid', '2027-04-21 12:00:00+00'::timestamptz),
      ('Sevilla', 'Levante', '2027-04-21 12:00:00+00'::timestamptz),
      ('Espanyol', 'Real Sociedad', '2027-04-21 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 34 (10 fixtures, first kickoff 2027-05-02 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 34', 34,
    '{"en": "Matchday 34", "es": "Jornada 34", "fr": "Journée 34", "de": "Spieltag 34"}'::jsonb,
    34,
    '2027-05-02 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:34", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Deportivo La Coruña', 'Racing Santander', '2027-05-02 12:00:00+00'::timestamptz),
      ('Celta Vigo', 'Sevilla', '2027-05-02 12:00:00+00'::timestamptz),
      ('Real Sociedad', 'Athletic Club', '2027-05-02 12:00:00+00'::timestamptz),
      ('Barcelona', 'Osasuna', '2027-05-02 12:00:00+00'::timestamptz),
      ('Rayo Vallecano', 'Villarreal', '2027-05-02 12:00:00+00'::timestamptz),
      ('Málaga', 'Getafe', '2027-05-02 12:00:00+00'::timestamptz),
      ('Betis', 'Valencia', '2027-05-02 12:00:00+00'::timestamptz),
      ('Elche', 'Espanyol', '2027-05-02 12:00:00+00'::timestamptz),
      ('Levante', 'Real Madrid', '2027-05-02 12:00:00+00'::timestamptz),
      ('Atlético Madrid', 'Alavés', '2027-05-02 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 35 (10 fixtures, first kickoff 2027-05-09 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 35', 35,
    '{"en": "Matchday 35", "es": "Jornada 35", "fr": "Journée 35", "de": "Spieltag 35"}'::jsonb,
    35,
    '2027-05-09 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:35", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Valencia', 'Atlético Madrid', '2027-05-09 12:00:00+00'::timestamptz),
      ('Osasuna', 'Real Sociedad', '2027-05-09 12:00:00+00'::timestamptz),
      ('Alavés', 'Levante', '2027-05-09 12:00:00+00'::timestamptz),
      ('Athletic Club', 'Málaga', '2027-05-09 12:00:00+00'::timestamptz),
      ('Racing Santander', 'Sevilla', '2027-05-09 12:00:00+00'::timestamptz),
      ('Rayo Vallecano', 'Deportivo La Coruña', '2027-05-09 12:00:00+00'::timestamptz),
      ('Betis', 'Espanyol', '2027-05-09 12:00:00+00'::timestamptz),
      ('Real Madrid', 'Barcelona', '2027-05-09 12:00:00+00'::timestamptz),
      ('Getafe', 'Elche', '2027-05-09 12:00:00+00'::timestamptz),
      ('Villarreal', 'Celta Vigo', '2027-05-09 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 36 (10 fixtures, first kickoff 2027-05-16 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 36', 36,
    '{"en": "Matchday 36", "es": "Jornada 36", "fr": "Journée 36", "de": "Spieltag 36"}'::jsonb,
    36,
    '2027-05-16 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:36", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Atlético Madrid', 'Rayo Vallecano', '2027-05-16 12:00:00+00'::timestamptz),
      ('Sevilla', 'Villarreal', '2027-05-16 12:00:00+00'::timestamptz),
      ('Real Sociedad', 'Barcelona', '2027-05-16 12:00:00+00'::timestamptz),
      ('Elche', 'Athletic Club', '2027-05-16 12:00:00+00'::timestamptz),
      ('Málaga', 'Celta Vigo', '2027-05-16 12:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Alavés', '2027-05-16 12:00:00+00'::timestamptz),
      ('Levante', 'Getafe', '2027-05-16 12:00:00+00'::timestamptz),
      ('Espanyol', 'Valencia', '2027-05-16 12:00:00+00'::timestamptz),
      ('Real Madrid', 'Racing Santander', '2027-05-16 12:00:00+00'::timestamptz),
      ('Osasuna', 'Betis', '2027-05-16 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 37 (10 fixtures, first kickoff 2027-05-23 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 37', 37,
    '{"en": "Matchday 37", "es": "Jornada 37", "fr": "Journée 37", "de": "Spieltag 37"}'::jsonb,
    37,
    '2027-05-23 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:37", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Atlético Madrid', 'Athletic Club', '2027-05-23 12:00:00+00'::timestamptz),
      ('Alavés', 'Real Madrid', '2027-05-23 12:00:00+00'::timestamptz),
      ('Sevilla', 'Getafe', '2027-05-23 12:00:00+00'::timestamptz),
      ('Villarreal', 'Osasuna', '2027-05-23 12:00:00+00'::timestamptz),
      ('Racing Santander', 'Levante', '2027-05-23 12:00:00+00'::timestamptz),
      ('Deportivo La Coruña', 'Espanyol', '2027-05-23 12:00:00+00'::timestamptz),
      ('Rayo Vallecano', 'Betis', '2027-05-23 12:00:00+00'::timestamptz),
      ('Barcelona', 'Málaga', '2027-05-23 12:00:00+00'::timestamptz),
      ('Valencia', 'Elche', '2027-05-23 12:00:00+00'::timestamptz),
      ('Celta Vigo', 'Real Sociedad', '2027-05-23 12:00:00+00'::timestamptz)
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

  -- ===== Matchday 38 (10 fixtures, first kickoff 2027-05-30 12:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Matchday 38', 38,
    '{"en": "Matchday 38", "es": "Jornada 38", "fr": "Journée 38", "de": "Spieltag 38"}'::jsonb,
    38,
    '2027-05-30 12:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "football-data", "provider_round": "REGULAR_SEASON:38", "code": "PD", "season": "2026"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with fx(home_team, away_team, kickoff_at) as (values
      ('Levante', 'Celta Vigo', '2027-05-30 12:00:00+00'::timestamptz),
      ('Real Madrid', 'Deportivo La Coruña', '2027-05-30 12:00:00+00'::timestamptz),
      ('Betis', 'Atlético Madrid', '2027-05-30 12:00:00+00'::timestamptz),
      ('Real Sociedad', 'Villarreal', '2027-05-30 12:00:00+00'::timestamptz),
      ('Málaga', 'Sevilla', '2027-05-30 12:00:00+00'::timestamptz),
      ('Elche', 'Racing Santander', '2027-05-30 12:00:00+00'::timestamptz),
      ('Athletic Club', 'Rayo Vallecano', '2027-05-30 12:00:00+00'::timestamptz),
      ('Espanyol', 'Alavés', '2027-05-30 12:00:00+00'::timestamptz),
      ('Getafe', 'Barcelona', '2027-05-30 12:00:00+00'::timestamptz),
      ('Osasuna', 'Valencia', '2027-05-30 12:00:00+00'::timestamptz)
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

  raise notice 'La Liga 2026-27: inserted % fixtures across 38 matchdays', v_total;

  -- Every fixture must belong to a matchday, or a wagered round would silently
  -- omit it from scoring.
  if exists (
    select 1 from public.matches
    where competition_id = v_comp_id and round_id is null
  ) then
    raise exception 'La Liga has fixtures with no round assigned: %',
      (select count(*) from public.matches
       where competition_id = v_comp_id and round_id is null);
  end if;

  if (select count(*) from public.competition_rounds where competition_id = v_comp_id) <> 38 then
    raise exception 'Expected 38 La Liga matchdays, got %',
      (select count(*) from public.competition_rounds where competition_id = v_comp_id);
  end if;
end $$;
