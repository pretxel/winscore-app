-- ===========================================================================
-- One-time welcome tour: seen marker
-- ---------------------------------------------------------------------------
-- Records that a player has been shown the five-step tour covering scoring,
-- pools, optional matchday wagers, wallet linking, and the risk/oracle model.
--
-- Deliberately NOT backfilled: every existing player sees the tour once on
-- their next sign-in, because none of them have been shown any wagering
-- explanation. Nullable for the same reason — null means "not yet seen".
--
-- Mirrors the shape of profiles.welcome_email_sent_at.
-- ===========================================================================

alter table public.profiles
  add column welcome_seen_at timestamptz;
