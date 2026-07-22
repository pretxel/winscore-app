pub const PROGRAM_VERSION: u8 = 1;

/// Seed prefixes for PDA derivation.
/// Format: [prefix, version_byte, group_uuid(16), round_uuid(16)]
pub const WAGER_ROUND_SEED: &[u8] = b"wager-round";
pub const ENTRY_SEED: &[u8] = b"entry";
pub const CLAIM_SEED: &[u8] = b"claim";
pub const VAULT_SEED: &[u8] = b"vault";

/// Account sizes
pub const WAGER_ROUND_SIZE: usize = 8 + 1 + 32 + 32 + 32 + 32 + 32 + 1 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 32 + 32 + 1 + 32;
pub const ENTRY_SIZE: usize = 8 + 32 + 32 + 32 + 32 + 1 + 32 + 8 + 8;
pub const CLAIM_SIZE: usize = 8 + 32 + 32 + 32 + 8 + 1;

/// Maximum participants per round (u16)
pub const MAX_PARTICIPANTS: u16 = 100;
/// Maximum stake total in base units (u64 safe buffer)
pub const MAX_TOTAL_STAKE: u64 = 100_000_000_000;
