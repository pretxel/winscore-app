-- ===========================================================================
-- Indexes for two hot lookups that had none
-- ---------------------------------------------------------------------------
-- Both surfaced while profiling the match pages. Neither table is large yet,
-- so these are cheap to build now and stop a sequential scan from becoming the
-- page's cost later.
--
-- Rollback: drop index match_summary_images_match_status_idx, scores_user_id_idx;
-- ===========================================================================

-- Every finished match page asks for that match's completed comic render. The
-- table only had a unique index on the provider's generation id, so this
-- lookup had nothing to use.
create index if not exists match_summary_images_match_status_idx
  on public.match_summary_images (match_id, status);

-- Scores were indexed by match (compute_match_scores deletes by it) but never
-- by user. Every group and phase board joins scores to the group's members on
-- user_id, and the per-user aggregates in the leaderboard functions group by
-- it.
create index if not exists scores_user_id_idx
  on public.scores (user_id);
