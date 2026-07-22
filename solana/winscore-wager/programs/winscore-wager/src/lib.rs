pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("9q5fBczvg3XYipRmxY5tt3axGgNQfYtGeaDpbMHMLkmi");

#[program]
pub mod winscore_wager {
    use super::*;

    pub fn initialize_wager_round(
        ctx: Context<InitializeWagerRound>,
        group_id: [u8; 16],
        round_id: [u8; 16],
        closes_at: i64,
        refund_timeout: i64,
        max_participants: u16,
        max_total_stake: u64,
        settlement_authority: Pubkey,
    ) -> Result<()> {
        instructions::initialize_wager_round::handle_initialize_wager_round(
            ctx, group_id, round_id, closes_at, refund_timeout,
            max_participants, max_total_stake, settlement_authority,
        )
    }

    pub fn enter(
        ctx: Context<Enter>,
        stake_base_units: u64,
        pick_commitment: [u8; 32],
        intent_hash: [u8; 32],
    ) -> Result<()> {
        instructions::enter::handle_enter(ctx, stake_base_units, pick_commitment, intent_hash)
    }

    pub fn lock(ctx: Context<Lock>) -> Result<()> {
        instructions::lock::handle_lock(ctx)
    }

    pub fn shorten_close(ctx: Context<ShortenClose>, new_closes_at: i64) -> Result<()> {
        instructions::shorten_close::handle_shorten_close(ctx, new_closes_at)
    }

    pub fn settle(
        ctx: Context<Settle>,
        manifest_hash: [u8; 32],
        merkle_root: [u8; 32],
        winner_count: u16,
        total_distributable: u64,
    ) -> Result<()> {
        instructions::settle::handle_settle(
            ctx, manifest_hash, merkle_root, winner_count, total_distributable,
        )
    }

    pub fn claim(
        ctx: Context<ClaimReward>,
        amount: u64,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        instructions::claim::handle_claim(ctx, amount, proof)
    }

    pub fn cancel_and_refund(ctx: Context<CancelAndRefund>) -> Result<()> {
        instructions::cancel_and_refund::handle_cancel_and_refund(ctx)
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        instructions::cancel_and_refund::handle_refund(ctx)
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        instructions::close::handle_close(ctx)
    }
}
