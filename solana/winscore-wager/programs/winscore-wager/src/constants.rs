pub const PROGRAM_VERSION: u8 = 1;

/// Seed prefixes for PDA derivation.
/// Format: [prefix, version_byte, group_uuid(16), round_uuid(16)]
pub const WAGER_ROUND_SEED: &[u8] = b"wager-round";
pub const ENTRY_SEED: &[u8] = b"entry";
pub const CLAIM_SEED: &[u8] = b"claim";
pub const VAULT_SEED: &[u8] = b"vault";

/// Account sizes.
///
/// Each term is one field in declaration order, so a field added to the struct
/// without a matching term here is visible in review. Getting this wrong is not
/// a rent rounding issue: `init` allocates exactly `space`, and if the struct
/// serializes larger than that, every call fails with AccountDidNotDeserialize
/// (3003) — which is how the previous WAGER_ROUND_SIZE, 15 bytes short, was
/// found. Borsh packs without padding, and the enum discriminants below are all
/// single-byte because neither enum carries data.

// 8 discriminator + version 1 + group_id 16 + round_id 16 + authority 32
// + settlement_authority 32 + approved_mint 32 + approved_token_program 32
// + verified_decimals 1 + stake_base_units 8 + closes_at 8 + refund_timeout 8
// + pot_total 8 + participant_count 2 + max_participants 2 + max_total_stake 8
// + state 1 + manifest_hash 32 + merkle_root 32 + winner_count 2
// + total_distributable 8 + rent_recipient_a 32 + rent_recipient_b 32
// + bump 1 + vault_bump 1
pub const WAGER_ROUND_SIZE: usize = 8
    + 1 + 16 + 16 + 32 + 32 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 2 + 2 + 8 + 1
    + 32 + 32 + 2 + 8 + 32 + 32 + 1 + 1;

// 8 discriminator + wager_round 32 + entrant 32 + pick_commitment 32
// + intent_hash 32 + state 1 + entry_pda 32 + stake_base_units 8 + bump 1
pub const ENTRY_SIZE: usize = 8 + 32 + 32 + 32 + 32 + 1 + 32 + 8 + 1;

// 8 discriminator + wager_round 32 + winner 32 + amount 8 + state 1 + bump 1
pub const CLAIM_SIZE: usize = 8 + 32 + 32 + 8 + 1 + 1;

/// Maximum participants per round (u16)
pub const MAX_PARTICIPANTS: u16 = 100;
/// Maximum stake total in base units (u64 safe buffer)
pub const MAX_TOTAL_STAKE: u64 = 100_000_000_000;
