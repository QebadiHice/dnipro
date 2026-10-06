// programs/registry/src/events.rs
use anchor_lang::prelude::*;

#[event]
pub struct AdapterRegisteredEvent {
    pub program_id: Pubkey,
    pub name: String,
    pub protocol: String,
    pub underlying_mint: Pubkey,
    pub registered_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AdapterStatusChangedEvent {
    pub program_id: Pubkey,
    pub is_active: bool,
    pub changed_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AdapterMetadataUpdatedEvent {
    pub program_id: Pubkey,
    pub apy_bps: u32,
    pub tvl: u64,
    pub timestamp: i64,
}

#[event]
pub struct GovernanceProposedEvent {
    pub proposal_id: u64,
    pub proposer: Pubkey,
    pub executable_after: i64,
    pub timestamp: i64,
}

#[event]
pub struct GovernanceExecutedEvent {
    pub proposal_id: u64,
    pub executor: Pubkey,
    pub timestamp: i64,
}
