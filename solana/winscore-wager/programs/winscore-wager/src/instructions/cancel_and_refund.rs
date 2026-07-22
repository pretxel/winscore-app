use crate::constants::*;
use crate::error::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

/// Cancel the round (authority) or expire (permissionless after timeout).
/// Requires the round not yet settled. Transitions to Cancelled state.
#[derive(Accounts)]
pub struct CancelAndRefund<'info> {
    /// Can be the round authority (authorized cancel) or anyone (permissionless timeout)
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [
            WAGER_ROUND_SEED,
            &[wager_round.version],
            &wager_round.group_id,
            &wager_round.round_id,
        ],
        bump = wager_round.bump,
        constraint = wager_round.state == WagerRoundState::Initialized
                   || wager_round.state == WagerRoundState::Locked @ WagerError::AlreadySettled,
    )]
    pub wager_round: Account<'info, WagerRound>,
}

pub fn handle_cancel_and_refund(ctx: Context<CancelAndRefund>) -> Result<()> {
    let wager_round = &mut ctx.accounts.wager_round;
    let clock = Clock::get()?;

    // Authority can cancel anytime before settlement
    let is_authority = ctx.accounts.caller.key() == wager_round.authority;

    // Permissionless: only after refund_timeout has elapsed since close
    let is_timed_out = clock.unix_timestamp >= wager_round.closes_at + wager_round.refund_timeout;

    if !is_authority && !is_timed_out {
        return Err(WagerError::RefundNotAvailable.into());
    }

    wager_round.state = WagerRoundState::Cancelled;

    Ok(())
}

/// Entrant pulls their exact stake back after cancellation.
/// One-time: Entry state transitions Active → Refunded.
#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub entrant: Signer<'info>,

    #[account(
        seeds = [
            WAGER_ROUND_SEED,
            &[wager_round.version],
            &wager_round.group_id,
            &wager_round.round_id,
        ],
        bump = wager_round.bump,
        constraint = wager_round.state == WagerRoundState::Cancelled @ WagerError::RoundCancelled,
    )]
    pub wager_round: Account<'info, WagerRound>,

    #[account(
        mut,
        seeds = [
            ENTRY_SEED,
            wager_round.key().as_ref(),
            entrant.key().as_ref(),
        ],
        bump = entry.bump,
        constraint = entry.state == EntryState::Active @ WagerError::EntryAlreadyRefunded,
    )]
    pub entry: Account<'info, Entry>,

    #[account(
        mut,
        associated_token::mint = wager_round.approved_mint,
        associated_token::authority = wager_round,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = entrant_token_account.mint == wager_round.approved_mint,
    )]
    pub entrant_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_refund(ctx: Context<Refund>) -> Result<()> {
    let entry = &mut ctx.accounts.entry;
    let wager_round = &ctx.accounts.wager_round;

    let amount = entry.stake_base_units;

    // Transfer from vault back to entrant using wager_round PDA signer
    let seeds: &[&[&[u8]]] = &[&[
        WAGER_ROUND_SEED,
        &[wager_round.version],
        &wager_round.group_id,
        &wager_round.round_id,
        &[wager_round.bump],
    ]];

    let cpi_accounts = token::Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.entrant_token_account.to_account_info(),
        authority: wager_round.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.key(),
        cpi_accounts,
    ).with_signer(seeds);
    token::transfer(cpi_ctx, amount)?;

    entry.state = EntryState::Refunded;

    Ok(())
}
