use crate::constants::*;
use crate::error::*;
use crate::state::*;
use anchor_lang::prelude::*;

/// Authority-controlled: can only REDUCE the closes_at timestamp.
/// Cannot extend. Useful when fixture kickoff moves earlier.
#[derive(Accounts)]
#[instruction(new_closes_at: i64)]
pub struct ShortenClose<'info> {
    #[account(
        constraint = authority.key() == wager_round.authority @ WagerError::InvalidAuthority,
    )]
    pub authority: Signer<'info>,

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
    )]
    pub wager_round: Account<'info, WagerRound>,
}

pub fn handle_shorten_close(ctx: Context<ShortenClose>, new_closes_at: i64) -> Result<()> {
    let wager_round = &mut ctx.accounts.wager_round;

    require!(
        new_closes_at < wager_round.closes_at,
        WagerError::CloseExtensionForbidden
    );

    wager_round.closes_at = new_closes_at;
    Ok(())
}
