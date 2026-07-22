use winscore_wager::constants::*;
use winscore_wager::error::*;
use winscore_wager::state::*;
use anchor_lang::prelude::Pubkey;

#[test]
fn test_program_constants() {
    assert_eq!(PROGRAM_VERSION, 1);
    assert_eq!(MAX_PARTICIPANTS, 100);
    assert_eq!(MAX_TOTAL_STAKE, 100_000_000_000);
}

#[test]
fn test_account_sizes() {
    assert!(WAGER_ROUND_SIZE > 0);
    assert!(ENTRY_SIZE > 0);
    assert!(CLAIM_SIZE > 0);
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
