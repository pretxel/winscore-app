use crate::constants::*;
use crate::error::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

/// Initialize a wager round with vault creation.
/// Records group/round IDs, approved mint, stake, close, authorities, limits.
#[derive(Accounts)]
#[instruction(
    group_id: [u8; 16],
    round_id: [u8; 16],
    closes_at: i64,
    refund_timeout: i64,
    max_participants: u16,
    max_total_stake: u64,
)]
pub struct InitializeWagerRound<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = WAGER_ROUND_SIZE,
        seeds = [
            WAGER_ROUND_SEED,
            &[PROGRAM_VERSION],
            &group_id,
            &round_id,
        ],
        bump,
    )]
    pub wager_round: Account<'info, WagerRound>,

    pub approved_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = approved_mint,
        associated_token::authority = wager_round,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// First recipient for rent return on close
    /// CHECK: immutable rent recipient, no data access needed
    pub rent_recipient_a: AccountInfo<'info>,

    /// Second recipient for rent return on close
    /// CHECK: immutable rent recipient, no data access needed
    pub rent_recipient_b: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handle_initialize_wager_round(
    ctx: Context<InitializeWagerRound>,
    group_id: [u8; 16],
    round_id: [u8; 16],
    closes_at: i64,
    refund_timeout: i64,
    max_participants: u16,
    max_total_stake: u64,
    settlement_authority: Pubkey,
) -> Result<()> {
    let wager_round = &mut ctx.accounts.wager_round;
    let vault = &ctx.accounts.vault;

    // Validate mint decimals
    let decimals = ctx.accounts.approved_mint.decimals;
    require!(decimals <= 9, WagerError::InvalidDecimals);

    wager_round.version = PROGRAM_VERSION;
    wager_round.group_id = group_id;
    wager_round.round_id = round_id;
    wager_round.authority = ctx.accounts.authority.key();
    wager_round.settlement_authority = settlement_authority;
    wager_round.approved_mint = ctx.accounts.approved_mint.key();
    wager_round.approved_token_program = ctx.accounts.token_program.key();
    wager_round.verified_decimals = decimals;
    wager_round.stake_base_units = 0; // Set externally by the app based on config
    wager_round.closes_at = closes_at;
    wager_round.refund_timeout = refund_timeout;
    wager_round.pot_total = 0;
    wager_round.participant_count = 0;
    wager_round.max_participants = max_participants;
    wager_round.max_total_stake = max_total_stake;
    wager_round.state = WagerRoundState::Initialized;
    wager_round.manifest_hash = [0u8; 32];
    wager_round.merkle_root = [0u8; 32];
    wager_round.winner_count = 0;
    wager_round.total_distributable = 0;
    wager_round.rent_recipient_a = ctx.accounts.rent_recipient_a.key();
    wager_round.rent_recipient_b = ctx.accounts.rent_recipient_b.key();
    wager_round.bump = ctx.bumps.wager_round;
    wager_round.vault_bump = 0; // ATA doesn't use PDA seeds

    Ok(())
}
