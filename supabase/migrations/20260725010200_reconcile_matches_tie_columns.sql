-- Reconcile schema drift: 20260716000000 is recorded as applied on the remote
-- database, but the matches.tie_key / matches.leg columns and the tie_key index
-- it declares do not exist there. Anyone reading the migration history would
-- assume they do, so bring the schema up to what is declared rather than leaving
-- the two disagreeing.
--
-- Both columns stay nullable: they describe two-legged aggregate ties (Liga MX
-- liguilla) and no competition currently declares that format, so every existing
-- row is unaffected.
--
-- Guarded with IF NOT EXISTS so this is safe to run against a database where
-- 20260716000000 did take effect.
--
-- Rollback:
-- drop index if exists public.matches_tie_key_idx;
-- alter table public.matches drop column if exists leg;
-- alter table public.matches drop column if exists tie_key;

alter table public.matches
  add column if not exists tie_key text,
  add column if not exists leg int;

create index if not exists matches_tie_key_idx
  on public.matches (competition_id, tie_key);
