use crate::constants::*;
use crate::error::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use sha2::{Sha256, Digest};

/// Winner claims their award with a domain-separated Merkle proof.
/// Claim PDA is deterministic: seeds = [b"claim", wager_round, winner].
/// One-time: state transitions from Pending → Claimed.
#[derive(Accounts)]
#[instruction(
    amount: u64,
    proof: Vec<[u8; 32]>,
)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub winner: Signer<'info>,

    #[account(
        mut,
        seeds = [
            WAGER_ROUND_SEED,
            &[wager_round.version],
            &wager_round.group_id,
            &wager_round.round_id,
        ],
        bump = wager_round.bump,
        constraint = wager_round.state == WagerRoundState::Settled @ WagerError::NotSettled,
    )]
    pub wager_round: Account<'info, WagerRound>,

    #[account(
        init_if_needed,
        payer = winner,
        space = CLAIM_SIZE,
        seeds = [
            CLAIM_SEED,
            wager_round.key().as_ref(),
            winner.key().as_ref(),
        ],
        bump,
    )]
    pub claim: Account<'info, Claim>,

    #[account(
        mut,
        associated_token::mint = wager_round.approved_mint,
        associated_token::authority = wager_round,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = winner_token_account.mint == wager_round.approved_mint,
    )]
    pub winner_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_claim(
    ctx: Context<ClaimReward>,
    amount: u64,
    proof: Vec<[u8; 32]>,
) -> Result<()> {
    let claim = &mut ctx.accounts.claim;
    let wager_round = &ctx.accounts.wager_round;

    // If claim already exists and is Claimed, reject
    if claim.state == ClaimState::Claimed {
        return Err(WagerError::ClaimAlreadyProcessed.into());
    }

    // Build leaf: domain-separated SHA-256 hash of (wager_round || winner || amount)
    let mut hasher = Sha256::new();
    hasher.update(b"winscore-wager-claim-v1");
    hasher.update(wager_round.key().as_ref());
    hasher.update(ctx.accounts.winner.key().as_ref());
    hasher.update(&amount.to_le_bytes());
    let leaf: [u8; 32] = hasher.finalize().into();

    // Verify Merkle proof using SHA-256 pair hashing
    let mut hash = leaf;
    for proof_element in proof.iter() {
        let mut pair_hasher = Sha256::new();
        if hash <= *proof_element {
            pair_hasher.update(&hash);
            pair_hasher.update(proof_element);
        } else {
            pair_hasher.update(proof_element);
            pair_hasher.update(&hash);
        };
        hash = pair_hasher.finalize().into();
    }

    require!(
        hash == wager_round.merkle_root,
        WagerError::InvalidMerkleProof
    );

    // Transfer award from vault to winner
    let seeds: &[&[&[u8]]] = &[&[
        WAGER_ROUND_SEED,
        &[wager_round.version],
        &wager_round.group_id,
        &wager_round.round_id,
        &[wager_round.bump],
    ]];
    let signer_seeds = seeds;

    let cpi_accounts = token::Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.winner_token_account.to_account_info(),
        authority: wager_round.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.key(),
        cpi_accounts,
    ).with_signer(signer_seeds);
    token::transfer(cpi_ctx, amount)?;

    // Mark claim as processed
    claim.wager_round = wager_round.key();
    claim.winner = ctx.accounts.winner.key();
    claim.amount = amount;
    claim.state = ClaimState::Claimed;
    claim.bump = ctx.bumps.claim;

    Ok(())
}
