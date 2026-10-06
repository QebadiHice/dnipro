// programs/dispatcher/src/instructions/set_paused.rs
use anchor_lang::prelude::*;
use crate::state::DispatcherConfig;
use crate::error::DispatcherError;
use crate::events::ConfigUpdatedEvent;

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(
        mut,
        seeds = [DispatcherConfig::SEEDS],
        bump = config.bump,
        constraint = config.admin == admin.key() @ DispatcherError::Unauthorized,
    )]
    pub config: Account<'info, DispatcherConfig>,
    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.paused = paused;

    let clock = Clock::get()?;
    emit!(ConfigUpdatedEvent {
        admin: ctx.accounts.admin.key(),
        fee_bps: config.fee_bps,
        paused,
        timestamp: clock.unix_timestamp,
    });

    msg!("Dispatcher paused={}", paused);
    Ok(())
}
