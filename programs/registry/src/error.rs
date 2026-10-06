// programs/registry/src/error.rs
use anchor_lang::prelude::*;

#[error_code]
pub enum RegistryError {
    #[msg("Unauthorized: caller is not the governance authority")]
    Unauthorized,

    #[msg("Adapter already registered")]
    AlreadyRegistered,

    #[msg("Adapter not found in registry")]
    AdapterNotFound,

    #[msg("Adapter is already active")]
    AlreadyActive,

    #[msg("Adapter is already deactivated")]
    AlreadyDeactivated,

    #[msg("Timelock not elapsed — cannot execute yet")]
    TimelockNotElapsed,

    #[msg("Proposal already executed")]
    AlreadyExecuted,

    #[msg("Name too long (max 64 bytes)")]
    NameTooLong,

    #[msg("Protocol identifier too long (max 32 bytes)")]
    ProtocolTooLong,

    #[msg("Metadata URI too long (max 128 bytes)")]
    MetadataUriTooLong,

    #[msg("Risk score must be 0–100")]
    InvalidRiskScore,

    #[msg("APY basis points out of range")]
    InvalidApyBps,
}
