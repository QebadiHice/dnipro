// programs/dispatcher/src/instructions/transfer_admin.rs
use anchor_lang::prelude::*;
use crate::state::DispatcherConfig;
use crate::error::DispatcherError;
use crate::events::AdminTransferredEvent;

#[derive(Accounts)]
pub struct TransferAdmin<'info> {
    #[account(
        mut,
        seeds = [DispatcherConfig::SEEDS],
        bump = config.bump,
        constraint = config.admin == admin.key() @ DispatcherError::Unauthorized,
    )]
    pub config: Account<'info, DispatcherConfig>,
    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<TransferAdmin>, new_admin: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let old_admin = config.admin;
    config.admin = new_admin;

    let clock = Clock::get()?;
    emit!(AdminTransferredEvent {
        old_admin,
        new_admin,
        timestamp: clock.unix_timestamp,
    });

    msg!("Admin transferred: {} → {}", old_admin, new_admin);
    Ok(())
}
