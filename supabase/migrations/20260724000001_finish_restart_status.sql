-- ===========================================================================
-- Update finish_league / restart_league to sync status column
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.finish_league(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can finish a league';
  END IF;

  UPDATE public.competitions
  SET status = 'finished', finished_at = now()
  WHERE id = p_id
    AND finished_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.restart_league(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can restart a league';
  END IF;

  UPDATE public.competitions
  SET status = 'active', finished_at = NULL
  WHERE id = p_id
    AND finished_at IS NOT NULL;
END;
$$;
