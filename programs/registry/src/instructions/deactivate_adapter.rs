// programs/registry/src/instructions/deactivate_adapter.rs
use anchor_lang::prelude::*;
use crate::state::{RegistryConfig, AdapterRecord};
use crate::error::RegistryError;
use crate::events::AdapterStatusChangedEvent;

#[derive(Accounts)]
pub struct DeactivateAdapter<'info> {
    #[account(mut, seeds = [RegistryConfig::SEEDS], bump = config.bump,
        constraint = config.governance == governance.key() @ RegistryError::Unauthorized)]
    pub config: Account<'info, RegistryConfig>,
    #[account(mut, seeds = [AdapterRecord::SEEDS, adapter.program_id.as_ref()], bump = adapter.bump)]
    pub adapter: Account<'info, AdapterRecord>,
    pub governance: Signer<'info>,
}

pub fn handler(ctx: Context<DeactivateAdapter>) -> Result<()> {
    require!(ctx.accounts.adapter.is_active, RegistryError::AlreadyDeactivated);
    ctx.accounts.adapter.is_active = false;
    ctx.accounts.config.active_count = ctx.accounts.config.active_count.saturating_sub(1);
    let clock = Clock::get()?;
    emit!(AdapterStatusChangedEvent {
        program_id: ctx.accounts.adapter.program_id,
        is_active: false,
        changed_by: ctx.accounts.governance.key(),
        timestamp: clock.unix_timestamp,
    });
    Ok(())
}
