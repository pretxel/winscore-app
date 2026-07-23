-- ===========================================================================
-- Liga MX Apertura 2026 — Competition + Fixtures
-- ===========================================================================

DO $$
BEGIN
  PERFORM set_config('app.allow_active_change', '1', true);
  PERFORM set_config('app.allow_live_change', '1', true);

  INSERT INTO public.competitions (
    slug, kind, name, short_name, season,
    tournament_start_at, tournament_end_at,
    is_active, is_live, format_config, providers, branding
  ) VALUES (
    'liga-mx-apertura-2026',
    'custom',
    'Liga MX Apertura 2026',
    'Liga MX 2026',
    '2026',
    '2026-07-03T00:00:00Z',
    '2026-12-13T00:00:00Z',
    false, true,
    jsonb_build_object(
      'stages', jsonb_build_array(
        jsonb_build_object('key','league','kind','league','order',1,'icon','league','hasGroupCode',false,
          'pointMultiplier', 1,
          'labels', jsonb_build_object('en','League stage','es','Fase regular','fr','Phase de championnat')),
        jsonb_build_object('key','qf','kind','knockout','order',2,'icon','qf','hasGroupCode',false,
          'revealed', true, 'pointMultiplier', 2,
          'labels', jsonb_build_object('en','Quarter-final','es','Cuartos de final','fr','Quarts de finale')),
        jsonb_build_object('key','sf','kind','knockout','order',3,'icon','sf','hasGroupCode',false,
          'revealed', true, 'pointMultiplier', 3,
          'labels', jsonb_build_object('en','Semi-final','es','Semifinal','fr','Demi-finale')),
        jsonb_build_object('key','final','kind','knockout','order',4,'icon','final','hasGroupCode',false,
          'revealed', true, 'pointMultiplier', 4,
          'labels', jsonb_build_object('en','Final','es','Final','fr','Finale'))
      ),
      'groups', jsonb_build_object('enabled', false)
    ),
    jsonb_build_object(
      'footballData', jsonb_build_object('code','LMX','season','2026'),
      'espn', jsonb_build_object('leaguePath','mex.liga')
    ),
    jsonb_build_object(
      'brandCode', 'LMX',
      'joinCodePrefix', 'MX',
      'newsQuery', '"Liga MX" OR "Liga MX Apertura 2026"',
      'emailFromName', 'Liga MX Pools',
      'hosts', jsonb_build_array('Mexico')
    )
  ) ON CONFLICT (slug) DO UPDATE SET
    is_live = true,
    format_config = EXCLUDED.format_config,
    providers = EXCLUDED.providers,
    branding = EXCLUDED.branding;

END $$;

-- Insert league-stage fixtures (Jornada 1-17)
WITH comp AS (
  SELECT id FROM public.competitions WHERE slug = 'liga-mx-apertura-2026'
),
jornadas(matchday, home, away) AS (VALUES
  (1, 'América', 'Atlas'), (1, 'Atlético San Luis', 'Juárez'),
  (1, 'Cruz Azul', 'Mazatlán'), (1, 'Guadalajara', 'Santos Laguna'),
  (1, 'León', 'Pachuca'), (1, 'Monterrey', 'Puebla'),
  (1, 'Necaxa', 'Querétaro'), (1, 'Tijuana', 'Toluca'),
  (1, 'UNAM', 'Tigres UANL'),
  (2, 'Atlas', 'Atlético San Luis'), (2, 'Juárez', 'Cruz Azul'),
  (2, 'Mazatlán', 'Guadalajara'), (2, 'Pachuca', 'Monterrey'),
  (2, 'Puebla', 'Necaxa'), (2, 'Querétaro', 'Tijuana'),
  (2, 'Santos Laguna', 'UNAM'), (2, 'Tigres UANL', 'León'),
  (2, 'Toluca', 'América'),
  (3, 'América', 'Juárez'), (3, 'Atlético San Luis', 'Toluca'),
  (3, 'Cruz Azul', 'Atlas'), (3, 'Guadalajara', 'Pachuca'),
  (3, 'León', 'Santos Laguna'), (3, 'Monterrey', 'Tigres UANL'),
  (3, 'Necaxa', 'Mazatlán'), (3, 'Tijuana', 'Puebla'),
  (3, 'UNAM', 'Querétaro'),
  (4, 'Atlas', 'Toluca'), (4, 'Juárez', 'Guadalajara'),
  (4, 'Mazatlán', 'Tijuana'), (4, 'Pachuca', 'UNAM'),
  (4, 'Puebla', 'León'), (4, 'Querétaro', 'América'),
  (4, 'Santos Laguna', 'Monterrey'), (4, 'Tigres UANL', 'Atlético San Luis'),
  (4, 'Toluca', 'Cruz Azul'),
  (5, 'América', 'Cruz Azul'), (5, 'Atlético San Luis', 'Pachuca'),
  (5, 'Guadalajara', 'Atlas'), (5, 'León', 'Mazatlán'),
  (5, 'Monterrey', 'Querétaro'), (5, 'Necaxa', 'Tijuana'),
  (5, 'Puebla', 'UNAM'), (5, 'Santos Laguna', 'Tigres UANL'),
  (5, 'Toluca', 'Juárez'),
  (6, 'Atlas', 'Juárez'), (6, 'Cruz Azul', 'León'),
  (6, 'Mazatlán', 'Monterrey'), (6, 'Pachuca', 'América'),
  (6, 'Querétaro', 'Atlético San Luis'), (6, 'Santos Laguna', 'Puebla'),
  (6, 'Tigres UANL', 'Necaxa'), (6, 'Tijuana', 'Guadalajara'),
  (6, 'UNAM', 'Toluca'),
  (7, 'América', 'Tigres UANL'), (7, 'Atlético San Luis', 'Tijuana'),
  (7, 'Guadalajara', 'UNAM'), (7, 'Juárez', 'Mazatlán'),
  (7, 'León', 'Atlas'), (7, 'Monterrey', 'Pachuca'),
  (7, 'Necaxa', 'Cruz Azul'), (7, 'Puebla', 'Querétaro'),
  (7, 'Toluca', 'Santos Laguna'),
  (8, 'Atlas', 'Pachuca'), (8, 'Cruz Azul', 'Guadalajara'),
  (8, 'Mazatlán', 'León'), (8, 'Necaxa', 'América'),
  (8, 'Querétaro', 'Toluca'), (8, 'Santos Laguna', 'Atlético San Luis'),
  (8, 'Tigres UANL', 'Puebla'), (8, 'Tijuana', 'Monterrey'),
  (8, 'UNAM', 'Juárez'),
  (9, 'América', 'Mazatlán'), (9, 'Atlético San Luis', 'UNAM'),
  (9, 'Guadalajara', 'Querétaro'), (9, 'Juárez', 'Santos Laguna'),
  (9, 'León', 'Tijuana'), (9, 'Monterrey', 'Tigres UANL'),
  (9, 'Pachuca', 'Necaxa'), (9, 'Puebla', 'Cruz Azul'),
  (9, 'Toluca', 'Atlas'),
  (10, 'América', 'León'), (10, 'Atlas', 'Santos Laguna'),
  (10, 'Cruz Azul', 'Toluca'), (10, 'Guadalajara', 'Pachuca'),
  (10, 'Mazatlán', 'Puebla'), (10, 'Monterrey', 'Juárez'),
  (10, 'Necaxa', 'Atlético San Luis'), (10, 'Tijuana', 'Tigres UANL'),
  (10, 'UNAM', 'Querétaro'),
  (11, 'Atlético San Luis', 'Cruz Azul'), (11, 'Juárez', 'Atlas'),
  (11, 'León', 'Guadalajara'), (11, 'Pachuca', 'Tigres UANL'),
  (11, 'Puebla', 'América'), (11, 'Querétaro', 'Mazatlán'),
  (11, 'Santos Laguna', 'Tijuana'), (11, 'Toluca', 'Monterrey'),
  (11, 'UNAM', 'Necaxa'),
  (12, 'América', 'Guadalajara'), (12, 'Atlas', 'UNAM'),
  (12, 'Cruz Azul', 'Santos Laguna'), (12, 'Mazatlán', 'Toluca'),
  (12, 'Monterrey', 'León'), (12, 'Necaxa', 'Puebla'),
  (12, 'Querétaro', 'Pachuca'), (12, 'Tigres UANL', 'Atlético San Luis'),
  (12, 'Tijuana', 'Juárez'),
  (13, 'Atlético San Luis', 'Mazatlán'), (13, 'Guadalajara', 'Necaxa'),
  (13, 'Juárez', 'Toluca'), (13, 'León', 'América'),
  (13, 'Pachuca', 'Tijuana'), (13, 'Puebla', 'Atlas'),
  (13, 'Santos Laguna', 'Monterrey'), (13, 'Tigres UANL', 'Querétaro'),
  (13, 'UNAM', 'Cruz Azul'),
  (14, 'América', 'Atlético San Luis'), (14, 'Atlas', 'Tigres UANL'),
  (14, 'Cruz Azul', 'Pachuca'), (14, 'Mazatlán', 'Santos Laguna'),
  (14, 'Monterrey', 'UNAM'), (14, 'Necaxa', 'León'),
  (14, 'Querétaro', 'Juárez'), (14, 'Tijuana', 'Puebla'),
  (14, 'Toluca', 'Guadalajara'),
  (15, 'Atlético San Luis', 'Toluca'), (15, 'Guadalajara', 'Monterrey'),
  (15, 'Juárez', 'Necaxa'), (15, 'León', 'Tijuana'),
  (15, 'Pachuca', 'Mazatlán'), (15, 'Puebla', 'Santos Laguna'),
  (15, 'Querétaro', 'Cruz Azul'), (15, 'Tigres UANL', 'América'),
  (15, 'UNAM', 'Atlas'),
  (16, 'América', 'Monterrey'), (16, 'Atlas', 'Querétaro'),
  (16, 'Cruz Azul', 'Tigres UANL'), (16, 'Mazatlán', 'UNAM'),
  (16, 'Santos Laguna', 'Guadalajara'), (16, 'Tijuana', 'Toluca'),
  (16, 'Juárez', 'Pachuca'), (16, 'Necaxa', 'León'),
  (16, 'Puebla', 'Atlético San Luis'),
  (17, 'Atlético San Luis', 'Guadalajara'), (17, 'Juárez', 'Tigres UANL'),
  (17, 'León', 'Querétaro'), (17, 'Monterrey', 'Necaxa'),
  (17, 'Pachuca', 'Puebla'), (17, 'Santos Laguna', 'Cruz Azul'),
  (17, 'Toluca', 'Mazatlán'), (17, 'UNAM', 'América'),
  (17, 'Atlas', 'Tijuana')
)
INSERT INTO public.matches (
  competition_id, stage, home_team, away_team,
  kickoff_at, status
)
SELECT
  comp.id,
  'league',
  j.home,
  j.away,
  (DATE '2026-07-03' + (j.matchday - 1) * INTERVAL '7 days' + TIME '19:00:00Z')::timestamptz,
  'scheduled'
FROM jornadas j, comp
ON CONFLICT DO NOTHING;
