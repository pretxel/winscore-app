use anchor_lang::prelude::*;

#[error_code]
pub enum WagerError {
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Round is not in initialized state")]
    NotInitialized,
    #[msg("Round is not locked")]
    NotLocked,
    #[msg("Round is already settled")]
    AlreadySettled,
    #[msg("Round is not settled")]
    NotSettled,
    #[msg("Round is cancelled")]
    RoundCancelled,
    #[msg("Entry period has closed")]
    EntryClosed,
    #[msg("Participant limit reached")]
    ParticipantLimitReached,
    #[msg("Stake total limit reached")]
    StakeTotalLimitReached,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Invalid token program")]
    InvalidTokenProgram,
    #[msg("Invalid decimals")]
    InvalidDecimals,
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,
    #[msg("Invalid Merkle proof")]
    InvalidMerkleProof,
    #[msg("Claim already processed")]
    ClaimAlreadyProcessed,
    #[msg("Entry already settled")]
    EntryAlreadySettled,
    #[msg("Entry already refunded")]
    EntryAlreadyRefunded,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Close can only reduce pre-settlement close")]
    CloseExtensionForbidden,
    #[msg("Deposits must equal claims plus refunds plus liability")]
    ConservationViolation,
    #[msg("Total distributable must equal pot total")]
    DistributableMismatch,
    #[msg("Vault has outstanding balance")]
    VaultNotEmpty,
    #[msg("Duplicate entry")]
    DuplicateEntry,
    #[msg("Settlement already recorded")]
    SettlementAlreadyRecorded,
    #[msg("Not eligible for refund")]
    NotRefundable,
    #[msg("Round must be cancelled or timed out for refund")]
    RefundNotAvailable,
}
