// programs/dispatcher/src/instructions/deposit.rs
//
// The deposit instruction:
// Reference routing flow:
// 1. Checks dispatcher pause/amount constraints
// 2. Deducts the configured protocol fee
// 3. Attempts CPI into the supplied adapter program
// 4. Records reference position state
// 5. Emits DepositEvent
//
// IMPORTANT: registry membership/status is not yet enforced in this instruction.
// Production routing must validate the adapter record and account set before CPI.

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{DispatcherConfig, Position};
use crate::error::DispatcherError;
use crate::events::DepositEvent;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct DepositParams {
    /// Amount of underlying tokens to deposit (before fee)
    pub amount: u64,
    /// Minimum shares to receive (slippage protection)
    pub min_shares_out: u64,
}

#[derive(Accounts)]
#[instruction(params: DepositParams)]
pub struct Deposit<'info> {
    // ── Dispatcher global state ──────────────────────────────────────────────
    #[account(
        seeds = [DispatcherConfig::SEEDS],
        bump = config.bump,
    )]
    pub config: Account<'info, DispatcherConfig>,

    // ── User position (init_if_needed so first deposit creates it) ───────────
    #[account(
        init_if_needed,
        payer = user,
        space = Position::LEN,
        seeds = [
            Position::SEEDS,
            user.key().as_ref(),
            adapter_program.key().as_ref(),
        ],
        bump
    )]
    pub position: Account<'info, Position>,

    // ── User accounts ────────────────────────────────────────────────────────
    #[account(mut)]
    pub user: Signer<'info>,

    /// User's source token account (underlying)
    #[account(
        mut,
        associated_token::mint = underlying_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    // ── Fee collection ───────────────────────────────────────────────────────
    /// Fee recipient token account (must match config)
    #[account(
        mut,
        token::mint = underlying_mint,
        constraint = fee_recipient_account.key() == config.fee_recipient
            @ DispatcherError::Unauthorized,
    )]
    pub fee_recipient_account: Account<'info, TokenAccount>,

    // ── Adapter vault (the adapter's managed token account) ──────────────────
    /// CHECK: validated by the adapter program during CPI
    #[account(mut)]
    pub adapter_vault: UncheckedAccount<'info>,

    // ── Mints ────────────────────────────────────────────────────────────────
    pub underlying_mint: Account<'info, Mint>,

    // ── Programs ─────────────────────────────────────────────────────────────
    /// CHECK: supplied adapter program. Registry validation is a required production TODO.
    pub adapter_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Deposit>, params: DepositParams) -> Result<()> {
    let config = &ctx.accounts.config;

    // ── Guard checks ─────────────────────────────────────────────────────────
    require!(!config.paused, DispatcherError::Paused);
    require!(params.amount > 0, DispatcherError::ZeroAmount);

    // ── Calculate fee ────────────────────────────────────────────────────────
    // fee = amount * fee_bps / 10_000
    let fee_amount = (params.amount as u128)
        .checked_mul(config.fee_bps as u128)
        .ok_or(DispatcherError::Overflow)?
        .checked_div(10_000)
        .ok_or(DispatcherError::Overflow)? as u64;

    let deposit_amount = params.amount
        .checked_sub(fee_amount)
        .ok_or(DispatcherError::Overflow)?;

    // ── Transfer fee to protocol fee recipient ───────────────────────────────
    if fee_amount > 0 {
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.fee_recipient_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            fee_amount,
        )?;
    }

    // ── CPI into adapter: adapter_deposit(amount, min_shares_out) ────────────
    // Reference interface call. Production integration must pass the complete,
    // protocol-specific account set and validate the adapter through Registry first.
    let ix_discriminator: [u8; 8] = {
        use std::io::Write;
        let mut hasher = crate::instructions::deposit::Sha256Hasher::new();
        hasher.update(b"global:adapter_deposit");
        let mut out = [0u8; 8];
        out.copy_from_slice(&hasher.finalize()[..8]);
        out
    };

    let mut ix_data = ix_discriminator.to_vec();
    ix_data.extend_from_slice(&deposit_amount.to_le_bytes());
    ix_data.extend_from_slice(&params.min_shares_out.to_le_bytes());

    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.adapter_program.key(),
        accounts: vec![
            anchor_lang::solana_program::instruction::AccountMeta::new(
                ctx.accounts.user_token_account.key(), false,
            ),
            anchor_lang::solana_program::instruction::AccountMeta::new(
                ctx.accounts.adapter_vault.key(), false,
            ),
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                ctx.accounts.user.key(), true,
            ),
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                ctx.accounts.underlying_mint.key(), false,
            ),
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                ctx.accounts.token_program.key(), false,
            ),
        ],
        data: ix_data,
    };

    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.user_token_account.to_account_info(),
            ctx.accounts.adapter_vault.to_account_info(),
            ctx.accounts.user.to_account_info(),
            ctx.accounts.underlying_mint.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.adapter_program.to_account_info(),
        ],
    ).map_err(|_| error!(DispatcherError::AdapterCpiError))?;

    // ── Update position ──────────────────────────────────────────────────────
    let position = &mut ctx.accounts.position;
    let clock = Clock::get()?;

    if !position.is_active {
        // First deposit — initialize position
        position.owner = ctx.accounts.user.key();
        position.adapter_program_id = ctx.accounts.adapter_program.key();
        position.underlying_mint = ctx.accounts.underlying_mint.key();
        position.opened_at = clock.unix_timestamp;
        position.is_active = true;
        position.bump = ctx.bumps.position;
        position._reserved = [0u8; 32];
    }

    position.deposited_amount = position.deposited_amount
        .checked_add(deposit_amount)
        .ok_or(DispatcherError::Overflow)?;
    position.fees_paid = position.fees_paid
        .checked_add(fee_amount)
        .ok_or(DispatcherError::Overflow)?;
    position.last_updated_at = clock.unix_timestamp;

    // ── Update global stats ──────────────────────────────────────────────────
    // (Using deposited_amount as USD proxy for USDC-based adapters)
    let config = &mut ctx.accounts.config;
    config.total_deposits_usd = config.total_deposits_usd
        .saturating_add(deposit_amount);

    // ── Emit event ───────────────────────────────────────────────────────────
    emit!(DepositEvent {
        user: ctx.accounts.user.key(),
        adapter_program_id: ctx.accounts.adapter_program.key(),
        underlying_mint: ctx.accounts.underlying_mint.key(),
        amount: deposit_amount,
        shares_received: 0, // populated by adapter CPI return in production
        fee_paid: fee_amount,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Deposit: user={} adapter={} amount={} fee={}",
        ctx.accounts.user.key(),
        ctx.accounts.adapter_program.key(),
        deposit_amount,
        fee_amount,
    );

    Ok(())
}

/// Minimal SHA-256 hasher for anchor discriminator calculation.
/// In production, use the sha2 crate.
struct Sha256Hasher {
    data: Vec<u8>,
}

impl Sha256Hasher {
    fn new() -> Self { Self { data: Vec::new() } }
    fn update(&mut self, bytes: &[u8]) { self.data.extend_from_slice(bytes); }
    fn finalize(self) -> [u8; 32] {
        use anchor_lang::solana_program::hash::hash;
        hash(&self.data).to_bytes()
    }
}
