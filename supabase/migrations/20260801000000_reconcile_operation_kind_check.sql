-- ===========================================================================
-- Reconcile operation_runs_kind_check with the deployed constraint
-- ---------------------------------------------------------------------------
-- 20260723000000_announcement_email_log was applied to the remote database out
-- of band, after 20260725010100_wager_reconcile_operation_kind, despite carrying
-- an earlier timestamp. Both drop and recreate operation_runs_kind_check, so on
-- the remote the later-applied 0723 won and the constraint carries
-- 'announcement_email'. Replaying the migrations in timestamp order against a
-- clean database produces the opposite: 0723 runs first, then 20260725010100
-- recreates the constraint WITHOUT 'announcement_email', and an announcement run
-- would fail the check on a fresh environment while succeeding in production.
--
-- Neither of those migrations can be edited — both are already applied. This
-- reasserts the full value set as the last word in timestamp order, so a fresh
-- replay converges on what production actually has.
--
-- Idempotent and purely additive: it only widens the accepted set.
-- ===========================================================================

alter table public.operation_runs
  drop constraint operation_runs_kind_check;

alter table public.operation_runs
  add constraint operation_runs_kind_check check (kind in (
    'sync_matches', 'sync_news', 'prediction_reminders', 'quiz_reminders',
    'results_digest', 'recap_digest', 'comeback_emails', 'playoff_score_email',
    'score_rules_email', 'wager_reconcile', 'winners_email', 'announcement_email'
  ));
