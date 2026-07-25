-- ===========================================================================
-- Liga MX Apertura 2026 — competition_rounds backfill (Jornadas 1-17)
-- Source: the official calendar in 20260723010000_liga_mx_official_fixtures.sql
-- ===========================================================================
-- That migration grouped its fixtures under `===== JORNADA n =====` comments but
-- inserted only (stage, home_team, away_team, kickoff_at, ...) — the matchday was
-- dropped on the way in. So competition_rounds was empty and every match had a
-- null round_id, which blocks wagering entirely: the rail requires an
-- initialized wager_rounds row, and settlement scores per round_id.
--
-- The (home_team, away_team) pairs below are transcribed from that same official
-- calendar, one block per Jornada. Liga MX Apertura is a single round-robin, so
-- each pair occurs exactly once across all 153 fixtures (verified), which makes
-- the mapping unambiguous. Nothing here is inferred from dates or kickoff
-- proximity, per 20260722204537_round_backfill_template.sql.
--
-- opens_at is the Jornada's earliest kickoff, matching what
-- flag_rounds_for_shortening() computes as the effective close. admin_closes_at
-- is left null so the round closes at its first kickoff.
--
-- Status: Jornadas whose fixtures are all final are 'closed'; the rest stay
-- 'pending' so an admin activates them deliberately.
--
-- Idempotent: rounds are matched on (competition_id, round_key), and fixture
-- assignment only fills a null round_id.
--
-- Rollback:
-- update public.matches set round_id = null
--   where competition_id = (select id from public.competitions where slug = 'liga-mx-apertura-2026');
-- delete from public.competition_rounds
--   where competition_id = (select id from public.competitions where slug = 'liga-mx-apertura-2026');

do $$
declare
  v_comp_id uuid;
  v_round_id uuid;
  v_assigned int;
  v_total int := 0;
begin
  select id into v_comp_id from public.competitions where slug = 'liga-mx-apertura-2026';
  if v_comp_id is null then
    raise exception 'Liga MX Apertura 2026 competition not found';
  end if;

  -- ===== Jornada 1 (9 fixtures, first kickoff 2026-07-17 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 1', 1,
    '{"en": "Matchday 1", "es": "Jornada 1", "fr": "Journée 1", "de": "Spieltag 1"}'::jsonb,
    1,
    '2026-07-17 01:00:00+00'::timestamptz,
    null,
    'closed',
    '{"provider": "official-calendar", "provider_round": "Jornada 1", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Necaxa', 'Atlante'),
      ('Tijuana', 'Tigres UANL'),
      ('Atlético San Luis', 'Cruz Azul'),
      ('León', 'Atlas'),
      ('Juárez', 'Puebla'),
      ('UNAM', 'Pachuca'),
      ('Monterrey', 'Santos Laguna'),
      ('Guadalajara', 'Toluca'),
      ('Querétaro', 'América')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 1: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 2 (9 fixtures, first kickoff 2026-07-22 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 2', 2,
    '{"en": "Matchday 2", "es": "Jornada 2", "fr": "Journée 2", "de": "Spieltag 2"}'::jsonb,
    2,
    '2026-07-22 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 2", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Cruz Azul', 'Puebla'),
      ('Toluca', 'UNAM'),
      ('Atlante', 'América'),
      ('Tijuana', 'León'),
      ('Guadalajara', 'Juárez'),
      ('Santos Laguna', 'Atlas'),
      ('Tigres UANL', 'Atlético San Luis'),
      ('Necaxa', 'Monterrey'),
      ('Pachuca', 'Querétaro')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 2: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 3 (9 fixtures, first kickoff 2026-08-01 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 3', 3,
    '{"en": "Matchday 3", "es": "Jornada 3", "fr": "Journée 3", "de": "Spieltag 3"}'::jsonb,
    3,
    '2026-08-01 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 3", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Puebla', 'Guadalajara'),
      ('Atlético San Luis', 'Tijuana'),
      ('Juárez', 'UNAM'),
      ('Querétaro', 'Tigres UANL'),
      ('León', 'Pachuca'),
      ('Atlas', 'Monterrey'),
      ('Cruz Azul', 'Atlante'),
      ('América', 'Santos Laguna'),
      ('Toluca', 'Necaxa')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 3: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 4 (9 fixtures, first kickoff 2026-08-15 23:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 4', 4,
    '{"en": "Matchday 4", "es": "Jornada 4", "fr": "Journée 4", "de": "Spieltag 4"}'::jsonb,
    4,
    '2026-08-15 23:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 4", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Atlante', 'Toluca'),
      ('Monterrey', 'Juárez'),
      ('Atlas', 'Tigres UANL'),
      ('UNAM', 'Querétaro'),
      ('América', 'Atlético San Luis'),
      ('Santos Laguna', 'Guadalajara'),
      ('Tijuana', 'Cruz Azul'),
      ('Necaxa', 'León'),
      ('Pachuca', 'Puebla')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 4: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 5 (9 fixtures, first kickoff 2026-08-22 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 5', 5,
    '{"en": "Matchday 5", "es": "Jornada 5", "fr": "Journée 5", "de": "Spieltag 5"}'::jsonb,
    5,
    '2026-08-22 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 5", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Puebla', 'Santos Laguna'),
      ('Juárez', 'América'),
      ('Querétaro', 'Toluca'),
      ('Guadalajara', 'Tijuana'),
      ('León', 'Monterrey'),
      ('Tigres UANL', 'Atlante'),
      ('Cruz Azul', 'Atlas'),
      ('Atlético San Luis', 'Pachuca'),
      ('UNAM', 'Necaxa')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 5: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 6 (9 fixtures, first kickoff 2026-08-29 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 6', 6,
    '{"en": "Matchday 6", "es": "Jornada 6", "fr": "Journée 6", "de": "Spieltag 6"}'::jsonb,
    6,
    '2026-08-29 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 6", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Necaxa', 'Cruz Azul'),
      ('Atlante', 'León'),
      ('Tijuana', 'UNAM'),
      ('Atlas', 'Querétaro'),
      ('Pachuca', 'Guadalajara'),
      ('América', 'Puebla'),
      ('Santos Laguna', 'Tigres UANL'),
      ('Toluca', 'Juárez'),
      ('Monterrey', 'Atlético San Luis')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 6: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 7 (9 fixtures, first kickoff 2026-09-05 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 7', 7,
    '{"en": "Matchday 7", "es": "Jornada 7", "fr": "Journée 7", "de": "Spieltag 7"}'::jsonb,
    7,
    '2026-09-05 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 7", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Puebla', 'Toluca'),
      ('Juárez', 'Pachuca'),
      ('Atlético San Luis', 'Guadalajara'),
      ('Querétaro', 'Monterrey'),
      ('Tigres UANL', 'Necaxa'),
      ('América', 'Tijuana'),
      ('Atlas', 'Atlante'),
      ('UNAM', 'León'),
      ('Cruz Azul', 'Santos Laguna')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 7: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 8 (9 fixtures, first kickoff 2026-09-12 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 8', 8,
    '{"en": "Matchday 8", "es": "Jornada 8", "fr": "Journée 8", "de": "Spieltag 8"}'::jsonb,
    8,
    '2026-09-12 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 8", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Necaxa', 'Puebla'),
      ('Atlante', 'Pachuca'),
      ('Tijuana', 'Querétaro'),
      ('León', 'Atlético San Luis'),
      ('Toluca', 'Atlas'),
      ('Cruz Azul', 'América'),
      ('Santos Laguna', 'Juárez'),
      ('Guadalajara', 'UNAM'),
      ('Monterrey', 'Tigres UANL')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 8: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 9 (9 fixtures, first kickoff 2026-09-19 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 9', 9,
    '{"en": "Matchday 9", "es": "Jornada 9", "fr": "Journée 9", "de": "Spieltag 9"}'::jsonb,
    9,
    '2026-09-19 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 9", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Puebla', 'Atlante'),
      ('Juárez', 'Tigres UANL'),
      ('Atlas', 'UNAM'),
      ('Atlético San Luis', 'Necaxa'),
      ('Monterrey', 'Cruz Azul'),
      ('América', 'Guadalajara'),
      ('Pachuca', 'Tijuana'),
      ('Toluca', 'Santos Laguna'),
      ('Querétaro', 'León')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 9: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 10 (9 fixtures, first kickoff 2026-09-26 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 10', 10,
    '{"en": "Matchday 10", "es": "Jornada 10", "fr": "Journée 10", "de": "Spieltag 10"}'::jsonb,
    10,
    '2026-09-26 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 10", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Atlante', 'Monterrey'),
      ('Tijuana', 'Atlas'),
      ('Guadalajara', 'Querétaro'),
      ('Santos Laguna', 'Pachuca'),
      ('Tigres UANL', 'Puebla'),
      ('Cruz Azul', 'Toluca'),
      ('UNAM', 'Atlético San Luis'),
      ('León', 'Juárez'),
      ('Necaxa', 'América')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 10: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 11 (9 fixtures, first kickoff 2026-10-10 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 11', 11,
    '{"en": "Matchday 11", "es": "Jornada 11", "fr": "Journée 11", "de": "Spieltag 11"}'::jsonb,
    11,
    '2026-10-10 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 11", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Querétaro', 'Atlante'),
      ('Puebla', 'León'),
      ('Tigres UANL', 'Toluca'),
      ('Juárez', 'Tijuana'),
      ('Atlas', 'Guadalajara'),
      ('América', 'Monterrey'),
      ('Pachuca', 'Necaxa'),
      ('Atlético San Luis', 'Santos Laguna'),
      ('UNAM', 'Cruz Azul')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 11: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 12 (9 fixtures, first kickoff 2026-10-17 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 12', 12,
    '{"en": "Matchday 12", "es": "Jornada 12", "fr": "Journée 12", "de": "Spieltag 12"}'::jsonb,
    12,
    '2026-10-17 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 12", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Necaxa', 'Atlas'),
      ('Atlante', 'UNAM'),
      ('Tijuana', 'Puebla'),
      ('Guadalajara', 'Tigres UANL'),
      ('Santos Laguna', 'Querétaro'),
      ('León', 'América'),
      ('Toluca', 'Atlético San Luis'),
      ('Cruz Azul', 'Juárez'),
      ('Monterrey', 'Pachuca')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 12: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 13 (9 fixtures, first kickoff 2026-10-21 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 13', 13,
    '{"en": "Matchday 13", "es": "Jornada 13", "fr": "Journée 13", "de": "Spieltag 13"}'::jsonb,
    13,
    '2026-10-21 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 13", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Atlético San Luis', 'Querétaro'),
      ('Juárez', 'Atlante'),
      ('Tigres UANL', 'León'),
      ('Guadalajara', 'Necaxa'),
      ('Puebla', 'Monterrey'),
      ('Atlas', 'América'),
      ('Toluca', 'Tijuana'),
      ('Pachuca', 'Cruz Azul'),
      ('Santos Laguna', 'UNAM')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 13: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 14 (9 fixtures, first kickoff 2026-10-24 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 14', 14,
    '{"en": "Matchday 14", "es": "Jornada 14", "fr": "Journée 14", "de": "Spieltag 14"}'::jsonb,
    14,
    '2026-10-24 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 14", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Necaxa', 'Juárez'),
      ('Atlante', 'Atlético San Luis'),
      ('León', 'Toluca'),
      ('Monterrey', 'Guadalajara'),
      ('UNAM', 'Tigres UANL'),
      ('Atlas', 'Puebla'),
      ('América', 'Pachuca'),
      ('Querétaro', 'Cruz Azul'),
      ('Tijuana', 'Santos Laguna')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 14: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 15 (9 fixtures, first kickoff 2026-10-31 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 15', 15,
    '{"en": "Matchday 15", "es": "Jornada 15", "fr": "Journée 15", "de": "Spieltag 15"}'::jsonb,
    15,
    '2026-10-31 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 15", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Atlético San Luis', 'Atlas'),
      ('Juárez', 'Querétaro'),
      ('Puebla', 'UNAM'),
      ('Pachuca', 'Tigres UANL'),
      ('Guadalajara', 'Atlante'),
      ('Monterrey', 'Tijuana'),
      ('América', 'Toluca'),
      ('Santos Laguna', 'Necaxa'),
      ('Cruz Azul', 'León')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 15: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 16 (9 fixtures, first kickoff 2026-11-07 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 16', 16,
    '{"en": "Matchday 16", "es": "Jornada 16", "fr": "Journée 16", "de": "Spieltag 16"}'::jsonb,
    16,
    '2026-11-07 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 16", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Atlético San Luis', 'Juárez'),
      ('Necaxa', 'Tijuana'),
      ('Atlante', 'Santos Laguna'),
      ('Atlas', 'Pachuca'),
      ('Tigres UANL', 'Cruz Azul'),
      ('Toluca', 'Monterrey'),
      ('UNAM', 'América'),
      ('Querétaro', 'Puebla'),
      ('León', 'Guadalajara')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 16: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  -- ===== Jornada 17 (9 fixtures, first kickoff 2026-11-21 01:00:00+00) =====
  insert into public.competition_rounds (
    competition_id, round_key, round_number, labels, display_order,
    opens_at, admin_closes_at, status, provider_metadata, provider_review_status
  ) values (
    v_comp_id, 'Jornada 17', 17,
    '{"en": "Matchday 17", "es": "Jornada 17", "fr": "Journée 17", "de": "Spieltag 17"}'::jsonb,
    17,
    '2026-11-21 01:00:00+00'::timestamptz,
    null,
    'pending',
    '{"provider": "official-calendar", "provider_round": "Jornada 17", "source": "20260723010000_liga_mx_official_fixtures.sql"}'::jsonb,
    'reviewed'
  )
  on conflict (competition_id, round_key) do update
    set round_number = excluded.round_number,
        labels = excluded.labels,
        opens_at = excluded.opens_at,
        provider_metadata = excluded.provider_metadata
  returning id into v_round_id;

  with pairs(home_team, away_team) as (values
      ('Puebla', 'Atlético San Luis'),
      ('Juárez', 'Atlas'),
      ('Tijuana', 'Atlante'),
      ('Santos Laguna', 'León'),
      ('Pachuca', 'Toluca'),
      ('UNAM', 'Monterrey'),
      ('Tigres UANL', 'América'),
      ('Guadalajara', 'Cruz Azul'),
      ('Querétaro', 'Necaxa')
  )
  update public.matches m
  set round_id = v_round_id
  from pairs p
  where m.competition_id = v_comp_id
    and m.home_team = p.home_team
    and m.away_team = p.away_team
    and m.round_id is null;

  get diagnostics v_assigned = row_count;
  v_total := v_total + v_assigned;
  if v_assigned <> 9 then
    raise notice 'Jornada 17: assigned % of 9 fixtures (already assigned or missing)', v_assigned;
  end if;

  raise notice 'Liga MX rounds backfill: assigned % fixtures across 17 Jornadas', v_total;

  -- Every league fixture must belong to a Jornada; an orphan means the calendar
  -- and the database disagree and the wagered standing would silently omit it.
  if exists (
    select 1 from public.matches
    where competition_id = v_comp_id and stage = 'league' and round_id is null
  ) then
    raise exception 'Liga MX has league fixtures with no round assigned: %',
      (select string_agg(home_team || ' vs ' || away_team, ', ')
       from public.matches
       where competition_id = v_comp_id and stage = 'league' and round_id is null);
  end if;
end $$;
