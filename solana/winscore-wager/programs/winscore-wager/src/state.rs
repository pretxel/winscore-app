use anchor_lang::prelude::*;

/// Core wager round account.
/// Stores configuration, stake info, state machine, and authorities.
#[account]
pub struct WagerRound {
    pub version: u8,
    pub group_id: [u8; 16],
    pub round_id: [u8; 16],
    pub authority: Pubkey,
    pub settlement_authority: Pubkey,
    pub approved_mint: Pubkey,
    pub approved_token_program: Pubkey,
    pub verified_decimals: u8,
    pub stake_base_units: u64,
    pub closes_at: i64,
    pub refund_timeout: i64,
    pub pot_total: u64,
    pub participant_count: u16,
    pub max_participants: u16,
    pub max_total_stake: u64,
    pub state: WagerRoundState,
    pub manifest_hash: [u8; 32],
    pub merkle_root: [u8; 32],
    pub winner_count: u16,
    pub total_distributable: u64,
    pub rent_recipient_a: Pubkey,
    pub rent_recipient_b: Pubkey,
    pub bump: u8,
    pub vault_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum WagerRoundState {
    Initialized,
    Locked,
    Settled,
    Cancelled,
    Closed,
}

/// Per-entrant entry account.
/// Created by the participant when entering. Stores the pick commitment and wallet.
#[account]
pub struct Entry {
    pub wager_round: Pubkey,
    pub entrant: Pubkey,
    pub pick_commitment: [u8; 32],
    pub intent_hash: [u8; 32],
    pub state: EntryState,
    pub entry_pda: Pubkey,
    pub stake_base_units: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EntryState {
    Active,
    Settled,
    Refunded,
}

/// Per-winner claim account.
/// PDA seeded with wager_round + winner wallet. Prevents double claims.
#[account]
pub struct Claim {
    pub wager_round: Pubkey,
    pub winner: Pubkey,
    pub amount: u64,
    pub state: ClaimState,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ClaimState {
    Pending,
    Claimed,
}

/// Vault wrapper for the ATA owned by the wager round PDA.
/// The actual token balance is in the ATA; this struct is for authority derivation.
pub struct Vault {}
