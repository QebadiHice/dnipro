// programs/adapters/kamino/src/lib.rs
// Dnipro Adapter: Kamino USDC Lending
// REFERENCE IMPLEMENTATION:
// This module models the Dnipro adapter interface. It must not be treated as a
// live integration until the underlying protocol CPI/accounts are implemented,
// tested on the target cluster, and the deployed program address is verified.
//
//
// Wraps Kamino's lending pool to expose the standard Dnipro adapter interface:
//   adapter_deposit(amount, min_shares_out)
//   adapter_withdraw(shares, min_amount_out)
//   adapter_current_value(shares) → u64
//
// Kamino issues kTokens (e.g. kUSDC) as yield-bearing receipts.
// Exchange rate: kTokens * collateral_exchange_rate = underlying

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("GENyHjfFyapa8AA8HaxLvZE9eZ3uMFca18d26RJJ9DxB");

/// Kamino lending market program ID (mainnet)
pub const KAMINO_PROGRAM_ID: &str = "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD";

/// USDC mint (mainnet)
pub const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

#[program]
pub mod kamino_adapter {
    use super::*;

    /// Deposit USDC into Kamino lending pool, receive kUSDC shares.
    pub fn adapter_deposit(ctx: Context<AdapterDeposit>, params: AdapterDepositParams) -> Result<u64> {
        require!(params.amount > 0, AdapterError::ZeroAmount);
        require!(
            params.amount >= ctx.accounts.adapter_state.min_deposit,
            AdapterError::BelowMinDeposit
        );

        let state = &mut ctx.accounts.adapter_state;
        require!(!state.deposits_paused, AdapterError::DepositsPaused);

        // Calculate shares to mint based on exchange rate
        // shares = amount * SHARE_SCALE / exchange_rate
        let shares = compute_shares(params.amount, state.exchange_rate_bps)?;
        require!(shares >= params.min_shares_out, AdapterError::SlippageExceeded);

        // Transfer USDC from user to vault
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            params.amount,
        )?;

        // Mint kUSDC shares to user's share account
        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.share_mint.to_account_info(),
                    to: ctx.accounts.user_share_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[&[b"vault_authority", &[ctx.accounts.adapter_state.vault_auth_bump]]],
            ),
            shares,
        )?;

        // Update state
        state.total_deposits = state.total_deposits.saturating_add(params.amount);
        state.total_shares = state.total_shares.saturating_add(shares);
        state.last_updated = Clock::get()?.unix_timestamp;

        emit!(DepositEvent {
            user: ctx.accounts.user.key(),
            amount: params.amount,
            shares,
            exchange_rate: state.exchange_rate_bps,
            timestamp: state.last_updated,
        });

        msg!("Kamino deposit: {} USDC → {} kUSDC", params.amount, shares);
        Ok(shares)
    }

    /// Burn kUSDC shares, receive USDC from Kamino lending pool.
    pub fn adapter_withdraw(ctx: Context<AdapterWithdraw>, params: AdapterWithdrawParams) -> Result<u64> {
        require!(params.shares > 0, AdapterError::ZeroAmount);

        let state = &ctx.accounts.adapter_state;
        let amount = compute_amount(params.shares, state.exchange_rate_bps)?;
        require!(amount >= params.min_amount_out, AdapterError::SlippageExceeded);

        // Burn shares
        anchor_spl::token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Burn {
                    mint: ctx.accounts.share_mint.to_account_info(),
                    from: ctx.accounts.user_share_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            params.shares,
        )?;

        // Transfer USDC from vault to user
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[&[b"vault_authority", &[state.vault_auth_bump]]],
            ),
            amount,
        )?;

        let state = &mut ctx.accounts.adapter_state;
        state.total_deposits = state.total_deposits.saturating_sub(amount);
        state.total_shares = state.total_shares.saturating_sub(params.shares);
        state.last_updated = Clock::get()?.unix_timestamp;

        emit!(WithdrawEvent {
            user: ctx.accounts.user.key(),
            shares: params.shares,
            amount,
            exchange_rate: state.exchange_rate_bps,
            timestamp: state.last_updated,
        });

        msg!("Kamino withdraw: {} kUSDC → {} USDC", params.shares, amount);
        Ok(amount)
    }

    /// Return current USDC value of `shares` kUSDC.
    pub fn adapter_current_value(ctx: Context<AdapterCurrentValue>, shares: u64) -> Result<u64> {
        let state = &ctx.accounts.adapter_state;
        let value = compute_amount(shares, state.exchange_rate_bps)?;
        Ok(value)
    }

    /// Initialize adapter state (admin only).
    pub fn initialize(ctx: Context<InitializeAdapter>, params: InitializeParams) -> Result<()> {
        let state = &mut ctx.accounts.adapter_state;
        state.admin = ctx.accounts.admin.key();
        state.underlying_mint = ctx.accounts.underlying_mint.key();
        state.share_mint = ctx.accounts.share_mint.key();
        state.vault = ctx.accounts.vault.key();
        state.exchange_rate_bps = 10_000; // 1:1 initially
        state.total_deposits = 0;
        state.total_shares = 0;
        state.apy_bps = params.initial_apy_bps;
        state.deposits_paused = false;
        state.min_deposit = params.min_deposit;
        state.last_updated = Clock::get()?.unix_timestamp;
        state.vault_auth_bump = ctx.bumps.vault_authority;
        state.bump = ctx.bumps.adapter_state;
        Ok(())
    }

    /// Update exchange rate (called by oracle or admin).
    pub fn update_exchange_rate(
        ctx: Context<UpdateExchangeRate>,
        new_rate_bps: u64,
        new_apy_bps: u32,
    ) -> Result<()> {
        require!(
            ctx.accounts.adapter_state.admin == ctx.accounts.admin.key(),
            AdapterError::Unauthorized
        );
        let state = &mut ctx.accounts.adapter_state;
        state.exchange_rate_bps = new_rate_bps;
        state.apy_bps = new_apy_bps;
        state.last_updated = Clock::get()?.unix_timestamp;
        msg!("Exchange rate updated: {} bps, APY: {} bps", new_rate_bps, new_apy_bps);
        Ok(())
    }
}

// ── Math helpers ────────────────────────────────────────────────────────────

/// Compute kToken shares from underlying amount.
/// shares = amount * 10_000 / exchange_rate_bps
fn compute_shares(amount: u64, exchange_rate_bps: u64) -> Result<u64> {
    (amount as u128)
        .checked_mul(10_000)
        .ok_or(error!(AdapterError::Overflow))?
        .checked_div(exchange_rate_bps as u128)
        .ok_or(error!(AdapterError::Overflow))
        .map(|v| v as u64)
}

/// Compute underlying amount from kToken shares.
/// amount = shares * exchange_rate_bps / 10_000
fn compute_amount(shares: u64, exchange_rate_bps: u64) -> Result<u64> {
    (shares as u128)
        .checked_mul(exchange_rate_bps as u128)
        .ok_or(error!(AdapterError::Overflow))?
        .checked_div(10_000)
        .ok_or(error!(AdapterError::Overflow))
        .map(|v| v as u64)
}

// ── State ────────────────────────────────────────────────────────────────────

#[account]
pub struct KaminoAdapterState {
    pub admin: Pubkey,
    pub underlying_mint: Pubkey,
    pub share_mint: Pubkey,
    pub vault: Pubkey,
    /// Current exchange rate in bps (10_000 = 1:1, 10_500 = 1.05x)
    pub exchange_rate_bps: u64,
    pub total_deposits: u64,
    pub total_shares: u64,
    pub apy_bps: u32,
    pub deposits_paused: bool,
    pub min_deposit: u64,
    pub last_updated: i64,
    pub vault_auth_bump: u8,
    pub bump: u8,
}

impl KaminoAdapterState {
    pub const LEN: usize = 8 + 32*4 + 8 + 8 + 8 + 4 + 1 + 8 + 8 + 1 + 1;
}

// ── Params ───────────────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct AdapterDepositParams {
    pub amount: u64,
    pub min_shares_out: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct AdapterWithdrawParams {
    pub shares: u64,
    pub min_amount_out: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct InitializeParams {
    pub initial_apy_bps: u32,
    pub min_deposit: u64,
}

// ── Account Contexts ─────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct AdapterDeposit<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, KaminoAdapterState>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_share_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub share_mint: Account<'info, Mint>,
    /// CHECK: PDA vault authority
    #[account(seeds = [b"vault_authority"], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdapterWithdraw<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, KaminoAdapterState>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_share_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub share_mint: Account<'info, Mint>,
    /// CHECK: PDA vault authority
    #[account(seeds = [b"vault_authority"], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdapterCurrentValue<'info> {
    #[account(seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, KaminoAdapterState>,
}

#[derive(Accounts)]
pub struct InitializeAdapter<'info> {
    #[account(init, payer = admin, space = KaminoAdapterState::LEN, seeds = [b"adapter_state"], bump)]
    pub adapter_state: Account<'info, KaminoAdapterState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub underlying_mint: Account<'info, Mint>,
    pub share_mint: Account<'info, Mint>,
    pub vault: Account<'info, TokenAccount>,
    /// CHECK: PDA
    #[account(seeds = [b"vault_authority"], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateExchangeRate<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, KaminoAdapterState>,
    pub admin: Signer<'info>,
}

// ── Errors ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum AdapterError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Deposits are currently paused")]
    DepositsPaused,
    #[msg("Amount below minimum deposit")]
    BelowMinDeposit,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Unauthorized")]
    Unauthorized,
}

// ── Events ───────────────────────────────────────────────────────────────────

#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub shares: u64,
    pub exchange_rate: u64,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub shares: u64,
    pub amount: u64,
    pub exchange_rate: u64,
    pub timestamp: i64,
}
