// programs/registry/src/instructions/register_adapter.rs
use anchor_lang::prelude::*;
use crate::state::{RegistryConfig, AdapterRecord, AdapterCategory};
use crate::error::RegistryError;
use crate::events::AdapterRegisteredEvent;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct RegisterAdapterParams {
    pub program_id: Pubkey,
    pub name: String,
    pub protocol: String,
    pub underlying_mint: Pubkey,
    pub category: AdapterCategory,
    pub apy_bps: u32,
    pub max_deposit: u64,
    pub min_deposit: u64,
    pub metadata_uri: String,
    pub risk_score: u8,
}

#[derive(Accounts)]
#[instruction(params: RegisterAdapterParams)]
pub struct RegisterAdapter<'info> {
    #[account(
        mut,
        seeds = [RegistryConfig::SEEDS],
        bump = config.bump,
        constraint = config.governance == governance.key() @ RegistryError::Unauthorized,
    )]
    pub config: Account<'info, RegistryConfig>,

    #[account(
        init,
        payer = governance,
        space = AdapterRecord::LEN,
        seeds = [AdapterRecord::SEEDS, params.program_id.as_ref()],
        bump
    )]
    pub adapter: Account<'info, AdapterRecord>,

    #[account(mut)]
    pub governance: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterAdapter>, params: RegisterAdapterParams) -> Result<()> {
    require!(params.name.len() <= 64, RegistryError::NameTooLong);
    require!(params.protocol.len() <= 32, RegistryError::ProtocolTooLong);
    require!(params.metadata_uri.len() <= 128, RegistryError::MetadataUriTooLong);
    require!(params.risk_score <= 100, RegistryError::InvalidRiskScore);

    let adapter = &mut ctx.accounts.adapter;
    let clock = Clock::get()?;

    adapter.program_id = params.program_id;

    // Copy name bytes
    let name_bytes = params.name.as_bytes();
    adapter.name = [0u8; 64];
    adapter.name[..name_bytes.len()].copy_from_slice(name_bytes);

    // Copy protocol bytes
    let proto_bytes = params.protocol.as_bytes();
    adapter.protocol = [0u8; 32];
    adapter.protocol[..proto_bytes.len()].copy_from_slice(proto_bytes);

    adapter.underlying_mint = params.underlying_mint;
    adapter.category = params.category;
    adapter.apy_bps = params.apy_bps;
    adapter.tvl = 0;
    adapter.is_active = true;
    adapter.deposits_paused = false;
    adapter.max_deposit = params.max_deposit;
    adapter.min_deposit = params.min_deposit;
    adapter.registered_at = clock.unix_timestamp;
    adapter.updated_at = clock.unix_timestamp;
    adapter.registered_by = ctx.accounts.governance.key();
    adapter.risk_score = params.risk_score;
    adapter.bump = ctx.bumps.adapter;
    adapter._reserved = [0u8; 32];

    // Copy metadata URI
    let uri_bytes = params.metadata_uri.as_bytes();
    adapter.metadata_uri = [0u8; 128];
    adapter.metadata_uri[..uri_bytes.len()].copy_from_slice(uri_bytes);

    // Update global counts
    let config = &mut ctx.accounts.config;
    config.adapter_count = config.adapter_count.saturating_add(1);
    config.active_count = config.active_count.saturating_add(1);

    emit!(AdapterRegisteredEvent {
        program_id: params.program_id,
        name: params.name,
        protocol: params.protocol,
        underlying_mint: params.underlying_mint,
        registered_by: ctx.accounts.governance.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("Adapter registered: {} ({})", adapter.name_str(), params.program_id);
    Ok(())
}
