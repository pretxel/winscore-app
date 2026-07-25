-- Let the wager reconciler report into the operations control room like every
-- other background job, so a stuck deposit is visible instead of silent.
--
-- Rollback:
-- alter table public.operation_runs drop constraint operation_runs_kind_check;
-- alter table public.operation_runs
--   add constraint operation_runs_kind_check check (kind in (
--     'sync_matches', 'sync_news', 'prediction_reminders', 'quiz_reminders',
--     'results_digest', 'recap_digest', 'comeback_emails', 'playoff_score_email',
--     'score_rules_email', 'winners_email'
--   ));

alter table public.operation_runs
  drop constraint operation_runs_kind_check;

alter table public.operation_runs
  add constraint operation_runs_kind_check check (kind in (
    'sync_matches', 'sync_news', 'prediction_reminders', 'quiz_reminders',
    'results_digest', 'recap_digest', 'comeback_emails', 'playoff_score_email',
    'score_rules_email', 'winners_email', 'wager_reconcile'
  ));
