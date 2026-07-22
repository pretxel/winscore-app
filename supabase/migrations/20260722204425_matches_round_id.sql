-- Rollback:
-- alter table public.matches drop constraint if exists matches_round_competition_fk;
-- alter table public.matches drop column if exists round_id;
-- drop index if exists matches_round_id_idx;
-- drop index if exists matches_competition_round_idx;
-- alter table public.competition_rounds drop constraint if exists competition_rounds_id_competition_unique;

-- Allow composite FK: matches (round_id, competition_id) -> competition_rounds (id, competition_id)
alter table public.competition_rounds
  add constraint competition_rounds_id_competition_unique unique (id, competition_id);

-- Add nullable round_id to matches
alter table public.matches
  add column round_id uuid;

-- Composite FK ensures a match can only be assigned to a round within the same competition
alter table public.matches
  add constraint matches_round_competition_fk
    foreign key (round_id, competition_id)
    references public.competition_rounds (id, competition_id)
    on delete set null;

-- Indexes for round-scoped queries
create index matches_round_id_idx on public.matches (round_id);
create index matches_competition_round_idx on public.matches (competition_id, round_id);
