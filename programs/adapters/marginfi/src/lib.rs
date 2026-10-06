// programs/adapters/marginfi/src/lib.rs
// Dnipro Adapter: MarginFi USDC Lending
// REFERENCE IMPLEMENTATION:
// This module models the Dnipro adapter interface. It must not be treated as a
// live integration until the underlying protocol CPI/accounts are implemented,
// tested on the target cluster, and the deployed program address is verified.
//
//
// MarginFi is a margin trading and lending protocol on Solana.
// Deposits earn yield through lending to leveraged traders.
// MarginFi uses "bank" accounts to track deposits and borrows.

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};

declare_id!("7s7FUYn9h5gtjaUpMjDTuaAEcNH9Zm2g6JYaJ9gY76SP");

/// MarginFi v2 program ID (mainnet)
pub const MARGINFI_PROGRAM_ID: &str = "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA";

#[program]
pub mod marginfi_adapter {
    use super::*;

    pub fn adapter_deposit(ctx: Context<AdapterDeposit>, params: AdapterDepositParams) -> Result<u64> {
        require!(params.amount > 0, AdapterError::ZeroAmount);

        let state = &ctx.accounts.adapter_state;
        require!(!state.deposits_paused, AdapterError::DepositsPaused);

        // MarginFi: deposit USDC, receive mfUSDC (tracked internally)
        // Shares are calculated by the lending rate
        let shares = marginfi_compute_shares(params.amount, state.asset_share_value)?;
        require!(shares >= params.min_shares_out, AdapterError::SlippageExceeded);

        // Transfer to MarginFi bank vault
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.bank_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            params.amount,
        )?;

        // Update adapter state
        let state = &mut ctx.accounts.adapter_state;
        state.total_asset_shares = state.total_asset_shares.saturating_add(shares);
        state.last_accrual_timestamp = Clock::get()?.unix_timestamp;

        emit!(MarginFiDepositEvent {
            user: ctx.accounts.user.key(),
            amount: params.amount,
            shares_minted: shares,
            asset_share_value: state.asset_share_value,
            timestamp: state.last_accrual_timestamp,
        });

        Ok(shares)
    }

    pub fn adapter_withdraw(ctx: Context<AdapterWithdraw>, params: AdapterWithdrawParams) -> Result<u64> {
        require!(params.shares > 0, AdapterError::ZeroAmount);

        let state = &ctx.accounts.adapter_state;
        let amount = marginfi_compute_amount(params.shares, state.asset_share_value)?;
        require!(amount >= params.min_amount_out, AdapterError::SlippageExceeded);

        // Transfer from bank vault to user
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.bank_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.bank_vault_authority.to_account_info(),
                },
                &[&[b"bank_vault_authority", &[state.vault_auth_bump]]],
            ),
            amount,
        )?;

        let state = &mut ctx.accounts.adapter_state;
        state.total_asset_shares = state.total_asset_shares.saturating_sub(params.shares);
        state.last_accrual_timestamp = Clock::get()?.unix_timestamp;

        emit!(MarginFiWithdrawEvent {
            user: ctx.accounts.user.key(),
            shares_burned: params.shares,
            amount,
            asset_share_value: state.asset_share_value,
            timestamp: state.last_accrual_timestamp,
        });

        Ok(amount)
    }

    pub fn adapter_current_value(ctx: Context<AdapterCurrentValue>, shares: u64) -> Result<u64> {
        let state = &ctx.accounts.adapter_state;
        // Accrue interest virtually before computing value
        let accrued_share_value = accrue_interest(
            state.asset_share_value,
            state.interest_rate_bps,
            state.last_accrual_timestamp,
            Clock::get()?.unix_timestamp,
        )?;
        marginfi_compute_amount(shares, accrued_share_value)
    }

    pub fn initialize(ctx: Context<InitializeMarginFi>, params: InitParams) -> Result<()> {
        let state = &mut ctx.accounts.adapter_state;
        state.admin = ctx.accounts.admin.key();
        state.underlying_mint = ctx.accounts.underlying_mint.key();
        state.bank_vault = ctx.accounts.bank_vault.key();
        state.asset_share_value = 1_000_000; // 1e6 precision
        state.total_asset_shares = 0;
        state.interest_rate_bps = params.initial_interest_rate_bps;
        state.deposits_paused = false;
        state.last_accrual_timestamp = Clock::get()?.unix_timestamp;
        state.vault_auth_bump = ctx.bumps.bank_vault_authority;
        state.bump = ctx.bumps.adapter_state;
        Ok(())
    }

    pub fn accrue_interest_ix(ctx: Context<AccrueInterest>) -> Result<()> {
        let clock = Clock::get()?;
        let state = &mut ctx.accounts.adapter_state;
        state.asset_share_value = accrue_interest(
            state.asset_share_value,
            state.interest_rate_bps,
            state.last_accrual_timestamp,
            clock.unix_timestamp,
        )?;
        state.last_accrual_timestamp = clock.unix_timestamp;
        Ok(())
    }
}

/// MarginFi uses high-precision share values (1e6 base)
fn marginfi_compute_shares(amount: u64, asset_share_value: u64) -> Result<u64> {
    (amount as u128)
        .checked_mul(1_000_000)
        .ok_or(error!(AdapterError::Overflow))?
        .checked_div(asset_share_value as u128)
        .ok_or(error!(AdapterError::Overflow))
        .map(|v| v as u64)
}

fn marginfi_compute_amount(shares: u64, asset_share_value: u64) -> Result<u64> {
    (shares as u128)
        .checked_mul(asset_share_value as u128)
        .ok_or(error!(AdapterError::Overflow))?
        .checked_div(1_000_000)
        .ok_or(error!(AdapterError::Overflow))
        .map(|v| v as u64)
}

/// Simple compound interest: value * (1 + rate/10_000) ^ (elapsed_seconds / 31_536_000)
/// Approximated as: value * (1 + rate * seconds / (10_000 * 31_536_000))
fn accrue_interest(
    share_value: u64,
    rate_bps: u32,
    last_timestamp: i64,
    now: i64,
) -> Result<u64> {
    let elapsed = (now - last_timestamp).max(0) as u128;
    let rate_per_second = (rate_bps as u128) * 1_000_000 / (10_000 * 31_536_000);
    let accrued = (share_value as u128)
        .checked_mul(rate_per_second * elapsed)
        .ok_or(error!(AdapterError::Overflow))?
        .checked_div(1_000_000)
        .ok_or(error!(AdapterError::Overflow))?;
    Ok(share_value.saturating_add(accrued as u64))
}

#[account]
pub struct MarginFiAdapterState {
    pub admin: Pubkey,
    pub underlying_mint: Pubkey,
    pub bank_vault: Pubkey,
    /// Asset share value in 1e6 precision
    pub asset_share_value: u64,
    pub total_asset_shares: u64,
    /// Annual interest rate in bps
    pub interest_rate_bps: u32,
    pub deposits_paused: bool,
    pub last_accrual_timestamp: i64,
    pub vault_auth_bump: u8,
    pub bump: u8,
}

impl MarginFiAdapterState {
    pub const LEN: usize = 8 + 32*3 + 8 + 8 + 4 + 1 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AdapterDepositParams { pub amount: u64, pub min_shares_out: u64 }

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AdapterWithdrawParams { pub shares: u64, pub min_amount_out: u64 }

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitParams { pub initial_interest_rate_bps: u32 }

#[derive(Accounts)]
pub struct AdapterDeposit<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, MarginFiAdapterState>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub bank_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdapterWithdraw<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, MarginFiAdapterState>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub bank_vault: Account<'info, TokenAccount>,
    /// CHECK: PDA
    #[account(seeds = [b"bank_vault_authority"], bump)]
    pub bank_vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdapterCurrentValue<'info> {
    #[account(seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, MarginFiAdapterState>,
}

#[derive(Accounts)]
pub struct InitializeMarginFi<'info> {
    #[account(init, payer = admin, space = MarginFiAdapterState::LEN, seeds = [b"adapter_state"], bump)]
    pub adapter_state: Account<'info, MarginFiAdapterState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub underlying_mint: Account<'info, Mint>,
    pub bank_vault: Account<'info, TokenAccount>,
    /// CHECK: PDA
    #[account(seeds = [b"bank_vault_authority"], bump)]
    pub bank_vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AccrueInterest<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, MarginFiAdapterState>,
}

#[error_code]
pub enum AdapterError {
    #[msg("Zero amount")] ZeroAmount,
    #[msg("Slippage exceeded")] SlippageExceeded,
    #[msg("Deposits paused")] DepositsPaused,
    #[msg("Overflow")] Overflow,
    #[msg("Unauthorized")] Unauthorized,
}

#[event]
pub struct MarginFiDepositEvent {
    pub user: Pubkey, pub amount: u64, pub shares_minted: u64,
    pub asset_share_value: u64, pub timestamp: i64,
}
#[event]
pub struct MarginFiWithdrawEvent {
    pub user: Pubkey, pub shares_burned: u64, pub amount: u64,
    pub asset_share_value: u64, pub timestamp: i64,
}
