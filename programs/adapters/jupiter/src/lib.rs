// programs/adapters/jupiter/src/lib.rs
// Dnipro Adapter: Jupiter LP (Liquidity Provision)
// REFERENCE IMPLEMENTATION:
// This module models the Dnipro adapter interface. It must not be treated as a
// live integration until the underlying protocol CPI/accounts are implemented,
// tested on the target cluster, and the deployed program address is verified.
//
//
// Wraps Jupiter's Perpetual liquidity pools (JLP).
// Users provide USDC to the JLP pool and earn trading fees + funding rates.
// JLP tokens represent proportional ownership of the pool.

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};

declare_id!("Eh9e2Q55pKimA7TA5z6qoGi92xXqqYEKagdv1pvwCfLi");

/// Jupiter Perpetuals program ID (mainnet)
pub const JUPITER_PERP_PROGRAM_ID: &str = "PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu";

/// JLP pool token mint (mainnet)
pub const JLP_MINT: &str = "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4";

#[program]
pub mod jupiter_adapter {
    use super::*;

    /// Add USDC liquidity to JLP pool, receive JLP tokens.
    pub fn adapter_deposit(ctx: Context<AdapterDeposit>, params: AdapterDepositParams) -> Result<u64> {
        require!(params.amount > 0, AdapterError::ZeroAmount);
        let state = &ctx.accounts.adapter_state;
        require!(!state.deposits_paused, AdapterError::DepositsPaused);

        // JLP share price = pool_value / total_supply (in 6-decimal USDC)
        let jlp_shares = compute_jlp_shares(
            params.amount,
            state.pool_value_usd,
            state.jlp_total_supply,
        )?;
        require!(jlp_shares >= params.min_shares_out, AdapterError::SlippageExceeded);

        // Transfer USDC to pool vault
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

        // Mint JLP tokens to user
        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.jlp_mint.to_account_info(),
                    to: ctx.accounts.user_jlp_account.to_account_info(),
                    authority: ctx.accounts.pool_authority.to_account_info(),
                },
                &[&[b"pool_authority", &[state.pool_auth_bump]]],
            ),
            jlp_shares,
        )?;

        let state = &mut ctx.accounts.adapter_state;
        state.pool_value_usd = state.pool_value_usd.saturating_add(params.amount);
        state.jlp_total_supply = state.jlp_total_supply.saturating_add(jlp_shares);
        state.last_updated = Clock::get()?.unix_timestamp;

        emit!(JupiterDepositEvent {
            user: ctx.accounts.user.key(),
            usdc_deposited: params.amount,
            jlp_received: jlp_shares,
            pool_value_usd: state.pool_value_usd,
            timestamp: state.last_updated,
        });

        msg!("JLP deposit: {} USDC → {} JLP", params.amount, jlp_shares);
        Ok(jlp_shares)
    }

    /// Burn JLP tokens, receive USDC from pool.
    pub fn adapter_withdraw(ctx: Context<AdapterWithdraw>, params: AdapterWithdrawParams) -> Result<u64> {
        require!(params.shares > 0, AdapterError::ZeroAmount);

        let state = &ctx.accounts.adapter_state;
        let usdc_out = compute_usdc_from_jlp(
            params.shares,
            state.pool_value_usd,
            state.jlp_total_supply,
        )?;
        require!(usdc_out >= params.min_amount_out, AdapterError::SlippageExceeded);

        // Burn JLP
        anchor_spl::token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Burn {
                    mint: ctx.accounts.jlp_mint.to_account_info(),
                    from: ctx.accounts.user_jlp_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            params.shares,
        )?;

        // Transfer USDC from pool to user
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

        let state = &mut ctx.accounts.adapter_state;
        state.pool_value_usd = state.pool_value_usd.saturating_sub(usdc_out);
        state.jlp_total_supply = state.jlp_total_supply.saturating_sub(params.shares);
        state.last_updated = Clock::get()?.unix_timestamp;

        emit!(JupiterWithdrawEvent {
            user: ctx.accounts.user.key(),
            jlp_burned: params.shares,
            usdc_received: usdc_out,
            pool_value_usd: state.pool_value_usd,
            timestamp: state.last_updated,
        });

        Ok(usdc_out)
    }

    pub fn adapter_current_value(ctx: Context<AdapterCurrentValue>, shares: u64) -> Result<u64> {
        let state = &ctx.accounts.adapter_state;
        compute_usdc_from_jlp(shares, state.pool_value_usd, state.jlp_total_supply)
    }

    pub fn initialize(ctx: Context<InitializeJupiter>, params: JupiterInitParams) -> Result<()> {
        let state = &mut ctx.accounts.adapter_state;
        state.admin = ctx.accounts.admin.key();
        state.underlying_mint = ctx.accounts.underlying_mint.key();
        state.jlp_mint_key = ctx.accounts.jlp_mint.key();
        state.pool_vault = ctx.accounts.pool_vault.key();
        state.pool_value_usd = params.initial_pool_value;
        state.jlp_total_supply = params.initial_supply;
        state.apy_bps = params.apy_bps;
        state.deposits_paused = false;
        state.last_updated = Clock::get()?.unix_timestamp;
        state.pool_auth_bump = ctx.bumps.pool_authority;
        state.bump = ctx.bumps.adapter_state;
        Ok(())
    }

    /// Update pool value (called by oracle feed).
    pub fn update_pool_value(ctx: Context<UpdatePoolValue>, new_value: u64, new_apy_bps: u32) -> Result<()> {
        let state = &mut ctx.accounts.adapter_state;
        require!(state.admin == ctx.accounts.admin.key(), AdapterError::Unauthorized);
        state.pool_value_usd = new_value;
        state.apy_bps = new_apy_bps;
        state.last_updated = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

fn compute_jlp_shares(usdc_amount: u64, pool_value: u64, jlp_supply: u64) -> Result<u64> {
    if jlp_supply == 0 || pool_value == 0 {
        return Ok(usdc_amount); // Initial: 1 JLP per 1 USDC
    }
    (usdc_amount as u128)
        .checked_mul(jlp_supply as u128)
        .ok_or(error!(AdapterError::Overflow))?
        .checked_div(pool_value as u128)
        .ok_or(error!(AdapterError::Overflow))
        .map(|v| v as u64)
}

fn compute_usdc_from_jlp(jlp_amount: u64, pool_value: u64, jlp_supply: u64) -> Result<u64> {
    if jlp_supply == 0 { return Ok(0); }
    (jlp_amount as u128)
        .checked_mul(pool_value as u128)
        .ok_or(error!(AdapterError::Overflow))?
        .checked_div(jlp_supply as u128)
        .ok_or(error!(AdapterError::Overflow))
        .map(|v| v as u64)
}

#[account]
pub struct JupiterAdapterState {
    pub admin: Pubkey,
    pub underlying_mint: Pubkey,
    pub jlp_mint_key: Pubkey,
    pub pool_vault: Pubkey,
    pub pool_value_usd: u64,
    pub jlp_total_supply: u64,
    pub apy_bps: u32,
    pub deposits_paused: bool,
    pub last_updated: i64,
    pub pool_auth_bump: u8,
    pub bump: u8,
}
impl JupiterAdapterState { pub const LEN: usize = 8 + 32*4 + 8 + 8 + 4 + 1 + 8 + 1 + 1; }

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AdapterDepositParams { pub amount: u64, pub min_shares_out: u64 }
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AdapterWithdrawParams { pub shares: u64, pub min_amount_out: u64 }
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct JupiterInitParams {
    pub initial_pool_value: u64, pub initial_supply: u64, pub apy_bps: u32
}

#[derive(Accounts)]
pub struct AdapterDeposit<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, JupiterAdapterState>,
    #[account(mut)] pub user: Signer<'info>,
    #[account(mut)] pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)] pub user_jlp_account: Account<'info, TokenAccount>,
    #[account(mut)] pub pool_vault: Account<'info, TokenAccount>,
    #[account(mut)] pub jlp_mint: Account<'info, Mint>,
    /// CHECK: PDA
    #[account(seeds = [b"pool_authority"], bump)] pub pool_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdapterWithdraw<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, JupiterAdapterState>,
    #[account(mut)] pub user: Signer<'info>,
    #[account(mut)] pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)] pub user_jlp_account: Account<'info, TokenAccount>,
    #[account(mut)] pub pool_vault: Account<'info, TokenAccount>,
    #[account(mut)] pub jlp_mint: Account<'info, Mint>,
    /// CHECK: PDA
    #[account(seeds = [b"pool_authority"], bump)] pub pool_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdapterCurrentValue<'info> {
    #[account(seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, JupiterAdapterState>,
}

#[derive(Accounts)]
pub struct InitializeJupiter<'info> {
    #[account(init, payer = admin, space = JupiterAdapterState::LEN, seeds = [b"adapter_state"], bump)]
    pub adapter_state: Account<'info, JupiterAdapterState>,
    #[account(mut)] pub admin: Signer<'info>,
    pub underlying_mint: Account<'info, Mint>,
    pub jlp_mint: Account<'info, Mint>,
    pub pool_vault: Account<'info, TokenAccount>,
    /// CHECK: PDA
    #[account(seeds = [b"pool_authority"], bump)] pub pool_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePoolValue<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, JupiterAdapterState>,
    pub admin: Signer<'info>,
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
pub struct JupiterDepositEvent {
    pub user: Pubkey, pub usdc_deposited: u64, pub jlp_received: u64,
    pub pool_value_usd: u64, pub timestamp: i64,
}
#[event]
pub struct JupiterWithdrawEvent {
    pub user: Pubkey, pub jlp_burned: u64, pub usdc_received: u64,
    pub pool_value_usd: u64, pub timestamp: i64,
}
