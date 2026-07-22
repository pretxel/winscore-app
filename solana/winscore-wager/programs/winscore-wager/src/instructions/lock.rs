use crate::constants::*;
use crate::error::*;
use crate::state::*;
use anchor_lang::prelude::*;

/// Permissionless lock: after the on-chain clock reaches close, anyone can lock the round.
#[derive(Accounts)]
pub struct Lock<'info> {
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
        constraint = Clock::get()?.unix_timestamp >= wager_round.closes_at @ WagerError::EntryClosed,
    )]
    pub wager_round: Account<'info, WagerRound>,
}

pub fn handle_lock(_ctx: Context<Lock>) -> Result<()> {
    let wager_round = &mut _ctx.accounts.wager_round;
    wager_round.state = WagerRoundState::Locked;
    Ok(())
}
