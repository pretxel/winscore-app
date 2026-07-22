-- Rollback:
-- drop table if exists public.wager_claims;
-- drop table if exists public.wager_settlements;
-- drop table if exists public.wager_entry_predictions;
-- drop table if exists public.wager_entries;
-- drop table if exists public.wager_intents;
-- drop table if exists public.wallet_links;
-- drop table if exists public.wallet_link_challenges;

-- ============= wallet_link_challenges =============
-- One-time signed-message challenges for wallet ownership proof.
-- Expire quickly, single-use, consumed atomically with link creation.

create table public.wallet_link_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_address bytea not null check (length(wallet_address) = 32),
  domain text not null,
  cluster text not null default 'devnet' check (cluster in ('devnet')),
  nonce bytea not null check (length(nonce) = 32),
  message_text text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);

create index wallet_link_challenges_user_idx on public.wallet_link_challenges (user_id);
create index wallet_link_challenges_wallet_idx on public.wallet_link_challenges (wallet_address);
create index wallet_link_challenges_expires_idx on public.wallet_link_challenges (expires_at) where consumed = false;

alter table public.wallet_link_challenges enable row level security;

-- ============= wallet_links =============
-- Proven wallet address ownership. One active address per user (unique).

create table public.wallet_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_address bytea not null check (length(wallet_address) = 32),
  challenge_id uuid not null references public.wallet_link_challenges(id),
  signature_bytes bytea not null check (length(signature_bytes) = 64),
  cluster text not null default 'devnet' check (cluster in ('devnet')),
  is_active boolean not null default true,
  linked_at timestamptz not null default now(),
  unlinked_at timestamptz,
  created_at timestamptz not null default now()
);

-- One active wallet per user, one active user per wallet
create unique index wallet_links_active_user_idx
  on public.wallet_links (user_id) where is_active = true;
create unique index wallet_links_active_wallet_idx
  on public.wallet_links (wallet_address) where is_active = true;
create index wallet_links_user_idx on public.wallet_links (user_id);

alter table public.wallet_links enable row level security;

-- ============= wager_intents =============
-- Atomic snapshot + intent. Created after free picks are saved and wager consent given.
-- Contains the immutable pick commitment hash and idempotency key.

create table public.wager_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete restrict,
  round_id uuid not null references public.competition_rounds(id) on delete restrict,
  wallet_link_id uuid not null references public.wallet_links(id) on delete restrict,
  wager_round_id uuid references public.wager_rounds(id) on delete restrict,
  pick_commitment bytea not null check (length(pick_commitment) = 32),
  canonicalization_version smallint not null default 1,
  idempotency_key uuid not null,
  state text not null default 'preparing'
    check (state in ('preparing', 'awaiting_signature', 'submitted', 'confirmed', 'failed', 'expired', 'reconciliation_required')),
  eligibility_check jsonb not null default '{}'::jsonb,
  consent_version text,
  consent_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint wager_intents_unique_idempotency unique (idempotency_key),
  constraint wager_intents_one_per_user_round unique (user_id, group_id, round_id)
);

create index wager_intents_group_idx on public.wager_intents (group_id);
create index wager_intents_state_idx on public.wager_intents (state);
create index wager_intents_idempotency_idx on public.wager_intents (idempotency_key);

create trigger trg_wager_intents_updated_at
  before update on public.wager_intents
  for each row execute function public.set_updated_at();

alter table public.wager_intents enable row level security;

-- ============= wager_entries =============
-- Verified on-chain entry records. NOT optimistic client state — only persisted
-- after independent RPC verification of the on-chain Entry account.

create table public.wager_entries (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.wager_intents(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete restrict,
  round_id uuid not null references public.competition_rounds(id) on delete restrict,
  wager_round_id uuid not null references public.wager_rounds(id) on delete restrict,
  wallet_address bytea not null check (length(wallet_address) = 32),
  entry_pda bytea not null check (length(entry_pda) = 32),
  transaction_signature bytea check (length(transaction_signature) = 64),
  stake_base_units numeric(20,0) not null check (stake_base_units > 0),
  state text not null default 'confirmed'
    check (state in ('confirmed', 'locked', 'settled', 'cancelled', 'refunded')),
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint wager_entries_one_per_user_round unique (user_id, group_id, round_id)
);

create unique index wager_entries_entry_pda_idx on public.wager_entries (entry_pda);
create index wager_entries_wager_round_idx on public.wager_entries (wager_round_id);

create trigger trg_wager_entries_updated_at
  before update on public.wager_entries
  for each row execute function public.set_updated_at();

alter table public.wager_entries enable row level security;

-- ============= wager_entry_predictions =============
-- Immutable snapshot of the entrant's picks at intent time.
-- Scores are non-negative integers. Copied from the user's free predictions
-- at snapshot time and NEVER updated afterward.

create table public.wager_entry_predictions (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.wager_intents(id) on delete cascade,
  entry_id uuid references public.wager_entries(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete restrict,
  home_goals smallint not null check (home_goals between 0 and 20),
  away_goals smallint not null check (away_goals between 0 and 20),
  source_submitted_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index wager_entry_predictions_intent_idx on public.wager_entry_predictions (intent_id);
create index wager_entry_predictions_entry_idx on public.wager_entry_predictions (entry_id);
create index wager_entry_predictions_match_idx on public.wager_entry_predictions (match_id);

alter table public.wager_entry_predictions enable row level security;

-- ============= wager_settlements =============
-- One settlement per wager round. Records the manifest, Merkle root, and
-- on-chain settlement transaction evidence.

create table public.wager_settlements (
  id uuid primary key default gen_random_uuid(),
  wager_round_id uuid not null references public.wager_rounds(id) on delete restrict,
  manifest_hash bytea not null check (length(manifest_hash) = 32),
  manifest_canonical_bytes text,
  merkle_root bytea not null check (length(merkle_root) = 32),
  winner_count int not null check (winner_count >= 0),
  total_distributable numeric(20,0) not null check (total_distributable >= 0),
  settlement_signature bytea check (length(settlement_signature) = 64),
  settled_at timestamptz,
  correction_delay_elapsed_at timestamptz,
  created_at timestamptz not null default now(),

  constraint wager_settlements_one_per_round unique (wager_round_id)
);

create index wager_settlements_wager_round_idx on public.wager_settlements (wager_round_id);

alter table public.wager_settlements enable row level security;

-- ============= wager_claims =============
-- Individual winner claims. Deterministic PDA prevents replay.
-- Mutually exclusive with refunds.

create table public.wager_claims (
  id uuid primary key default gen_random_uuid(),
  wager_round_id uuid not null references public.wager_rounds(id) on delete restrict,
  settlement_id uuid not null references public.wager_settlements(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_id uuid not null references public.wager_entries(id) on delete restrict,
  wallet_address bytea not null check (length(wallet_address) = 32),
  claim_pda bytea not null check (length(claim_pda) = 32),
  award_base_units numeric(20,0) not null check (award_base_units > 0),
  claim_signature bytea check (length(claim_signature) = 64),
  state text not null default 'pending'
    check (state in ('pending', 'claimed', 'failed')),
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index wager_claims_claim_pda_idx on public.wager_claims (claim_pda);
create index wager_claims_user_idx on public.wager_claims (user_id);
create index wager_claims_round_idx on public.wager_claims (wager_round_id);

alter table public.wager_claims enable row level security;
