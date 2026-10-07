use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

// Solana Playground will replace this placeholder with the adapter program id on first build.
declare_id!("11111111111111111111111111111111");

const STATE_SEED: &[u8] = b"adapter_state_v1";
const VAULT_AUTHORITY_SEED: &[u8] = b"vault_authority_v1";
const VAULT_SEED: &[u8] = b"vault_v1";

#[program]
pub mod devnet_vault_adapter {
    use super::*;

    pub fn initialize_adapter(ctx: Context<InitializeAdapter>) -> Result<()> {
        let state = &mut ctx.accounts.adapter_state;
        state.admin = ctx.accounts.admin.key();
        state.underlying_mint = ctx.accounts.underlying_mint.key();
        state.dispatcher_authority = ctx.accounts.dispatcher_authority.key();
        state.total_deposits = 0;
        state.bump = ctx.bumps.adapter_state;
        state.vault_authority_bump = ctx.bumps.vault_authority;
        state.vault_bump = ctx.bumps.vault;
        Ok(())
    }

    pub fn adapter_deposit(ctx: Context<RouteTokens>, amount: u64) -> Result<()> {
        require!(amount > 0, AdapterError::ZeroAmount);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        let state = &mut ctx.accounts.adapter_state;
        state.total_deposits = state
            .total_deposits
            .checked_add(amount)
            .ok_or(AdapterError::Overflow)?;

        emit!(AdapterDeposit {
            user: ctx.accounts.user.key(),
            amount,
            total_deposits: state.total_deposits,
        });

        Ok(())
    }

    pub fn adapter_withdraw(ctx: Context<RouteTokens>, amount: u64) -> Result<()> {
        require!(amount > 0, AdapterError::ZeroAmount);
        require!(
            amount <= ctx.accounts.adapter_state.total_deposits,
            AdapterError::InsufficientVaultBalance
        );

        let signer_seeds: &[&[u8]] = &[
            VAULT_AUTHORITY_SEED,
            &[ctx.accounts.adapter_state.vault_authority_bump],
        ];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[signer_seeds],
            ),
            amount,
        )?;

        let state = &mut ctx.accounts.adapter_state;
        state.total_deposits = state
            .total_deposits
            .checked_sub(amount)
            .ok_or(AdapterError::Overflow)?;

        emit!(AdapterWithdraw {
            user: ctx.accounts.user.key(),
            amount,
            total_deposits: state.total_deposits,
        });

        Ok(())
    }
}

#[account]
pub struct AdapterState {
    pub admin: Pubkey,
    pub underlying_mint: Pubkey,
    pub dispatcher_authority: Pubkey,
    pub total_deposits: u64,
    pub bump: u8,
    pub vault_authority_bump: u8,
    pub vault_bump: u8,
}

impl AdapterState {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 1 + 1 + 1;
}

#[derive(Accounts)]
pub struct InitializeAdapter<'info> {
    #[account(
        init,
        payer = admin,
        space = AdapterState::LEN,
        seeds = [STATE_SEED],
        bump
    )]
    pub adapter_state: Account<'info, AdapterState>,

    /// CHECK: PDA controlled by the deployed Dnipro Dispatcher. Stored once and required on every route.
    pub dispatcher_authority: UncheckedAccount<'info>,

    /// CHECK: PDA that owns the SPL vault.
    #[account(seeds = [VAULT_AUTHORITY_SEED], bump)]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        seeds = [VAULT_SEED],
        bump,
        token::mint = underlying_mint,
        token::authority = vault_authority
    )]
    pub vault: Account<'info, TokenAccount>,

    pub underlying_mint: Account<'info, Mint>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RouteTokens<'info> {
    #[account(
        mut,
        seeds = [STATE_SEED],
        bump = adapter_state.bump,
        constraint = adapter_state.dispatcher_authority == dispatcher_authority.key()
            @ AdapterError::UnauthorizedDispatcher,
        constraint = adapter_state.underlying_mint == underlying_mint.key()
            @ AdapterError::WrongMint
    )]
    pub adapter_state: Account<'info, AdapterState>,

    pub dispatcher_authority: Signer<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        token::mint = underlying_mint,
        token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = adapter_state.vault_bump,
        token::mint = underlying_mint,
        token::authority = vault_authority
    )]
    pub vault: Account<'info, TokenAccount>,

    /// CHECK: PDA authority for the vault.
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump = adapter_state.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    pub underlying_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct AdapterDeposit {
    pub user: Pubkey,
    pub amount: u64,
    pub total_deposits: u64,
}

#[event]
pub struct AdapterWithdraw {
    pub user: Pubkey,
    pub amount: u64,
    pub total_deposits: u64,
}

#[error_code]
pub enum AdapterError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Only the Dnipro Dispatcher may call this adapter")]
    UnauthorizedDispatcher,
    #[msg("Wrong underlying mint")]
    WrongMint,
    #[msg("Adapter vault does not contain enough tokens")]
    InsufficientVaultBalance,
    #[msg("Arithmetic overflow")]
    Overflow,
}
