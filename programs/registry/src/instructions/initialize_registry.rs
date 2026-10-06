// programs/registry/src/instructions/initialize_registry.rs
use anchor_lang::prelude::*;
use crate::state::RegistryConfig;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct InitializeRegistryParams {
    pub timelock_delay: i64,
}

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(
        init,
        payer = governance,
        space = RegistryConfig::LEN,
        seeds = [RegistryConfig::SEEDS],
        bump
    )]
    pub config: Account<'info, RegistryConfig>,

    #[account(mut)]
    pub governance: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeRegistry>, params: InitializeRegistryParams) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.governance = ctx.accounts.governance.key();
    config.pending_governance = None;
    config.timelock_delay = params.timelock_delay;
    config.adapter_count = 0;
    config.active_count = 0;
    config.version = 1;
    config.bump = ctx.bumps.config;
    config._reserved = [0u8; 64];

    msg!("Dnipro Registry initialized. Governance: {}", config.governance);
    Ok(())
}
