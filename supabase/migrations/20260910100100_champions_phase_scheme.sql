-- ===========================================================================
-- Seed the Champions League 2026-27 phase scheme
-- ---------------------------------------------------------------------------
-- Seven phases. The first two split the league phase at 4 November and
-- 27 January (matchdays 1-4 and 5-8); the rest follow the knockout stages.
-- Knockout starts are best-guess until UEFA publishes the dates and can be
-- moved while those phases are still pending. Phase 1 is active from the
-- start. Idempotent: keyed by slug and scheme key, re-runs are no-ops.
--
-- Rollback: delete from competition_phase_schemes where scheme_key = 'seven-phases'
-- and competition_id = (select id from competitions where slug = 'champions-league-2026-2027');
-- ===========================================================================

do $$
declare
  v_comp uuid;
  v_scheme uuid;
  v_start timestamptz;
begin
  select id, coalesce(tournament_start_at, '2026-09-01T00:00:00Z'::timestamptz)
    into v_comp, v_start
  from public.competitions where slug = 'champions-league-2026-2027';
  if v_comp is null then
    return;
  end if;

  insert into public.competition_phase_schemes (competition_id, scheme_key, labels, is_default)
  values (
    v_comp,
    'seven-phases',
    jsonb_build_object(
      'en', 'Seven phases', 'es', 'Siete fases', 'fr', 'Sept phases', 'de', 'Sieben Phasen'
    ),
    true
  )
  on conflict (competition_id, scheme_key) do nothing;

  select id into v_scheme
  from public.competition_phase_schemes
  where competition_id = v_comp and scheme_key = 'seven-phases';

  insert into public.competition_phases (scheme_id, phase_key, labels, display_order, starts_at, status)
  values
    (v_scheme, 'phase-1',
      jsonb_build_object('en', 'Phase 1', 'es', 'Fase 1', 'fr', 'Phase 1', 'de', 'Phase 1'),
      1, v_start, 'active'),
    (v_scheme, 'phase-2',
      jsonb_build_object('en', 'Phase 2', 'es', 'Fase 2', 'fr', 'Phase 2', 'de', 'Phase 2'),
      2, '2026-11-05T00:00:00Z', 'pending'),
    (v_scheme, 'po',
      jsonb_build_object('en', 'Knockout play-off', 'es', 'Play-off', 'fr', 'Barrages', 'de', 'Play-off'),
      3, '2027-01-28T00:00:00Z', 'pending'),
    (v_scheme, 'r16',
      jsonb_build_object('en', 'Round of 16', 'es', 'Octavos', 'fr', 'Huitièmes', 'de', 'Achtelfinale'),
      4, '2027-03-01T00:00:00Z', 'pending'),
    (v_scheme, 'qf',
      jsonb_build_object('en', 'Quarter-final', 'es', 'Cuartos', 'fr', 'Quarts', 'de', 'Viertelfinale'),
      5, '2027-04-01T00:00:00Z', 'pending'),
    (v_scheme, 'sf',
      jsonb_build_object('en', 'Semi-final', 'es', 'Semis', 'fr', 'Demi-finales', 'de', 'Halbfinale'),
      6, '2027-04-25T00:00:00Z', 'pending'),
    (v_scheme, 'final',
      jsonb_build_object('en', 'Final', 'es', 'Final', 'fr', 'Finale', 'de', 'Finale'),
      7, '2027-05-20T00:00:00Z', 'pending')
  on conflict (scheme_id, phase_key) do nothing;
end;
$$;
