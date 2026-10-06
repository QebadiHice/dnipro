// programs/adapters/drift/src/lib.rs
// Dnipro Adapter: Drift Insurance Fund (DIF)
// REFERENCE IMPLEMENTATION:
// This module models the Dnipro adapter interface. It must not be treated as a
// live integration until the underlying protocol CPI/accounts are implemented,
// tested on the target cluster, and the deployed program address is verified.
//
//
// The Drift Insurance Fund absorbs protocol losses and earns yield
// from liquidation penalties and a portion of trading fees.
// Users stake USDC and receive IF_USDC (insurance fund shares).
// Includes an unstake cooldown of 14 days.

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};

declare_id!("8ZEWPwXBjTG3DsP2sJLYpgf5iTgGay4C8YJoc5mb4YP8");

/// Drift Protocol program ID (mainnet)
pub const DRIFT_PROGRAM_ID: &str = "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH";

/// Unstake cooldown: 14 days
pub const UNSTAKE_COOLDOWN: i64 = 14 * 24 * 60 * 60;

#[program]
pub mod drift_adapter {
    use super::*;

    /// Stake USDC into Drift Insurance Fund.
    pub fn adapter_deposit(ctx: Context<AdapterDeposit>, params: AdapterDepositParams) -> Result<u64> {
        require!(params.amount > 0, AdapterError::ZeroAmount);
        let state = &ctx.accounts.adapter_state;
        require!(!state.deposits_paused, AdapterError::DepositsPaused);
        require!(params.amount >= state.min_stake, AdapterError::BelowMinStake);

        // Calculate IF shares: total_shares * amount / vault_balance
        let if_shares = if state.vault_balance == 0 || state.total_shares == 0 {
            params.amount // Initial: 1 share = 1 USDC
        } else {
            (params.amount as u128)
                .checked_mul(state.total_shares as u128)
                .ok_or(error!(AdapterError::Overflow))?
                .checked_div(state.vault_balance as u128)
                .ok_or(error!(AdapterError::Overflow))? as u64
        };

        require!(if_shares >= params.min_shares_out, AdapterError::SlippageExceeded);

        // Transfer USDC to IF vault
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.if_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            params.amount,
        )?;

        // Mint IF shares
        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.if_share_mint.to_account_info(),
                    to: ctx.accounts.user_if_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[&[b"vault_authority", &[state.vault_auth_bump]]],
            ),
            if_shares,
        )?;

        let state = &mut ctx.accounts.adapter_state;
        state.vault_balance = state.vault_balance.saturating_add(params.amount);
        state.total_shares = state.total_shares.saturating_add(if_shares);
        state.last_updated = Clock::get()?.unix_timestamp;

        emit!(DriftStakeEvent {
            user: ctx.accounts.user.key(),
            usdc_staked: params.amount,
            if_shares_minted: if_shares,
            vault_balance: state.vault_balance,
            timestamp: state.last_updated,
        });

        msg!("Drift IF stake: {} USDC → {} IF shares", params.amount, if_shares);
        Ok(if_shares)
    }

    /// Request unstake from Drift Insurance Fund (14-day cooldown).
    pub fn adapter_withdraw(ctx: Context<AdapterWithdraw>, params: AdapterWithdrawParams) -> Result<u64> {
        require!(params.shares > 0, AdapterError::ZeroAmount);
        let clock = Clock::get()?;

        let unstake_record = &mut ctx.accounts.unstake_record;
        let state = &ctx.accounts.adapter_state;

        // Compute current USDC value of shares
        let usdc_value = if state.total_shares == 0 {
            0
        } else {
            (params.shares as u128)
                .checked_mul(state.vault_balance as u128)
                .ok_or(error!(AdapterError::Overflow))?
                .checked_div(state.total_shares as u128)
                .ok_or(error!(AdapterError::Overflow))? as u64
        };
        require!(usdc_value >= params.min_amount_out, AdapterError::SlippageExceeded);

        if unstake_record.is_pending {
            // Execute pending unstake
            require!(
                clock.unix_timestamp >= unstake_record.executable_at,
                AdapterError::UnstakeCooldown
            );

            // Burn IF shares
            anchor_spl::token::burn(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Burn {
                        mint: ctx.accounts.if_share_mint.to_account_info(),
                        from: ctx.accounts.user_if_account.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                unstake_record.shares,
            )?;

            // Transfer USDC
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.if_vault.to_account_info(),
                        to: ctx.accounts.user_token_account.to_account_info(),
                        authority: ctx.accounts.vault_authority.to_account_info(),
                    },
                    &[&[b"vault_authority", &[state.vault_auth_bump]]],
                ),
                usdc_value,
            )?;

            unstake_record.is_pending = false;

            let state = &mut ctx.accounts.adapter_state;
            state.vault_balance = state.vault_balance.saturating_sub(usdc_value);
            state.total_shares = state.total_shares.saturating_sub(params.shares);
            state.last_updated = clock.unix_timestamp;

            emit!(DriftUnstakeEvent {
                user: ctx.accounts.user.key(),
                if_shares_burned: params.shares,
                usdc_received: usdc_value,
                vault_balance: state.vault_balance,
                timestamp: clock.unix_timestamp,
            });

            return Ok(usdc_value);
        } else {
            // Queue unstake request
            unstake_record.user = ctx.accounts.user.key();
            unstake_record.shares = params.shares;
            unstake_record.requested_at = clock.unix_timestamp;
            unstake_record.executable_at = clock.unix_timestamp + UNSTAKE_COOLDOWN;
            unstake_record.is_pending = true;
            unstake_record.bump = ctx.bumps.unstake_record;

            emit!(DriftUnstakeRequestedEvent {
                user: ctx.accounts.user.key(),
                shares: params.shares,
                executable_at: unstake_record.executable_at,
                timestamp: clock.unix_timestamp,
            });

            msg!("Drift unstake queued. Executable after {}", unstake_record.executable_at);
            return Ok(0);
        }
    }

    pub fn adapter_current_value(ctx: Context<AdapterCurrentValue>, shares: u64) -> Result<u64> {
        let state = &ctx.accounts.adapter_state;
        if state.total_shares == 0 { return Ok(0); }
        Ok((shares as u128)
            .checked_mul(state.vault_balance as u128)
            .ok_or(error!(AdapterError::Overflow))?
            .checked_div(state.total_shares as u128)
            .ok_or(error!(AdapterError::Overflow))? as u64)
    }

    pub fn initialize(ctx: Context<InitializeDrift>, params: DriftInitParams) -> Result<()> {
        let state = &mut ctx.accounts.adapter_state;
        state.admin = ctx.accounts.admin.key();
        state.underlying_mint = ctx.accounts.underlying_mint.key();
        state.if_share_mint = ctx.accounts.if_share_mint.key();
        state.if_vault = ctx.accounts.if_vault.key();
        state.vault_balance = 0;
        state.total_shares = 0;
        state.apy_bps = params.initial_apy_bps;
        state.deposits_paused = false;
        state.min_stake = params.min_stake;
        state.last_updated = Clock::get()?.unix_timestamp;
        state.vault_auth_bump = ctx.bumps.vault_authority;
        state.bump = ctx.bumps.adapter_state;
        Ok(())
    }

    /// Update vault balance after fees/slippage events (called by admin oracle).
    pub fn update_vault_balance(ctx: Context<UpdateVaultBalance>, new_balance: u64, new_apy_bps: u32) -> Result<()> {
        let state = &mut ctx.accounts.adapter_state;
        require!(state.admin == ctx.accounts.admin.key(), AdapterError::Unauthorized);
        state.vault_balance = new_balance;
        state.apy_bps = new_apy_bps;
        state.last_updated = Clock::get()?.unix_timestamp;
        msg!("Drift IF vault balance updated: {}", new_balance);
        Ok(())
    }
}

#[account]
pub struct DriftAdapterState {
    pub admin: Pubkey,
    pub underlying_mint: Pubkey,
    pub if_share_mint: Pubkey,
    pub if_vault: Pubkey,
    pub vault_balance: u64,
    pub total_shares: u64,
    pub apy_bps: u32,
    pub deposits_paused: bool,
    pub min_stake: u64,
    pub last_updated: i64,
    pub vault_auth_bump: u8,
    pub bump: u8,
}
impl DriftAdapterState { pub const LEN: usize = 8 + 32*4 + 8 + 8 + 4 + 1 + 8 + 8 + 1 + 1; }

#[account]
pub struct UnstakeRecord {
    pub user: Pubkey,
    pub shares: u64,
    pub requested_at: i64,
    pub executable_at: i64,
    pub is_pending: bool,
    pub bump: u8,
}
impl UnstakeRecord { pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 1 + 1; }

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AdapterDepositParams { pub amount: u64, pub min_shares_out: u64 }
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AdapterWithdrawParams { pub shares: u64, pub min_amount_out: u64 }
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DriftInitParams { pub initial_apy_bps: u32, pub min_stake: u64 }

#[derive(Accounts)]
pub struct AdapterDeposit<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, DriftAdapterState>,
    #[account(mut)] pub user: Signer<'info>,
    #[account(mut)] pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)] pub user_if_account: Account<'info, TokenAccount>,
    #[account(mut)] pub if_vault: Account<'info, TokenAccount>,
    #[account(mut)] pub if_share_mint: Account<'info, Mint>,
    /// CHECK: PDA
    #[account(seeds = [b"vault_authority"], bump)] pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdapterWithdraw<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, DriftAdapterState>,
    #[account(
        init_if_needed, payer = user, space = UnstakeRecord::LEN,
        seeds = [b"unstake_record", user.key().as_ref()], bump
    )]
    pub unstake_record: Account<'info, UnstakeRecord>,
    #[account(mut)] pub user: Signer<'info>,
    #[account(mut)] pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)] pub user_if_account: Account<'info, TokenAccount>,
    #[account(mut)] pub if_vault: Account<'info, TokenAccount>,
    #[account(mut)] pub if_share_mint: Account<'info, Mint>,
    /// CHECK: PDA
    #[account(seeds = [b"vault_authority"], bump)] pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdapterCurrentValue<'info> {
    #[account(seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, DriftAdapterState>,
}

#[derive(Accounts)]
pub struct InitializeDrift<'info> {
    #[account(init, payer = admin, space = DriftAdapterState::LEN, seeds = [b"adapter_state"], bump)]
    pub adapter_state: Account<'info, DriftAdapterState>,
    #[account(mut)] pub admin: Signer<'info>,
    pub underlying_mint: Account<'info, Mint>,
    pub if_share_mint: Account<'info, Mint>,
    pub if_vault: Account<'info, TokenAccount>,
    /// CHECK: PDA
    #[account(seeds = [b"vault_authority"], bump)] pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateVaultBalance<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, DriftAdapterState>,
    pub admin: Signer<'info>,
}

#[error_code]
pub enum AdapterError {
    #[msg("Zero amount")] ZeroAmount,
    #[msg("Slippage exceeded")] SlippageExceeded,
    #[msg("Deposits paused")] DepositsPaused,
    #[msg("Below minimum stake amount")] BelowMinStake,
    #[msg("Unstake still in cooldown period (14 days)")] UnstakeCooldown,
    #[msg("Overflow")] Overflow,
    #[msg("Unauthorized")] Unauthorized,
}

#[event] pub struct DriftStakeEvent {
    pub user: Pubkey, pub usdc_staked: u64, pub if_shares_minted: u64,
    pub vault_balance: u64, pub timestamp: i64,
}
#[event] pub struct DriftUnstakeEvent {
    pub user: Pubkey, pub if_shares_burned: u64, pub usdc_received: u64,
    pub vault_balance: u64, pub timestamp: i64,
}
#[event] pub struct DriftUnstakeRequestedEvent {
    pub user: Pubkey, pub shares: u64, pub executable_at: i64, pub timestamp: i64,
}
