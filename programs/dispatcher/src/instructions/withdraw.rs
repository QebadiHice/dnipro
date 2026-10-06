// programs/dispatcher/src/instructions/withdraw.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{DispatcherConfig, Position};
use crate::error::DispatcherError;
use crate::events::WithdrawEvent;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct WithdrawParams {
    /// Shares to redeem (0 = withdraw all)
    pub shares: u64,
    /// Minimum underlying tokens to receive
    pub min_amount_out: u64,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [DispatcherConfig::SEEDS],
        bump = config.bump,
    )]
    pub config: Account<'info, DispatcherConfig>,

    #[account(
        mut,
        seeds = [
            Position::SEEDS,
            user.key().as_ref(),
            adapter_program.key().as_ref(),
        ],
        bump = position.bump,
        constraint = position.owner == user.key() @ DispatcherError::Unauthorized,
        constraint = position.is_active @ DispatcherError::PositionNotFound,
    )]
    pub position: Account<'info, Position>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = underlying_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = underlying_mint,
        constraint = fee_recipient_account.key() == config.fee_recipient
            @ DispatcherError::Unauthorized,
    )]
    pub fee_recipient_account: Account<'info, TokenAccount>,

    /// CHECK: validated by adapter during CPI
    #[account(mut)]
    pub adapter_vault: UncheckedAccount<'info>,

    pub underlying_mint: Account<'info, Mint>,

    /// CHECK: supplied adapter program. Registry validation is a required production TODO.
    pub adapter_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Withdraw>, params: WithdrawParams) -> Result<()> {
    let config = &ctx.accounts.config;
    require!(!config.paused, DispatcherError::Paused);

    let position = &ctx.accounts.position;
    let shares_to_redeem = if params.shares == 0 {
        position.shares
    } else {
        params.shares
    };

    require!(shares_to_redeem > 0, DispatcherError::ZeroAmount);
    require!(
        shares_to_redeem <= position.shares,
        DispatcherError::InsufficientBalance
    );

    // ── CPI into adapter: adapter_withdraw(shares, min_amount_out) ───────────
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.adapter_program.key(),
        accounts: vec![
            anchor_lang::solana_program::instruction::AccountMeta::new(
                ctx.accounts.adapter_vault.key(), false,
            ),
            anchor_lang::solana_program::instruction::AccountMeta::new(
                ctx.accounts.user_token_account.key(), false,
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
        data: {
            let mut d = anchor_lang::solana_program::hash::hash(b"global:adapter_withdraw")
                .to_bytes()[..8].to_vec();
            d.extend_from_slice(&shares_to_redeem.to_le_bytes());
            d.extend_from_slice(&params.min_amount_out.to_le_bytes());
            d
        },
    };

    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.adapter_vault.to_account_info(),
            ctx.accounts.user_token_account.to_account_info(),
            ctx.accounts.user.to_account_info(),
            ctx.accounts.underlying_mint.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.adapter_program.to_account_info(),
        ],
    ).map_err(|_| error!(DispatcherError::AdapterCpiError))?;

    // ── Compute fee on the received amount ───────────────────────────────────
    // Simplified: fee on the original pro-rata deposited amount
    let pro_rata_deposit = if position.shares > 0 {
        (position.deposited_amount as u128)
            .checked_mul(shares_to_redeem as u128)
            .ok_or(DispatcherError::Overflow)?
            .checked_div(position.shares as u128)
            .ok_or(DispatcherError::Overflow)? as u64
    } else {
        0
    };

    let fee_amount = (pro_rata_deposit as u128)
        .checked_mul(config.fee_bps as u128)
        .ok_or(DispatcherError::Overflow)?
        .checked_div(10_000)
        .ok_or(DispatcherError::Overflow)? as u64;

    // Collect withdrawal fee
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

    // ── Update position ──────────────────────────────────────────────────────
    let position = &mut ctx.accounts.position;
    let clock = Clock::get()?;

    position.shares = position.shares
        .checked_sub(shares_to_redeem)
        .ok_or(DispatcherError::Overflow)?;
    position.deposited_amount = position.deposited_amount
        .saturating_sub(pro_rata_deposit);
    position.fees_paid = position.fees_paid
        .checked_add(fee_amount)
        .ok_or(DispatcherError::Overflow)?;
    position.last_updated_at = clock.unix_timestamp;

    if position.shares == 0 {
        position.is_active = false;
    }

    // ── Update global stats ──────────────────────────────────────────────────
    let config = &mut ctx.accounts.config;
    config.total_withdrawals_usd = config.total_withdrawals_usd
        .saturating_add(pro_rata_deposit);

    emit!(WithdrawEvent {
        user: ctx.accounts.user.key(),
        adapter_program_id: ctx.accounts.adapter_program.key(),
        underlying_mint: ctx.accounts.underlying_mint.key(),
        shares_burned: shares_to_redeem,
        amount_received: pro_rata_deposit.saturating_sub(fee_amount),
        fee_paid: fee_amount,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Withdraw: user={} shares={} fee={}",
        ctx.accounts.user.key(),
        shares_to_redeem,
        fee_amount,
    );

    Ok(())
}
