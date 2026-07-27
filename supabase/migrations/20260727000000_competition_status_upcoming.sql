-- Add `upcoming` status to the competition lifecycle.
-- New order: manage → upcoming → active → finished

ALTER TABLE public.competitions
  DROP CONSTRAINT IF EXISTS competitions_status_check;

ALTER TABLE public.competitions
  ADD CONSTRAINT competitions_status_check
  CHECK (status IN ('active', 'manage', 'finished', 'upcoming'));
