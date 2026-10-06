// programs/dispatcher/src/state.rs
use anchor_lang::prelude::*;

/// Global dispatcher configuration — one per deployment.
/// PDA: ["dispatcher_config"]
#[account]
#[derive(Debug)]
pub struct DispatcherConfig {
    /// Admin authority (multisig in production)
    pub admin: Pubkey,
    /// Registry program used for adapter validation
    pub registry_program: Pubkey,
    /// Protocol fee in basis points (e.g. 30 = 0.3%)
    pub fee_bps: u16,
    /// Fee recipient token account
    pub fee_recipient: Pubkey,
    /// Paused flag — halts all user-facing instructions
    pub paused: bool,
    /// Total lifetime deposits tracked (lamports equivalent)
    pub total_deposits_usd: u64,
    /// Total lifetime withdrawals tracked
    pub total_withdrawals_usd: u64,
    /// Total active positions across all users
    pub active_positions: u64,
    /// Config version for upgrades
    pub version: u8,
    /// Bump seed for PDA
    pub bump: u8,
    /// Reserved for future fields
    pub _reserved: [u8; 64],
}

impl DispatcherConfig {
    pub const LEN: usize = 8    // discriminator
        + 32   // admin
        + 32   // registry_program
        + 2    // fee_bps
        + 32   // fee_recipient
        + 1    // paused
        + 8    // total_deposits_usd
        + 8    // total_withdrawals_usd
        + 8    // active_positions
        + 1    // version
        + 1    // bump
        + 64;  // reserved

    pub const SEEDS: &'static [u8] = b"dispatcher_config";
}

/// Per-user, per-adapter position account.
/// Tracks shares/tokens deposited through Dnipro for a given adapter.
/// PDA: ["position", user, adapter_program_id]
#[account]
#[derive(Debug)]
pub struct Position {
    /// User who owns this position
    pub owner: Pubkey,
    /// The adapter program this position corresponds to
    pub adapter_program_id: Pubkey,
    /// The underlying mint (e.g. USDC)
    pub underlying_mint: Pubkey,
    /// Underlying tokens deposited (principal)
    pub deposited_amount: u64,
    /// Adapter-specific shares/receipt token balance
    pub shares: u64,
    /// Cumulative fees paid to the protocol
    pub fees_paid: u64,
    /// Unix timestamp of first deposit
    pub opened_at: i64,
    /// Unix timestamp of last interaction
    pub last_updated_at: i64,
    /// Position is still active
    pub is_active: bool,
    /// Bump seed
    pub bump: u8,
    /// Reserved
    pub _reserved: [u8; 32],
}

impl Position {
    pub const LEN: usize = 8   // discriminator
        + 32   // owner
        + 32   // adapter_program_id
        + 32   // underlying_mint
        + 8    // deposited_amount
        + 8    // shares
        + 8    // fees_paid
        + 8    // opened_at
        + 8    // last_updated_at
        + 1    // is_active
        + 1    // bump
        + 32;  // reserved

    pub const SEEDS: &'static [u8] = b"position";
}
