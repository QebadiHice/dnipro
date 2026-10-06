// programs/dispatcher/src/instructions/initialize.rs
use anchor_lang::prelude::*;
use crate::state::DispatcherConfig;
use crate::error::DispatcherError;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct InitializeParams {
    pub registry_program: Pubkey,
    pub fee_bps: u16,
    pub fee_recipient: Pubkey,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = DispatcherConfig::LEN,
        seeds = [DispatcherConfig::SEEDS],
        bump
    )]
    pub config: Account<'info, DispatcherConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
    require!(params.fee_bps <= 1000, DispatcherError::InvalidFeeBps);

    let config = &mut ctx.accounts.config;
    let bump = ctx.bumps.config;

    config.admin = ctx.accounts.admin.key();
    config.registry_program = params.registry_program;
    config.fee_bps = params.fee_bps;
    config.fee_recipient = params.fee_recipient;
    config.paused = false;
    config.total_deposits_usd = 0;
    config.total_withdrawals_usd = 0;
    config.active_positions = 0;
    config.version = 1;
    config.bump = bump;
    config._reserved = [0u8; 64];

    msg!(
        "Dnipro Dispatcher initialized. Admin: {}, Fee: {} bps",
        config.admin,
        config.fee_bps
    );

    Ok(())
}
