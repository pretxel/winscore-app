-- Rollback: drop table if exists public.wager_chain_events;

-- ============= wager_chain_events =============
-- Append-only normalized ledger of on-chain events.
-- Keyed by signature/instruction/event identity.

create table public.wager_chain_events (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid references public.wager_intents(id) on delete set null,
  transaction_signature bytea check (length(transaction_signature) = 64),
  event_type text not null
    check (event_type in (
      'entry_created', 'round_locked', 'round_settled',
      'claim_executed', 'refund_executed', 'round_closed',
      'cancel_requested', 'reconciliation'
    )),
  wager_round_pda bytea check (length(wager_round_pda) = 32),
  entry_pda bytea check (length(entry_pda) = 32),
  claim_pda bytea check (length(claim_pda) = 32),
  parsed_data jsonb not null default '{}'::jsonb,
  block_slot bigint,
  block_time timestamptz,
  rpc_node text,
  commitment text,
  observed_at timestamptz not null default now(),

  constraint wager_chain_events_sig_unique unique (transaction_signature, event_type)
);

create index wager_chain_events_intent_idx on public.wager_chain_events (intent_id);
create index wager_chain_events_sig_idx on public.wager_chain_events (transaction_signature);
create index wager_chain_events_type_idx on public.wager_chain_events (event_type);
create index wager_chain_events_observed_idx on public.wager_chain_events (observed_at);

alter table public.wager_chain_events enable row level security;
