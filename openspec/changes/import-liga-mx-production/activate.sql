-- Production Activation: Liga MX Apertura 2026
-- Run against production Supabase after verifying migration is applied.
-- Safe to re-run (idempotent).

-- Set Liga MX as a live league (appears in catalog + pool picker)
UPDATE public.competitions
SET is_live = true
WHERE slug = 'liga-mx-apertura-2026'
  AND is_live = false;

-- Verify the update
SELECT slug, name, is_live, finished_at
FROM public.competitions
WHERE slug = 'liga-mx-apertura-2026';

-- Count fixtures
SELECT count(*) AS fixture_count
FROM public.matches
WHERE competition_id = (
  SELECT id FROM public.competitions WHERE slug = 'liga-mx-apertura-2026'
);
