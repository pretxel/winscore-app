-- ===========================================================================
-- Liga MX Apertura 2026 — Official Fixtures
-- Source: https://es.wikipedia.org/wiki/Torneo_Apertura_2026_(M%C3%A9xico)
-- ===========================================================================
-- Replaces placeholder fixtures with the official calendar published June 9, 2026.
-- Key changes: tournament start July 16 (not July 3), Atlante replaces Mazatlán.
-- All times are UTC (Mexico City = UTC-6).

DO $$
DECLARE
  v_comp_id uuid;
BEGIN
  SELECT id INTO v_comp_id FROM public.competitions WHERE slug = 'liga-mx-apertura-2026';
  IF v_comp_id IS NULL THEN
    RAISE EXCEPTION 'Liga MX competition not found';
  END IF;

  -- Update tournament start date to match the official calendar
  UPDATE public.competitions
  SET tournament_start_at = '2026-07-16T00:00:00Z',
      updated_at = now()
  WHERE id = v_comp_id;

  -- Remove placeholder fixtures
  DELETE FROM public.matches WHERE competition_id = v_comp_id;

  -- Insert Jornada 1-17 fixtures
  WITH fixtures(home_team, away_team, kickoff_at, status, home_score, away_score, venue) AS (VALUES

    -- ===== JORNADA 1: July 16-18, 2026 =====
    ('Necaxa',   'Atlante',       '2026-07-17 01:00:00+00'::timestamptz, 'final', 2, 1, 'Estadio Victoria'),
    ('Tijuana',  'Tigres UANL',   '2026-07-17 03:10:00+00'::timestamptz, 'final', 3, 1, 'Estadio Caliente'),
    ('Atlético San Luis', 'Cruz Azul',  '2026-07-18 01:00:00+00'::timestamptz, 'final', 2, 3, 'Estadio Libertad Financiera'),
    ('León',     'Atlas',         '2026-07-18 01:00:00+00'::timestamptz, 'final', 2, 3, 'Estadio León'),
    ('Juárez',   'Puebla',        '2026-07-18 03:00:00+00'::timestamptz, 'final', 0, 1, 'Estadio Olímpico Benito Juárez'),
    ('UNAM',     'Pachuca',       '2026-07-18 23:00:00+00'::timestamptz, 'final', 0, 3, 'Estadio Olímpico Universitario'),
    ('Monterrey','Santos Laguna', '2026-07-19 01:05:00+00'::timestamptz, 'final', 3, 2, 'Estadio BBVA'),
    ('Guadalajara','Toluca',      '2026-07-19 01:07:00+00'::timestamptz, 'final', 0, 2, 'Estadio Akron'),
    ('Querétaro','América',       '2026-07-19 03:10:00+00'::timestamptz, 'final', 0, 1, 'Estadio Corregidora'),

    -- ===== JORNADA 2: July 21-26, 2026 =====
    ('Cruz Azul',    'Puebla',             '2026-07-22 01:00:00+00'::timestamptz, 'final',     2, 1, 'Estadio Banorte'),
    ('Toluca',       'UNAM',               '2026-07-22 03:05:00+00'::timestamptz, 'final',     1, 2, 'Estadio Nemesio Díez'),
    ('Atlante',      'América',            '2026-07-25 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Tijuana',      'León',               '2026-07-25 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Caliente'),
    ('Guadalajara',  'Juárez',             '2026-07-25 23:07:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Akron'),
    ('Santos Laguna','Atlas',              '2026-07-26 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corona'),
    ('Tigres UANL',  'Atlético San Luis',  '2026-07-26 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Universitario'),
    ('Necaxa',       'Monterrey',          '2026-07-26 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Victoria'),
    ('Pachuca',      'Querétaro',          '2026-07-27 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Hidalgo'),

    -- ===== JORNADA 3: July 31 - August 2, 2026 =====
    ('Puebla',             'Guadalajara',   '2026-08-01 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Cuauhtémoc'),
    ('Atlético San Luis',  'Tijuana',       '2026-08-01 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Libertad Financiera'),
    ('Juárez',             'UNAM',          '2026-08-01 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Benito Juárez'),
    ('Querétaro',          'Tigres UANL',   '2026-08-01 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corregidora'),
    ('León',               'Pachuca',       '2026-08-02 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio León'),
    ('Atlas',              'Monterrey',     '2026-08-02 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Jalisco'),
    ('Cruz Azul',          'Atlante',       '2026-08-02 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('América',            'Santos Laguna', '2026-08-02 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Toluca',             'Necaxa',        '2026-08-03 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Nemesio Díez'),

    -- ===== JORNADA 4: August 15-17, 2026 =====
    ('Atlante',       'Toluca',        '2026-08-15 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Monterrey',     'Juárez',        '2026-08-16 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio BBVA'),
    ('Atlas',         'Tigres UANL',   '2026-08-16 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Jalisco'),
    ('UNAM',          'Querétaro',     '2026-08-16 18:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Universitario'),
    ('América',       'Atlético San Luis', '2026-08-16 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Santos Laguna', 'Guadalajara',   '2026-08-17 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corona'),
    ('Tijuana',       'Cruz Azul',     '2026-08-17 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Caliente'),
    ('Necaxa',        'León',          '2026-08-18 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Victoria'),
    ('Pachuca',       'Puebla',        '2026-08-18 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Hidalgo'),

    -- ===== JORNADA 5: August 21-23, 2026 =====
    ('Puebla',             'Santos Laguna', '2026-08-22 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Cuauhtémoc'),
    ('Juárez',             'América',       '2026-08-22 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Benito Juárez'),
    ('Querétaro',          'Toluca',        '2026-08-22 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corregidora'),
    ('Guadalajara',        'Tijuana',       '2026-08-22 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Akron'),
    ('León',               'Monterrey',     '2026-08-23 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio León'),
    ('Tigres UANL',        'Atlante',       '2026-08-23 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Universitario'),
    ('Cruz Azul',          'Atlas',         '2026-08-23 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Atlético San Luis',  'Pachuca',       '2026-08-23 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Libertad Financiera'),
    ('UNAM',               'Necaxa',        '2026-08-24 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Universitario'),

    -- ===== JORNADA 6: August 28-30, 2026 =====
    ('Necaxa',        'Cruz Azul',     '2026-08-29 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Victoria'),
    ('Atlante',       'León',          '2026-08-29 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Tijuana',       'UNAM',          '2026-08-29 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Caliente'),
    ('Atlas',         'Querétaro',     '2026-08-29 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Jalisco'),
    ('Pachuca',       'Guadalajara',   '2026-08-29 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Hidalgo'),
    ('América',       'Puebla',        '2026-08-30 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Santos Laguna', 'Tigres UANL',   '2026-08-30 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corona'),
    ('Toluca',        'Juárez',        '2026-08-31 00:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Nemesio Díez'),
    ('Monterrey',     'Atlético San Luis', '2026-08-31 02:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio BBVA'),

    -- ===== JORNADA 7: September 4-6, 2026 =====
    ('Puebla',             'Toluca',        '2026-09-05 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Cuauhtémoc'),
    ('Juárez',             'Pachuca',       '2026-09-05 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Benito Juárez'),
    ('Atlético San Luis',  'Guadalajara',   '2026-09-05 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Libertad Financiera'),
    ('Querétaro',          'Monterrey',     '2026-09-05 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corregidora'),
    ('Tigres UANL',        'Necaxa',        '2026-09-06 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Universitario'),
    ('América',            'Tijuana',       '2026-09-06 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Atlas',              'Atlante',       '2026-09-06 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Jalisco'),
    ('UNAM',               'León',          '2026-09-06 18:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Universitario'),
    ('Cruz Azul',          'Santos Laguna', '2026-09-07 02:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),

    -- ===== JORNADA 8: September 11-13, 2026 =====
    ('Necaxa',        'Puebla',        '2026-09-12 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Victoria'),
    ('Atlante',       'Pachuca',       '2026-09-12 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Tijuana',       'Querétaro',     '2026-09-12 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Caliente'),
    ('León',          'Atlético San Luis', '2026-09-12 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio León'),
    ('Toluca',        'Atlas',         '2026-09-13 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Nemesio Díez'),
    ('Cruz Azul',     'América',       '2026-09-13 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Santos Laguna', 'Juárez',        '2026-09-14 00:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corona'),
    ('Guadalajara',   'UNAM',          '2026-09-14 00:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Akron'),
    ('Monterrey',     'Tigres UANL',   '2026-09-14 02:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio BBVA'),

    -- ===== JORNADA 9: September 18-20, 2026 =====
    ('Puebla',             'Atlante',       '2026-09-19 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Cuauhtémoc'),
    ('Juárez',             'Tigres UANL',   '2026-09-19 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Benito Juárez'),
    ('Atlas',              'UNAM',          '2026-09-19 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Jalisco'),
    ('Atlético San Luis',  'Necaxa',        '2026-09-19 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Libertad Financiera'),
    ('Monterrey',          'Cruz Azul',     '2026-09-20 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio BBVA'),
    ('América',            'Guadalajara',   '2026-09-20 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Pachuca',            'Tijuana',       '2026-09-21 00:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Hidalgo'),
    ('Toluca',             'Santos Laguna', '2026-09-21 00:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Nemesio Díez'),
    ('Querétaro',          'León',          '2026-09-21 02:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corregidora'),

    -- ===== JORNADA 10: September 25-27, 2026 =====
    ('Atlante',       'Monterrey',     '2026-09-26 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Tijuana',       'Atlas',         '2026-09-26 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Caliente'),
    ('Guadalajara',   'Querétaro',     '2026-09-26 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Akron'),
    ('Santos Laguna', 'Pachuca',       '2026-09-27 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corona'),
    ('Tigres UANL',   'Puebla',        '2026-09-27 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Universitario'),
    ('Cruz Azul',     'Toluca',        '2026-09-27 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('UNAM',          'Atlético San Luis', '2026-09-27 18:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Universitario'),
    ('León',          'Juárez',        '2026-09-28 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio León'),
    ('Necaxa',        'América',       '2026-09-28 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Victoria'),

    -- ===== JORNADA 11: October 9-11, 2026 =====
    ('Querétaro',          'Atlante',       '2026-10-10 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corregidora'),
    ('Puebla',             'León',          '2026-10-10 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Cuauhtémoc'),
    ('Tigres UANL',        'Toluca',        '2026-10-10 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Universitario'),
    ('Juárez',             'Tijuana',       '2026-10-10 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Benito Juárez'),
    ('Atlas',              'Guadalajara',   '2026-10-11 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Jalisco'),
    ('América',            'Monterrey',     '2026-10-11 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Pachuca',            'Necaxa',        '2026-10-11 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Hidalgo'),
    ('Atlético San Luis',  'Santos Laguna', '2026-10-11 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Libertad Financiera'),
    ('UNAM',               'Cruz Azul',     '2026-10-12 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Universitario'),

    -- ===== JORNADA 12: October 16-18, 2026 =====
    ('Necaxa',        'Atlas',         '2026-10-17 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Victoria'),
    ('Atlante',       'UNAM',          '2026-10-17 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Tijuana',       'Puebla',        '2026-10-17 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Caliente'),
    ('Guadalajara',   'Tigres UANL',   '2026-10-17 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Akron'),
    ('Santos Laguna', 'Querétaro',     '2026-10-17 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corona'),
    ('León',          'América',       '2026-10-18 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio León'),
    ('Toluca',        'Atlético San Luis', '2026-10-18 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Nemesio Díez'),
    ('Cruz Azul',     'Juárez',        '2026-10-18 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Monterrey',     'Pachuca',       '2026-10-19 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio BBVA'),

    -- ===== JORNADA 13: October 20-21, 2026 =====
    ('Atlético San Luis',  'Querétaro',     '2026-10-21 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Libertad Financiera'),
    ('Juárez',             'Atlante',       '2026-10-21 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Benito Juárez'),
    ('Tigres UANL',        'León',          '2026-10-21 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Universitario'),
    ('Guadalajara',        'Necaxa',        '2026-10-21 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Akron'),
    ('Puebla',             'Monterrey',     '2026-10-22 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Cuauhtémoc'),
    ('Atlas',              'América',       '2026-10-22 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Jalisco'),
    ('Toluca',             'Tijuana',       '2026-10-22 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Nemesio Díez'),
    ('Pachuca',            'Cruz Azul',     '2026-10-22 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Hidalgo'),
    ('Santos Laguna',      'UNAM',          '2026-10-22 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corona'),

    -- ===== JORNADA 14: October 23-25, 2026 =====
    ('Necaxa',        'Juárez',        '2026-10-24 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Victoria'),
    ('Atlante',       'Atlético San Luis', '2026-10-24 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('León',          'Toluca',        '2026-10-24 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio León'),
    ('Monterrey',     'Guadalajara',   '2026-10-25 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio BBVA'),
    ('UNAM',          'Tigres UANL',   '2026-10-25 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Universitario'),
    ('Atlas',         'Puebla',        '2026-10-25 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Jalisco'),
    ('América',       'Pachuca',       '2026-10-25 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Querétaro',     'Cruz Azul',     '2026-10-26 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corregidora'),
    ('Tijuana',       'Santos Laguna', '2026-10-26 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Caliente'),

    -- ===== JORNADA 15: October 30 - November 1, 2026 =====
    ('Atlético San Luis',  'Atlas',         '2026-10-31 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Libertad Financiera'),
    ('Juárez',             'Querétaro',     '2026-10-31 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Benito Juárez'),
    ('Puebla',             'UNAM',          '2026-10-31 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Cuauhtémoc'),
    ('Pachuca',            'Tigres UANL',   '2026-10-31 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Hidalgo'),
    ('Guadalajara',        'Atlante',       '2026-11-01 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Akron'),
    ('Monterrey',          'Tijuana',       '2026-11-01 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio BBVA'),
    ('América',            'Toluca',        '2026-11-01 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Santos Laguna',      'Necaxa',        '2026-11-01 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corona'),
    ('Cruz Azul',          'León',          '2026-11-02 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),

    -- ===== JORNADA 16: November 6-8, 2026 =====
    ('Atlético San Luis',  'Juárez',        '2026-11-07 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Libertad Financiera'),
    ('Necaxa',             'Tijuana',       '2026-11-07 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Victoria'),
    ('Atlante',            'Santos Laguna', '2026-11-07 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Banorte'),
    ('Atlas',              'Pachuca',       '2026-11-07 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Jalisco'),
    ('Tigres UANL',        'Cruz Azul',     '2026-11-07 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Universitario'),
    ('Toluca',             'Monterrey',     '2026-11-08 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Nemesio Díez'),
    ('UNAM',               'América',       '2026-11-08 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Universitario'),
    ('Querétaro',          'Puebla',        '2026-11-09 00:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corregidora'),
    ('León',               'Guadalajara',   '2026-11-09 02:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio León'),

    -- ===== JORNADA 17: November 20-22, 2026 =====
    ('Puebla',             'Atlético San Luis', '2026-11-21 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Cuauhtémoc'),
    ('Juárez',             'Atlas',             '2026-11-21 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Benito Juárez'),
    ('Tijuana',            'Atlante',           '2026-11-21 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Caliente'),
    ('Santos Laguna',      'León',              '2026-11-21 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corona'),
    ('Pachuca',            'Toluca',            '2026-11-21 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Hidalgo'),
    ('UNAM',               'Monterrey',         '2026-11-22 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Olímpico Universitario'),
    ('Tigres UANL',        'América',           '2026-11-22 03:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Universitario'),
    ('Guadalajara',        'Cruz Azul',         '2026-11-22 23:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Akron'),
    ('Querétaro',          'Necaxa',            '2026-11-23 01:00:00+00'::timestamptz, 'scheduled', NULL, NULL, 'Estadio Corregidora')

  )
  INSERT INTO public.matches (
    competition_id, stage, home_team, away_team,
    kickoff_at, status, home_score, away_score, venue
  )
  SELECT
    v_comp_id,
    'league',
    f.home_team,
    f.away_team,
    f.kickoff_at,
    f.status,
    f.home_score,
    f.away_score,
    f.venue
  FROM fixtures f;

  RAISE NOTICE 'Inserted % Liga MX fixtures', (SELECT COUNT(*) FROM public.matches WHERE competition_id = v_comp_id);
END $$;
