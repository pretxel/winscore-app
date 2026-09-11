-- ===========================================================================
-- Round reminder emails — ledger + operation kind
-- ---------------------------------------------------------------------------
-- A daily cron emails each opted-in player the fixtures of the ROUND that is
-- about to start and that they have not predicted yet. The daily prediction
-- reminder already covers "kicks off today"; this one lands a day ahead, while
-- there is still time to think about the whole matchday.
--
-- `round_reminder_log` gives at-most-once delivery per (user, round): a round
-- spans several days and several fixtures, so the natural idempotency key is
-- the round, not a calendar date. A row is written only after the provider
-- accepts the message, so the ledger survives idempotent re-runs and crashes
-- (mirrors public.prediction_reminder_log).
--
-- No new opt-out: this reminder is the same category as the daily one and
-- honours the existing `prediction_reminder` preference and its one-click
-- unsubscribe route, so a player who silenced pick reminders stays silenced.
--
-- Purely additive.
-- ===========================================================================

create table public.round_reminder_log (
  user_id uuid not null references public.profiles(id) on delete cascade,
  round_id uuid not null references public.competition_rounds(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (user_id, round_id)
);
create index round_reminder_log_round_idx
  on public.round_reminder_log (round_id);

alter table public.round_reminder_log enable row level security;
-- No policies: only the service-role key (which bypasses RLS) reads or writes
-- this ledger. Same posture as public.prediction_reminder_log.

-- ---------------------------------------------------------------------------
-- Widen both kind constraints for the new job, so it can record runs and be
-- paused from the operations control room like every other scheduled job.
-- ---------------------------------------------------------------------------
alter table public.operation_runs
  drop constraint if exists operation_runs_kind_check;

alter table public.operation_runs
  add constraint operation_runs_kind_check check (kind in (
    'sync_matches', 'sync_news', 'prediction_reminders', 'round_reminders',
    'quiz_reminders', 'results_digest', 'recap_digest', 'comeback_emails',
    'playoff_score_email', 'score_rules_email', 'wager_reconcile',
    'winners_email', 'announcement_email'
  ));

alter table public.operation_settings
  drop constraint if exists operation_settings_kind_check;

alter table public.operation_settings
  add constraint operation_settings_kind_check check (kind in (
    'sync_matches', 'sync_news', 'prediction_reminders', 'round_reminders',
    'quiz_reminders', 'results_digest', 'recap_digest', 'comeback_emails',
    'playoff_score_email', 'score_rules_email', 'wager_reconcile',
    'winners_email', 'announcement_email'
  ));
