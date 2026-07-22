-- Rollback: drop table public.competition_rounds;

-- ============= competition_rounds =============

create table public.competition_rounds (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete restrict,
  round_key text not null,
  round_number int,
  labels jsonb not null default '{}'::jsonb,
  display_order int not null default 0,
  opens_at timestamptz not null,
  admin_closes_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'closed', 'review')),
  provider_metadata jsonb not null default '{}'::jsonb,
  provider_review_status text not null default 'unmapped'
    check (provider_review_status in ('unmapped', 'mapped', 'conflict', 'changed', 'reviewed')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint competition_rounds_round_key_length check (char_length(round_key) between 1 and 100),
  constraint competition_rounds_unique_per_competition unique (competition_id, round_key),
  constraint competition_rounds_unique_order unique (competition_id, display_order)
);

-- Indexes
create index competition_rounds_competition_status_idx
  on public.competition_rounds (competition_id, status);
create index competition_rounds_opens_at_idx
  on public.competition_rounds (opens_at);
create index competition_rounds_closes_at_idx
  on public.competition_rounds (admin_closes_at);

-- updated_at trigger
create trigger trg_competition_rounds_updated_at
  before update on public.competition_rounds
  for each row execute function public.set_updated_at();

-- RLS
alter table public.competition_rounds enable row level security;

create policy competition_rounds_select_public
  on public.competition_rounds
  for select
  to anon, authenticated
  using (true);

create policy competition_rounds_admin_write
  on public.competition_rounds
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
