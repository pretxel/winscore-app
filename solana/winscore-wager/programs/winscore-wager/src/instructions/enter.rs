use crate::constants::*;
use crate::error::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

/// Enter a wager round by depositing exactly the stake.
/// Records the pick commitment hash and intent identity.
/// Entry PDA is deterministic: seeds = [b"entry", wager_round, entrant].
#[derive(Accounts)]
#[instruction(
    stake_base_units: u64,
    pick_commitment: [u8; 32],
    intent_hash: [u8; 32],
)]
pub struct Enter<'info> {
    #[account(mut)]
    pub entrant: Signer<'info>,

    #[account(
        mut,
        seeds = [
            WAGER_ROUND_SEED,
            &[wager_round.version],
            &wager_round.group_id,
            &wager_round.round_id,
        ],
        bump = wager_round.bump,
        constraint = wager_round.state == WagerRoundState::Initialized @ WagerError::NotInitialized,
        constraint = Clock::get()?.unix_timestamp < wager_round.closes_at @ WagerError::EntryClosed,
    )]
    pub wager_round: Account<'info, WagerRound>,

    #[account(
        init,
        payer = entrant,
        space = ENTRY_SIZE,
        seeds = [
            ENTRY_SEED,
            wager_round.key().as_ref(),
            entrant.key().as_ref(),
        ],
        bump,
    )]
    pub entry: Account<'info, Entry>,

    #[account(
        mut,
        constraint = entrant_token_account.mint == wager_round.approved_mint @ WagerError::InvalidMint,
    )]
    pub entrant_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = approved_mint,
        associated_token::authority = wager_round,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        constraint = approved_mint.key() == wager_round.approved_mint @ WagerError::InvalidMint,
    )]
    pub approved_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_enter(
    ctx: Context<Enter>,
    stake_base_units: u64,
    pick_commitment: [u8; 32],
    intent_hash: [u8; 32],
) -> Result<()> {
    let wager_round = &mut ctx.accounts.wager_round;
    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp < wager_round.closes_at,
        WagerError::EntryClosed
    );
    require!(
        wager_round.participant_count < wager_round.max_participants,
        WagerError::ParticipantLimitReached
    );

    let new_total = wager_round
        .pot_total
        .checked_add(stake_base_units)
        .ok_or(WagerError::ArithmeticOverflow)?;
    require!(
        new_total <= wager_round.max_total_stake,
        WagerError::StakeTotalLimitReached
    );

    // Transfer exact stake from entrant to vault via TransferChecked
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.entrant_token_account.to_account_info(),
        mint: ctx.accounts.approved_mint.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.entrant.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts);
    token::transfer_checked(
        cpi_ctx,
        stake_base_units,
        wager_round.verified_decimals,
    )?;

    // Update accounting
    wager_round.pot_total = new_total;
    wager_round.participant_count = wager_round
        .participant_count
        .checked_add(1)
        .ok_or(WagerError::ArithmeticOverflow)?;

    // Populate entry
    let entry_pda = ctx.accounts.entry.key();
    let entry = &mut ctx.accounts.entry;
    entry.wager_round = wager_round.key();
    entry.entrant = ctx.accounts.entrant.key();
    entry.pick_commitment = pick_commitment;
    entry.intent_hash = intent_hash;
    entry.state = EntryState::Active;
    entry.entry_pda = entry_pda;
    entry.stake_base_units = stake_base_units;
    entry.bump = ctx.bumps.entry;

    Ok(())
}
