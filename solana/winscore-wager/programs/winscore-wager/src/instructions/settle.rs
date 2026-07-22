use crate::constants::*;
use crate::error::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

/// Settlement authority records the result manifest hash, Merkle root,
/// winner count, and total-distributable equality check.
/// One-time: state transitions from Locked → Settled.
#[derive(Accounts)]
#[instruction(
    manifest_hash: [u8; 32],
    merkle_root: [u8; 32],
    winner_count: u16,
    total_distributable: u64,
)]
pub struct Settle<'info> {
    #[account(
        constraint = settlement_authority.key() == wager_round.settlement_authority @ WagerError::InvalidAuthority,
    )]
    pub settlement_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [
            WAGER_ROUND_SEED,
            &[wager_round.version],
            &wager_round.group_id,
            &wager_round.round_id,
        ],
        bump = wager_round.bump,
        constraint = wager_round.state == WagerRoundState::Locked @ WagerError::NotLocked,
    )]
    pub wager_round: Account<'info, WagerRound>,

    /// CHECK: Only read to verify vault balance for distributable check
    #[account(
        constraint = vault.amount == total_distributable @ WagerError::DistributableMismatch,
    )]
    pub vault: Account<'info, TokenAccount>,
}

pub fn handle_settle(
    ctx: Context<Settle>,
    manifest_hash: [u8; 32],
    merkle_root: [u8; 32],
    winner_count: u16,
    total_distributable: u64,
) -> Result<()> {
    let wager_round = &mut ctx.accounts.wager_round;

    require!(
        total_distributable == wager_round.pot_total,
        WagerError::DistributableMismatch
    );

    wager_round.state = WagerRoundState::Settled;
    wager_round.manifest_hash = manifest_hash;
    wager_round.merkle_root = merkle_root;
    wager_round.winner_count = winner_count;
    wager_round.total_distributable = total_distributable;

    Ok(())
}
