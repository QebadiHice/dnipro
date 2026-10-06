// programs/dispatcher/src/lib.rs
// Dnipro Universal Yield Adapter Standard — Dispatcher Program
// Routes deposit/withdraw calls to registered protocol adapters.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

pub mod error;
pub mod state;
pub mod instructions;
pub mod events;

use instructions::*;

declare_id!("9pBagrmLndcGR6fGBwaEqtuEb5qp1EipDX3mHh7VGJLQ");

#[program]
pub mod dispatcher {
    use super::*;

    /// Initialize the global dispatcher state (admin only, called once).
    pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
        instructions::initialize::handler(ctx, params)
    }

    /// Deposit tokens into a yield-bearing adapter via the dispatcher.
    /// Emits DepositEvent on success.
    pub fn deposit(ctx: Context<Deposit>, params: DepositParams) -> Result<()> {
        instructions::deposit::handler(ctx, params)
    }

    /// Withdraw tokens from a yield-bearing adapter via the dispatcher.
    /// Emits WithdrawEvent on success.
    pub fn withdraw(ctx: Context<Withdraw>, params: WithdrawParams) -> Result<()> {
        instructions::withdraw::handler(ctx, params)
    }

    /// Query the current USD value of a position (view-only, no state mutation).
    pub fn current_value(ctx: Context<CurrentValue>, params: CurrentValueParams) -> Result<u64> {
        instructions::current_value::handler(ctx, params)
    }

    /// Update dispatcher configuration (admin gated).
    pub fn update_config(ctx: Context<UpdateConfig>, params: UpdateConfigParams) -> Result<()> {
        instructions::update_config::handler(ctx, params)
    }

    /// Emergency pause — halts all deposit/withdraw routing.
    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        instructions::set_paused::handler(ctx, paused)
    }

    /// Transfer admin authority to a new address.
    pub fn transfer_admin(ctx: Context<TransferAdmin>, new_admin: Pubkey) -> Result<()> {
        instructions::transfer_admin::handler(ctx, new_admin)
    }
}
