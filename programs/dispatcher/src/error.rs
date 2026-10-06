// programs/dispatcher/src/error.rs
use anchor_lang::prelude::*;

#[error_code]
pub enum DispatcherError {
    #[msg("Dispatcher is paused by admin")]
    Paused,

    #[msg("Amount must be greater than zero")]
    ZeroAmount,

    #[msg("Adapter is not active in the registry")]
    AdapterNotActive,

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    #[msg("Unauthorized: caller is not the admin")]
    Unauthorized,

    #[msg("Position not found for this user and adapter")]
    PositionNotFound,

    #[msg("Insufficient balance in position")]
    InsufficientBalance,

    #[msg("Adapter CPI call returned an error")]
    AdapterCpiError,

    #[msg("Arithmetic overflow")]
    Overflow,

    #[msg("Invalid mint: does not match adapter expected mint")]
    InvalidMint,

    #[msg("Max positions reached for this user")]
    MaxPositionsReached,

    #[msg("Fee basis points out of range (max 1000 = 10%)")]
    InvalidFeeBps,
}
