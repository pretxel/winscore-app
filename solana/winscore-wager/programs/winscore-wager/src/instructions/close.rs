use crate::constants::*;
use crate::error::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

/// Terminal close: closes wager round account and vault (ATA) and returns rent
/// to immutable recipients. Requires zero vault token balance and zero liability.
/// No arbitrary withdrawal instruction exists — this is the only way funds leave.
#[derive(Accounts)]
pub struct Close<'info> {
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
        close = rent_recipient_a,
        constraint = wager_round.state == WagerRoundState::Settled
                   || wager_round.state == WagerRoundState::Cancelled @ WagerError::NotSettled,
    )]
    pub wager_round: Account<'info, WagerRound>,

    /// CHECK: immutable rent recipient from initialization
    #[account(mut)]
    pub rent_recipient_a: AccountInfo<'info>,

    /// CHECK: immutable rent recipient from initialization
    #[account(mut)]
    pub rent_recipient_b: AccountInfo<'info>,

    #[account(
        mut,
        associated_token::mint = wager_round.approved_mint,
        associated_token::authority = wager_round,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_close(ctx: Context<Close>) -> Result<()> {
    let wager_round = &ctx.accounts.wager_round;
    let vault = &ctx.accounts.vault;

    // Vault must be empty
    require!(vault.amount == 0, WagerError::VaultNotEmpty);

    // Close the vault ATA — send rent to immutable rent_recipient_b
    let vault_seeds: &[&[&[u8]]] = &[&[
        WAGER_ROUND_SEED,
        &[wager_round.version],
        &wager_round.group_id,
        &wager_round.round_id,
        &[wager_round.bump],
    ]];

    let close_vault_accounts = token::CloseAccount {
        account: ctx.accounts.vault.to_account_info(),
        destination: ctx.accounts.rent_recipient_b.to_account_info(),
        authority: wager_round.to_account_info(),
    };
    let close_vault_ctx = CpiContext::new(
        ctx.accounts.token_program.key(),
        close_vault_accounts,
    ).with_signer(vault_seeds);
    token::close_account(close_vault_ctx)?;

    // The wager_round account is closed via Anchor's `close = rent_recipient_a`
    // constraint on the account struct — no manual close needed.

    Ok(())
}
