// programs/adapters/maple/src/lib.rs
// Dnipro Adapter: Maple Syrup (Real World Asset / Private Credit)
// REFERENCE IMPLEMENTATION:
// This module models the Dnipro adapter interface. It must not be treated as a
// live integration until the underlying protocol CPI/accounts are implemented,
// tested on the target cluster, and the deployed program address is verified.
//
//
// Maple Finance provides undercollateralized lending to institutional borrowers.
// Depositors earn yield from institutional loan interest.
// Uses a "pool delegate" model with withdrawal queues.

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};

declare_id!("Ht1uo1tiXUjPouaNmDxqNpGN5K7jNi4jGJq6crZPrPcv");

/// Withdrawal delay (7 days) — Maple uses withdrawal queues
pub const WITHDRAWAL_COOLDOWN: i64 = 7 * 24 * 60 * 60;

#[program]
pub mod maple_adapter {
    use super::*;

    /// Deposit USDC into Maple pool, receive syrup tokens (pool shares).
    pub fn adapter_deposit(ctx: Context<AdapterDeposit>, params: AdapterDepositParams) -> Result<u64> {
        require!(params.amount > 0, AdapterError::ZeroAmount);
        let state = &ctx.accounts.adapter_state;
        require!(!state.deposits_paused, AdapterError::DepositsPaused);
        require!(params.amount >= state.min_deposit, AdapterError::BelowMinDeposit);
        require!(params.amount <= state.max_deposit || state.max_deposit == 0, AdapterError::ExceedsMaxDeposit);

        // Maple pool share calculation (NAV-based)
        let shares = maple_compute_shares(params.amount, state.nav_per_share_bps)?;
        require!(shares >= params.min_shares_out, AdapterError::SlippageExceeded);

        // Transfer to Maple pool vault
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.pool_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            params.amount,
        )?;

        // Mint syrup shares
        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.syrup_mint.to_account_info(),
                    to: ctx.accounts.user_syrup_account.to_account_info(),
                    authority: ctx.accounts.pool_authority.to_account_info(),
                },
                &[&[b"pool_authority", &[state.pool_auth_bump]]],
            ),
            shares,
        )?;

        let state = &mut ctx.accounts.adapter_state;
        state.total_assets = state.total_assets.saturating_add(params.amount);
        state.total_shares = state.total_shares.saturating_add(shares);
        state.last_updated = Clock::get()?.unix_timestamp;

        emit!(MapleDepositEvent {
            user: ctx.accounts.user.key(),
            usdc_deposited: params.amount,
            shares_received: shares,
            nav_per_share: state.nav_per_share_bps,
            timestamp: state.last_updated,
        });

        Ok(shares)
    }

    /// Queue a withdrawal request (Maple uses a withdrawal queue).
    pub fn adapter_withdraw(ctx: Context<AdapterWithdraw>, params: AdapterWithdrawParams) -> Result<u64> {
        require!(params.shares > 0, AdapterError::ZeroAmount);

        let state = &ctx.accounts.adapter_state;
        let usdc_out = maple_compute_amount(params.shares, state.nav_per_share_bps)?;
        require!(usdc_out >= params.min_amount_out, AdapterError::SlippageExceeded);

        let withdrawal_request = &mut ctx.accounts.withdrawal_request;
        let clock = Clock::get()?;

        // Check if we're executing a queued withdrawal
        if withdrawal_request.is_initialized {
            require!(
                clock.unix_timestamp >= withdrawal_request.executable_at,
                AdapterError::WithdrawalCooldown
            );

            // Execute the withdrawal
            anchor_spl::token::burn(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Burn {
                        mint: ctx.accounts.syrup_mint.to_account_info(),
                        from: ctx.accounts.user_syrup_account.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                params.shares,
            )?;

            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.pool_vault.to_account_info(),
                        to: ctx.accounts.user_token_account.to_account_info(),
                        authority: ctx.accounts.pool_authority.to_account_info(),
                    },
                    &[&[b"pool_authority", &[state.pool_auth_bump]]],
                ),
                usdc_out,
            )?;

            withdrawal_request.is_initialized = false;
            withdrawal_request.shares = 0;

            let state = &mut ctx.accounts.adapter_state;
            state.total_assets = state.total_assets.saturating_sub(usdc_out);
            state.total_shares = state.total_shares.saturating_sub(params.shares);
            state.last_updated = clock.unix_timestamp;
        } else {
            // Queue the withdrawal request
            withdrawal_request.user = ctx.accounts.user.key();
            withdrawal_request.shares = params.shares;
            withdrawal_request.requested_at = clock.unix_timestamp;
            withdrawal_request.executable_at = clock.unix_timestamp + WITHDRAWAL_COOLDOWN;
            withdrawal_request.is_initialized = true;
            withdrawal_request.bump = ctx.bumps.withdrawal_request;

            emit!(MapleWithdrawalQueuedEvent {
                user: ctx.accounts.user.key(),
                shares: params.shares,
                executable_at: withdrawal_request.executable_at,
                timestamp: clock.unix_timestamp,
            });

            msg!("Maple withdrawal queued. Executable after {}", withdrawal_request.executable_at);
            return Ok(0); // 0 = queued, not yet executed
        }

        emit!(MapleWithdrawEvent {
            user: ctx.accounts.user.key(),
            shares_burned: params.shares,
            usdc_received: usdc_out,
            timestamp: clock.unix_timestamp,
        });

        Ok(usdc_out)
    }

    pub fn adapter_current_value(ctx: Context<AdapterCurrentValue>, shares: u64) -> Result<u64> {
        maple_compute_amount(shares, ctx.accounts.adapter_state.nav_per_share_bps)
    }

    pub fn initialize(ctx: Context<InitializeMaple>, params: MapleInitParams) -> Result<()> {
        let state = &mut ctx.accounts.adapter_state;
        state.admin = ctx.accounts.admin.key();
        state.underlying_mint = ctx.accounts.underlying_mint.key();
        state.syrup_mint = ctx.accounts.syrup_mint.key();
        state.pool_vault = ctx.accounts.pool_vault.key();
        state.nav_per_share_bps = 10_000; // 1:1 initially
        state.total_assets = 0;
        state.total_shares = 0;
        state.apy_bps = params.apy_bps;
        state.deposits_paused = false;
        state.min_deposit = params.min_deposit;
        state.max_deposit = params.max_deposit;
        state.last_updated = Clock::get()?.unix_timestamp;
        state.pool_auth_bump = ctx.bumps.pool_authority;
        state.bump = ctx.bumps.adapter_state;
        Ok(())
    }

    pub fn update_nav(ctx: Context<UpdateNav>, new_nav_bps: u64, new_apy_bps: u32) -> Result<()> {
        let state = &mut ctx.accounts.adapter_state;
        require!(state.admin == ctx.accounts.admin.key(), AdapterError::Unauthorized);
        state.nav_per_share_bps = new_nav_bps;
        state.apy_bps = new_apy_bps;
        state.last_updated = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

fn maple_compute_shares(amount: u64, nav_per_share_bps: u64) -> Result<u64> {
    (amount as u128)
        .checked_mul(10_000)
        .ok_or(error!(AdapterError::Overflow))?
        .checked_div(nav_per_share_bps as u128)
        .ok_or(error!(AdapterError::Overflow))
        .map(|v| v as u64)
}

fn maple_compute_amount(shares: u64, nav_per_share_bps: u64) -> Result<u64> {
    (shares as u128)
        .checked_mul(nav_per_share_bps as u128)
        .ok_or(error!(AdapterError::Overflow))?
        .checked_div(10_000)
        .ok_or(error!(AdapterError::Overflow))
        .map(|v| v as u64)
}

#[account]
pub struct MapleAdapterState {
    pub admin: Pubkey,
    pub underlying_mint: Pubkey,
    pub syrup_mint: Pubkey,
    pub pool_vault: Pubkey,
    pub nav_per_share_bps: u64,
    pub total_assets: u64,
    pub total_shares: u64,
    pub apy_bps: u32,
    pub deposits_paused: bool,
    pub min_deposit: u64,
    pub max_deposit: u64,
    pub last_updated: i64,
    pub pool_auth_bump: u8,
    pub bump: u8,
}
impl MapleAdapterState { pub const LEN: usize = 8 + 32*4 + 8 + 8 + 8 + 4 + 1 + 8 + 8 + 8 + 1 + 1; }

#[account]
pub struct WithdrawalRequest {
    pub user: Pubkey,
    pub shares: u64,
    pub requested_at: i64,
    pub executable_at: i64,
    pub is_initialized: bool,
    pub bump: u8,
}
impl WithdrawalRequest { pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 1 + 1; }

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AdapterDepositParams { pub amount: u64, pub min_shares_out: u64 }
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AdapterWithdrawParams { pub shares: u64, pub min_amount_out: u64 }
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MapleInitParams { pub apy_bps: u32, pub min_deposit: u64, pub max_deposit: u64 }

#[derive(Accounts)]
pub struct AdapterDeposit<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, MapleAdapterState>,
    #[account(mut)] pub user: Signer<'info>,
    #[account(mut)] pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)] pub user_syrup_account: Account<'info, TokenAccount>,
    #[account(mut)] pub pool_vault: Account<'info, TokenAccount>,
    #[account(mut)] pub syrup_mint: Account<'info, Mint>,
    /// CHECK: PDA
    #[account(seeds = [b"pool_authority"], bump)] pub pool_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdapterWithdraw<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, MapleAdapterState>,
    #[account(
        init_if_needed, payer = user, space = WithdrawalRequest::LEN,
        seeds = [b"withdrawal_request", user.key().as_ref()], bump
    )]
    pub withdrawal_request: Account<'info, WithdrawalRequest>,
    #[account(mut)] pub user: Signer<'info>,
    #[account(mut)] pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)] pub user_syrup_account: Account<'info, TokenAccount>,
    #[account(mut)] pub pool_vault: Account<'info, TokenAccount>,
    #[account(mut)] pub syrup_mint: Account<'info, Mint>,
    /// CHECK: PDA
    #[account(seeds = [b"pool_authority"], bump)] pub pool_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdapterCurrentValue<'info> {
    #[account(seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, MapleAdapterState>,
}

#[derive(Accounts)]
pub struct InitializeMaple<'info> {
    #[account(init, payer = admin, space = MapleAdapterState::LEN, seeds = [b"adapter_state"], bump)]
    pub adapter_state: Account<'info, MapleAdapterState>,
    #[account(mut)] pub admin: Signer<'info>,
    pub underlying_mint: Account<'info, Mint>,
    pub syrup_mint: Account<'info, Mint>,
    pub pool_vault: Account<'info, TokenAccount>,
    /// CHECK: PDA
    #[account(seeds = [b"pool_authority"], bump)] pub pool_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateNav<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, MapleAdapterState>,
    pub admin: Signer<'info>,
}

#[error_code]
pub enum AdapterError {
    #[msg("Zero amount")] ZeroAmount,
    #[msg("Slippage exceeded")] SlippageExceeded,
    #[msg("Deposits paused")] DepositsPaused,
    #[msg("Below minimum deposit")] BelowMinDeposit,
    #[msg("Exceeds maximum deposit")] ExceedsMaxDeposit,
    #[msg("Withdrawal still in cooldown period")] WithdrawalCooldown,
    #[msg("Overflow")] Overflow,
    #[msg("Unauthorized")] Unauthorized,
}

#[event] pub struct MapleDepositEvent {
    pub user: Pubkey, pub usdc_deposited: u64, pub shares_received: u64,
    pub nav_per_share: u64, pub timestamp: i64,
}
#[event] pub struct MapleWithdrawEvent {
    pub user: Pubkey, pub shares_burned: u64, pub usdc_received: u64, pub timestamp: i64,
}
#[event] pub struct MapleWithdrawalQueuedEvent {
    pub user: Pubkey, pub shares: u64, pub executable_at: i64, pub timestamp: i64,
}
