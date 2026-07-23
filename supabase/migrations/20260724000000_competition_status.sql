-- ===========================================================================
-- Competition status lifecycle: active | manage | finished
-- Replaces is_live + is_active with a single status column.
-- ===========================================================================

-- 1. Add status column (nullable initially for backfill)
ALTER TABLE public.competitions
  ADD COLUMN status text;

-- 2. Backfill from existing flags
--    is_live=true  → active  (visible in catalog)
--    is_active=true → active (the single active competition)
--    everything else → manage (hidden, admin-only)
UPDATE public.competitions
SET status = CASE
  WHEN is_live OR is_active THEN 'active'
  ELSE 'manage'
END;

-- 3. Add CHECK constraint and NOT NULL
ALTER TABLE public.competitions
  ADD CONSTRAINT competitions_status_check CHECK (status IN ('active', 'manage', 'finished')),
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'manage';

-- 4. Drop the is_active guard machinery (no longer needed — multiple competitions
--    can be active simultaneously, and admins can change status directly).
DROP TRIGGER IF EXISTS trg_competitions_guard_is_active ON public.competitions;
DROP FUNCTION IF EXISTS public.guard_competitions_is_active();
DROP FUNCTION IF EXISTS public.set_active_competition(uuid);

-- 5. Drop the partial unique index that enforced at most one active competition.
DROP INDEX IF EXISTS public.competitions_is_active_idx;

-- 6. Update active_competition_id(): fallback to first status='active' competition
CREATE OR REPLACE FUNCTION public.active_competition_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (
      SELECT c.id
      FROM public.competitions c
      WHERE c.slug = nullif(
        current_setting('request.headers', true)::json ->> 'x-league', ''
      )
      LIMIT 1
    ),
    (SELECT c.id FROM public.competitions c WHERE c.status = 'active' LIMIT 1)
  );
$$;

-- 7. Update create_group(): gate on status='active' instead of is_live
CREATE OR REPLACE FUNCTION public.create_group(
  p_name text,
  p_competition_id uuid default null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_group_id uuid;
  v_code text;
  v_attempts int := 0;
  v_name text := btrim(coalesce(p_name, ''));
  v_competition_id uuid := coalesce(p_competition_id, public.active_competition_id());
  v_status text;
  v_prefix text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF char_length(v_name) < 2 OR char_length(v_name) > 40 THEN
    RAISE EXCEPTION 'group name must be between 2 and 40 characters';
  END IF;
  IF v_competition_id IS NULL THEN
    RAISE EXCEPTION 'no league selected';
  END IF;

  SELECT status, coalesce(branding ->> 'joinCodePrefix', 'WC')
    INTO v_status, v_prefix
  FROM public.competitions WHERE id = v_competition_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'league % does not exist', v_competition_id;
  END IF;
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'league is not active';
  END IF;

  LOOP
    v_attempts := v_attempts + 1;
    v_code := public.generate_join_code(v_prefix);
    BEGIN
      INSERT INTO public.groups (name, owner_id, join_code, competition_id)
      VALUES (v_name, v_uid, v_code, v_competition_id)
      RETURNING id INTO v_group_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts >= 10 THEN
        RAISE EXCEPTION 'could not generate a unique join code';
      END IF;
    END;
  END LOOP;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, v_uid, 'owner');

  RETURN v_group_id;
END;
$$;

-- 8. Drop the old columns
ALTER TABLE public.competitions
  DROP COLUMN IF EXISTS is_live,
  DROP COLUMN IF EXISTS is_active;

-- 9. Update seed data: set World Cup to active (it was the original is_active=true seed)
--    This handles the edge case where World Cup was seeded before the backfill.
UPDATE public.competitions SET status = 'active' WHERE slug = 'world-cup-2026' AND status = 'manage';

-- 10. Re-grant execute on updated functions
GRANT EXECUTE ON FUNCTION public.active_competition_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_group(text, uuid) TO authenticated;
