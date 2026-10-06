// programs/dispatcher/src/events.rs
use anchor_lang::prelude::*;

#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub adapter_program_id: Pubkey,
    pub underlying_mint: Pubkey,
    pub amount: u64,
    pub shares_received: u64,
    pub fee_paid: u64,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub adapter_program_id: Pubkey,
    pub underlying_mint: Pubkey,
    pub shares_burned: u64,
    pub amount_received: u64,
    pub fee_paid: u64,
    pub timestamp: i64,
}

#[event]
pub struct ConfigUpdatedEvent {
    pub admin: Pubkey,
    pub fee_bps: u16,
    pub paused: bool,
    pub timestamp: i64,
}

#[event]
pub struct AdminTransferredEvent {
    pub old_admin: Pubkey,
    pub new_admin: Pubkey,
    pub timestamp: i64,
}
