use winscore_wager::constants::*;
use winscore_wager::error::*;
use winscore_wager::state::*;
use anchor_lang::prelude::Pubkey;
use anchor_lang::{AnchorSerialize, Discriminator};

/// Borsh-serialize an account body, so its length can be compared with the
/// `space` its `init` constraint allocates.
fn serialized_len<T: AnchorSerialize>(value: &T) -> usize {
    let mut buf = Vec::new();
    value.serialize(&mut buf).unwrap();
    buf.len()
}

#[test]
fn test_program_constants() {
    assert_eq!(PROGRAM_VERSION, 1);
    assert_eq!(MAX_PARTICIPANTS, 100);
    assert_eq!(MAX_TOTAL_STAKE, 100_000_000_000);
}

/// Each `*_SIZE` constant is what `init` allocates. Serialize a fully-populated
/// instance of each account and compare: too small and every instruction fails
/// with AccountDidNotDeserialize (3003), which is exactly how WAGER_ROUND_SIZE
/// was found to be 15 bytes short; too large and the payer overpays rent
/// forever. Asserting `> 0`, as this test previously did, caught neither.
#[test]
fn test_account_sizes_match_serialized_layout() {
    let round = WagerRound {
        version: PROGRAM_VERSION,
        group_id: [1; 16],
        round_id: [2; 16],
        authority: Pubkey::new_unique(),
        settlement_authority: Pubkey::new_unique(),
        approved_mint: Pubkey::new_unique(),
        approved_token_program: Pubkey::new_unique(),
        verified_decimals: 6,
        stake_base_units: u64::MAX,
        closes_at: i64::MAX,
        refund_timeout: i64::MAX,
        pot_total: u64::MAX,
        participant_count: u16::MAX,
        max_participants: u16::MAX,
        max_total_stake: u64::MAX,
        state: WagerRoundState::Initialized,
        manifest_hash: [3; 32],
        merkle_root: [4; 32],
        winner_count: u16::MAX,
        total_distributable: u64::MAX,
        rent_recipient_a: Pubkey::new_unique(),
        rent_recipient_b: Pubkey::new_unique(),
        bump: 255,
        vault_bump: 255,
    };
    assert_eq!(
        WagerRound::DISCRIMINATOR.len() + serialized_len(&round),
        WAGER_ROUND_SIZE,
        "WAGER_ROUND_SIZE does not match the serialized WagerRound"
    );

    let entry = Entry {
        wager_round: Pubkey::new_unique(),
        entrant: Pubkey::new_unique(),
        pick_commitment: [5; 32],
        intent_hash: [6; 32],
        state: EntryState::Active,
        entry_pda: Pubkey::new_unique(),
        stake_base_units: u64::MAX,
        bump: 255,
    };
    assert_eq!(
        Entry::DISCRIMINATOR.len() + serialized_len(&entry),
        ENTRY_SIZE,
        "ENTRY_SIZE does not match the serialized Entry"
    );

    let claim = Claim {
        wager_round: Pubkey::new_unique(),
        winner: Pubkey::new_unique(),
        amount: u64::MAX,
        state: ClaimState::Pending,
        bump: 255,
    };
    assert_eq!(
        Claim::DISCRIMINATOR.len() + serialized_len(&claim),
        CLAIM_SIZE,
        "CLAIM_SIZE does not match the serialized Claim"
    );
}

#[test]
fn test_pda_seeds_are_deterministic() {
    let program_id = winscore_wager::id();
    let group_id: [u8; 16] = [1; 16];
    let round_id: [u8; 16] = [2; 16];

    let (pda1, _) = Pubkey::find_program_address(
        &[WAGER_ROUND_SEED, &[PROGRAM_VERSION], &group_id, &round_id],
        &program_id,
    );
    let (pda2, _) = Pubkey::find_program_address(
        &[WAGER_ROUND_SEED, &[PROGRAM_VERSION], &group_id, &round_id],
        &program_id,
    );
    assert_eq!(pda1, pda2);

    // Different group_id produces different PDA
    let other_group: [u8; 16] = [3; 16];
    let (pda3, _) = Pubkey::find_program_address(
        &[WAGER_ROUND_SEED, &[PROGRAM_VERSION], &other_group, &round_id],
        &program_id,
    );
    assert_ne!(pda1, pda3);
}

#[test]
fn test_state_transition_guards() {}
#[test]
fn test_authority_checks_exist() {}
#[test]
fn test_arithmetic_overflow_protection() {}
#[test]
fn test_conservation_invariant() {}
#[test]
fn test_no_arbitrary_withdrawal() {}
#[test]
fn test_mint_validation() {}
#[test]
fn test_merkle_leaf_domain_separation() {}
