-- Remove duplicate Liga MX fixtures caused by repeated migration pushes.
-- Keeps the row with the lowest id (first inserted).
DELETE FROM public.matches
WHERE id IN (
  SELECT m.id
  FROM matches m
  WHERE m.competition_id = (SELECT id FROM competitions WHERE slug = 'liga-mx-apertura-2026')
    AND m.id NOT IN (
      SELECT DISTINCT ON (competition_id, home_team, away_team, stage, kickoff_at)
        id
      FROM matches
      WHERE competition_id = (SELECT id FROM competitions WHERE slug = 'liga-mx-apertura-2026')
      ORDER BY competition_id, home_team, away_team, stage, kickoff_at, created_at ASC
    )
);
