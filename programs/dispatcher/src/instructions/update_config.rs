// programs/dispatcher/src/instructions/update_config.rs
use anchor_lang::prelude::*;
use crate::state::DispatcherConfig;
use crate::error::DispatcherError;
use crate::events::ConfigUpdatedEvent;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct UpdateConfigParams {
    pub fee_bps: Option<u16>,
    pub fee_recipient: Option<Pubkey>,
    pub registry_program: Option<Pubkey>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [DispatcherConfig::SEEDS],
        bump = config.bump,
        constraint = config.admin == admin.key() @ DispatcherError::Unauthorized,
    )]
    pub config: Account<'info, DispatcherConfig>,
    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateConfig>, params: UpdateConfigParams) -> Result<()> {
    let config = &mut ctx.accounts.config;

    if let Some(fee_bps) = params.fee_bps {
        require!(fee_bps <= 1000, DispatcherError::InvalidFeeBps);
        config.fee_bps = fee_bps;
    }
    if let Some(fee_recipient) = params.fee_recipient {
        config.fee_recipient = fee_recipient;
    }
    if let Some(registry_program) = params.registry_program {
        config.registry_program = registry_program;
    }

    let clock = Clock::get()?;
    emit!(ConfigUpdatedEvent {
        admin: ctx.accounts.admin.key(),
        fee_bps: config.fee_bps,
        paused: config.paused,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
