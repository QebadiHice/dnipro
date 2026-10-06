// programs/dispatcher/src/instructions/current_value.rs
// Reference current-value interface. The current build returns deposited principal;
// production should invoke the adapter and consume verified return data.

use anchor_lang::prelude::*;
use crate::state::{DispatcherConfig, Position};
use crate::error::DispatcherError;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct CurrentValueParams {
    pub adapter_program_id: Pubkey,
}

#[derive(Accounts)]
pub struct CurrentValue<'info> {
    #[account(
        seeds = [DispatcherConfig::SEEDS],
        bump = config.bump,
    )]
    pub config: Account<'info, DispatcherConfig>,

    #[account(
        seeds = [
            Position::SEEDS,
            user.key().as_ref(),
            adapter_program.key().as_ref(),
        ],
        bump = position.bump,
        constraint = position.owner == user.key() @ DispatcherError::Unauthorized,
    )]
    pub position: Account<'info, Position>,

    pub user: Signer<'info>,

    /// CHECK: the adapter program
    pub adapter_program: UncheckedAccount<'info>,

    /// CHECK: adapter's vault / state account for price calculation
    pub adapter_state: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<CurrentValue>, _params: CurrentValueParams) -> Result<u64> {
    let position = &ctx.accounts.position;

    if !position.is_active || position.shares == 0 {
        return Ok(0);
    }

    // Construct the intended adapter_current_value(shares) call shape.
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.adapter_program.key(),
        accounts: vec![
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                ctx.accounts.adapter_state.key(), false,
            ),
        ],
        data: {
            let mut d = anchor_lang::solana_program::hash::hash(b"global:adapter_current_value")
                .to_bytes()[..8].to_vec();
            d.extend_from_slice(&position.shares.to_le_bytes());
            d
        },
    };

    // In a real deployment this would use invoke_signed and parse return data.
    // For the interface definition, we return the deposited_amount as a safe baseline.
    let _ = ix; // suppress unused warning in interface

    msg!(
        "CurrentValue: user={} adapter={} shares={} deposited={}",
        ctx.accounts.user.key(),
        ctx.accounts.adapter_program.key(),
        position.shares,
        position.deposited_amount,
    );

    // Return deposited amount as lower-bound value
    Ok(position.deposited_amount)
}
