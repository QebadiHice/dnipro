// programs/registry/src/instructions/update_adapter.rs
use anchor_lang::prelude::*;
use crate::state::{RegistryConfig, AdapterRecord};
use crate::error::RegistryError;
use crate::events::AdapterMetadataUpdatedEvent;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct UpdateAdapterParams {
    pub apy_bps: Option<u32>,
    pub tvl: Option<u64>,
    pub max_deposit: Option<u64>,
    pub min_deposit: Option<u64>,
    pub metadata_uri: Option<String>,
    pub risk_score: Option<u8>,
    pub deposits_paused: Option<bool>,
}

#[derive(Accounts)]
pub struct UpdateAdapter<'info> {
    #[account(
        seeds = [RegistryConfig::SEEDS],
        bump = config.bump,
        constraint = config.governance == governance.key() @ RegistryError::Unauthorized,
    )]
    pub config: Account<'info, RegistryConfig>,

    #[account(mut, seeds = [AdapterRecord::SEEDS, adapter.program_id.as_ref()], bump = adapter.bump)]
    pub adapter: Account<'info, AdapterRecord>,

    pub governance: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateAdapter>, params: UpdateAdapterParams) -> Result<()> {
    let adapter = &mut ctx.accounts.adapter;
    let clock = Clock::get()?;

    if let Some(v) = params.apy_bps { adapter.apy_bps = v; }
    if let Some(v) = params.tvl { adapter.tvl = v; }
    if let Some(v) = params.max_deposit { adapter.max_deposit = v; }
    if let Some(v) = params.min_deposit { adapter.min_deposit = v; }
    if let Some(v) = params.deposits_paused { adapter.deposits_paused = v; }
    if let Some(v) = params.risk_score {
        require!(v <= 100, RegistryError::InvalidRiskScore);
        adapter.risk_score = v;
    }
    if let Some(uri) = params.metadata_uri {
        require!(uri.len() <= 128, RegistryError::MetadataUriTooLong);
        adapter.metadata_uri = [0u8; 128];
        adapter.metadata_uri[..uri.len()].copy_from_slice(uri.as_bytes());
    }

    adapter.updated_at = clock.unix_timestamp;

    emit!(AdapterMetadataUpdatedEvent {
        program_id: adapter.program_id,
        apy_bps: adapter.apy_bps,
        tvl: adapter.tvl,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
