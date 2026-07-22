-- Rollback: drop table if exists public.wager_rounds; drop table if exists public.group_wager_configs;

-- ============= group_wager_configs =============
-- One row per pool when an owner enables wagering. Ordinary members get
-- read-only access. Changing mint/program/decimals/stake affects only
-- rounds not yet initialized.

create table public.group_wager_configs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  enabled boolean not null default false,
  approved_mint bytea not null check (length(approved_mint) = 32),
  approved_token_program bytea not null check (length(approved_token_program) = 32),
  verified_decimals smallint not null check (verified_decimals between 0 and 9),
  stake_base_units numeric(20,0) not null check (stake_base_units > 0),
  cluster text not null default 'devnet' check (cluster in ('devnet')),
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint group_wager_configs_one_per_pool unique (group_id)
);

create index group_wager_configs_group_idx on public.group_wager_configs (group_id);
create index group_wager_configs_enabled_idx on public.group_wager_configs (group_id) where enabled = true;

create trigger trg_group_wager_configs_updated_at
  before update on public.group_wager_configs
  for each row execute function public.set_updated_at();

alter table public.group_wager_configs enable row level security;

-- ============= wager_rounds =============
-- Immutable configuration snapshot for a specific competition round.
-- Created when a pool owner initializes wagering for a round.
-- CHANGING: once created, the on-chain wager round is the authority;
-- this row captures the agreed state at initialization time.

create table public.wager_rounds (
  id uuid primary key default gen_random_uuid(),
  wager_config_id uuid not null references public.group_wager_configs(id) on delete restrict,
  group_id uuid not null references public.groups(id) on delete restrict,
  round_id uuid not null references public.competition_rounds(id) on delete restrict,
  stake_base_units numeric(20,0) not null check (stake_base_units > 0),
  approved_mint bytea not null check (length(approved_mint) = 32),
  approved_token_program bytea not null check (length(approved_token_program) = 32),
  verified_decimals smallint not null check (verified_decimals between 0 and 9),
  closes_at timestamptz not null,
  cluster text not null default 'devnet' not null check (cluster in ('devnet')),
  program_version smallint not null default 1,
  settlement_authority bytea check (length(settlement_authority) = 32),
  state text not null default 'initialized'
    check (state in ('initialized', 'locked', 'settled', 'cancelled', 'closed')),
  pot_total_base_units numeric(20,0) not null default 0,
  participant_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint wager_rounds_one_per_pool_round unique (group_id, round_id)
);

create index wager_rounds_group_idx on public.wager_rounds (group_id);
create index wager_rounds_round_idx on public.wager_rounds (round_id);
create index wager_rounds_state_idx on public.wager_rounds (state);

create trigger trg_wager_rounds_updated_at
  before update on public.wager_rounds
  for each row execute function public.set_updated_at();

alter table public.wager_rounds enable row level security;
