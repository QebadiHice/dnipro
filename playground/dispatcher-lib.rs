use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_lang::solana_program::instruction::AccountMeta;
use std::convert::TryInto;

declare_id!("BfSctTciPvzNL3KwkNsQnqUmr5tK9R5B7zz6MCT845rt");

const CONFIG_SEED: &[u8] = b"dispatcher_config_v2";
const AUTHORITY_SEED: &[u8] = b"dispatcher_authority_v2";
const POSITION_SEED: &[u8] = b"position_v2";
const REGISTRY_ADAPTER_SEED: &[u8] = b"adapter_v2";

#[program]
pub mod dispatcher {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, registry_program: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.registry_program = registry_program;
        config.paused = false;
        config.bump = ctx.bumps.config;
        config.authority_bump = ctx.bumps.dispatcher_authority;
        Ok(())
    }

    pub fn set_paused(ctx: Context<AdminConfig>, paused: bool) -> Result<()> {
        ctx.accounts.config.paused = paused;
        Ok(())
    }

    pub fn deposit(ctx: Context<RouteFunds>, amount: u64) -> Result<()> {
        require!(amount > 0, DispatcherError::ZeroAmount);
        require!(!ctx.accounts.config.paused, DispatcherError::Paused);
        validate_registry_route(&ctx)?;

        let adapter_deposit_discriminator = [190u8, 207, 72, 186, 232, 106, 46, 72];
        let mut data = adapter_deposit_discriminator.to_vec();
        data.extend_from_slice(&amount.to_le_bytes());

        let ix = anchor_lang::solana_program::instruction::Instruction {
            program_id: ctx.accounts.adapter_program.key(),
            accounts: vec![
                AccountMeta::new(ctx.accounts.adapter_state.key(), false),
                AccountMeta::new_readonly(ctx.accounts.dispatcher_authority.key(), true),
                AccountMeta::new(ctx.accounts.user.key(), true),
                AccountMeta::new(ctx.accounts.user_token_account.key(), false),
                AccountMeta::new(ctx.accounts.adapter_vault.key(), false),
                AccountMeta::new_readonly(ctx.accounts.adapter_vault_authority.key(), false),
                AccountMeta::new_readonly(ctx.accounts.underlying_mint.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
            ],
            data,
        };

        let signer_seeds: &[&[u8]] = &[AUTHORITY_SEED, &[ctx.accounts.config.authority_bump]];
        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.adapter_state.to_account_info(),
                ctx.accounts.dispatcher_authority.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.user_token_account.to_account_info(),
                ctx.accounts.adapter_vault.to_account_info(),
                ctx.accounts.adapter_vault_authority.to_account_info(),
                ctx.accounts.underlying_mint.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.adapter_program.to_account_info(),
            ],
            &[signer_seeds],
        )
        .map_err(|_| error!(DispatcherError::AdapterCpiFailed))?;

        let position = &mut ctx.accounts.position;
        let was_new = !position.active;
        if was_new {
            position.owner = ctx.accounts.user.key();
            position.adapter_program = ctx.accounts.adapter_program.key();
            position.underlying_mint = ctx.accounts.underlying_mint.key();
            position.amount = 0;
            position.active = true;
            position.bump = ctx.bumps.position;
        }
        position.amount = position
            .amount
            .checked_add(amount)
            .ok_or(DispatcherError::Overflow)?;
        position.updated_at = Clock::get()?.unix_timestamp;

        emit!(DepositCompleted {
            user: position.owner,
            adapter_program: position.adapter_program,
            amount,
            new_balance: position.amount,
        });

        Ok(())
    }

    /// `amount == 0` withdraws the complete Dnipro position.
    pub fn withdraw(ctx: Context<RouteFunds>, amount: u64) -> Result<()> {
        require!(!ctx.accounts.config.paused, DispatcherError::Paused);
        validate_registry_route(&ctx)?;

        let current = ctx.accounts.position.amount;
        require!(ctx.accounts.position.active && current > 0, DispatcherError::NoPosition);
        let amount_out = if amount == 0 { current } else { amount };
        require!(amount_out > 0 && amount_out <= current, DispatcherError::InsufficientPosition);

        let adapter_withdraw_discriminator = [121u8, 55, 72, 46, 185, 100, 173, 236];
        let mut data = adapter_withdraw_discriminator.to_vec();
        data.extend_from_slice(&amount_out.to_le_bytes());

        let ix = anchor_lang::solana_program::instruction::Instruction {
            program_id: ctx.accounts.adapter_program.key(),
            accounts: vec![
                AccountMeta::new(ctx.accounts.adapter_state.key(), false),
                AccountMeta::new_readonly(ctx.accounts.dispatcher_authority.key(), true),
                AccountMeta::new(ctx.accounts.user.key(), true),
                AccountMeta::new(ctx.accounts.user_token_account.key(), false),
                AccountMeta::new(ctx.accounts.adapter_vault.key(), false),
                AccountMeta::new_readonly(ctx.accounts.adapter_vault_authority.key(), false),
                AccountMeta::new_readonly(ctx.accounts.underlying_mint.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
            ],
            data,
        };

        let signer_seeds: &[&[u8]] = &[AUTHORITY_SEED, &[ctx.accounts.config.authority_bump]];
        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.adapter_state.to_account_info(),
                ctx.accounts.dispatcher_authority.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.user_token_account.to_account_info(),
                ctx.accounts.adapter_vault.to_account_info(),
                ctx.accounts.adapter_vault_authority.to_account_info(),
                ctx.accounts.underlying_mint.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.adapter_program.to_account_info(),
            ],
            &[signer_seeds],
        )
        .map_err(|_| error!(DispatcherError::AdapterCpiFailed))?;

        let position = &mut ctx.accounts.position;
        position.amount = position
            .amount
            .checked_sub(amount_out)
            .ok_or(DispatcherError::Overflow)?;
        position.updated_at = Clock::get()?.unix_timestamp;
        if position.amount == 0 {
            position.active = false;
        }

        emit!(WithdrawCompleted {
            user: position.owner,
            adapter_program: position.adapter_program,
            amount: amount_out,
            remaining_balance: position.amount,
        });

        Ok(())
    }
}

fn validate_registry_route(ctx: &Context<RouteFunds>) -> Result<()> {
    let config = &ctx.accounts.config;
    let adapter_program = ctx.accounts.adapter_program.key();

    let (expected_record, _) = Pubkey::find_program_address(
        &[REGISTRY_ADAPTER_SEED, adapter_program.as_ref()],
        &config.registry_program,
    );
    require_keys_eq!(
        expected_record,
        ctx.accounts.registry_adapter_record.key(),
        DispatcherError::InvalidRegistryRecord
    );
    require_keys_eq!(
        *ctx.accounts.registry_adapter_record.owner,
        config.registry_program,
        DispatcherError::InvalidRegistryRecord
    );

    let data = ctx.accounts.registry_adapter_record.try_borrow_data()?;
    require!(data.len() >= 202, DispatcherError::InvalidRegistryRecord);

    let program_id = Pubkey::new_from_array(
        data[8..40]
            .try_into()
            .map_err(|_| error!(DispatcherError::InvalidRegistryRecord))?,
    );
    let mint = Pubkey::new_from_array(
        data[40..72]
            .try_into()
            .map_err(|_| error!(DispatcherError::InvalidRegistryRecord))?,
    );
    let adapter_state = Pubkey::new_from_array(
        data[72..104]
            .try_into()
            .map_err(|_| error!(DispatcherError::InvalidRegistryRecord))?,
    );
    let adapter_vault = Pubkey::new_from_array(
        data[104..136]
            .try_into()
            .map_err(|_| error!(DispatcherError::InvalidRegistryRecord))?,
    );
    let adapter_vault_authority = Pubkey::new_from_array(
        data[136..168]
            .try_into()
            .map_err(|_| error!(DispatcherError::InvalidRegistryRecord))?,
    );
    let active = data[168] != 0;

    require_keys_eq!(program_id, adapter_program, DispatcherError::InvalidRegistryRecord);
    require_keys_eq!(mint, ctx.accounts.underlying_mint.key(), DispatcherError::InvalidRegistryRecord);
    require_keys_eq!(adapter_state, ctx.accounts.adapter_state.key(), DispatcherError::InvalidRegistryRecord);
    require_keys_eq!(adapter_vault, ctx.accounts.adapter_vault.key(), DispatcherError::InvalidRegistryRecord);
    require_keys_eq!(adapter_vault_authority, ctx.accounts.adapter_vault_authority.key(), DispatcherError::InvalidRegistryRecord);
    require!(active, DispatcherError::AdapterInactive);

    Ok(())
}

#[account]
pub struct DispatcherConfig {
    pub admin: Pubkey,
    pub registry_program: Pubkey,
    pub paused: bool,
    pub bump: u8,
    pub authority_bump: u8,
}

impl DispatcherConfig {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1 + 1;
}

#[account]
pub struct Position {
    pub owner: Pubkey,
    pub adapter_program: Pubkey,
    pub underlying_mint: Pubkey,
    pub amount: u64,
    pub updated_at: i64,
    pub active: bool,
    pub bump: u8,
}

impl Position {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1;
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = DispatcherConfig::LEN,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, DispatcherConfig>,

    /// CHECK: PDA only; it signs adapter CPIs through invoke_signed.
    #[account(seeds = [AUTHORITY_SEED], bump)]
    pub dispatcher_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminConfig<'info> {
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ DispatcherError::Unauthorized
    )]
    pub config: Account<'info, DispatcherConfig>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct RouteFunds<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, DispatcherConfig>,

    #[account(
        init_if_needed,
        payer = user,
        space = Position::LEN,
        seeds = [POSITION_SEED, user.key().as_ref(), adapter_program.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,

    /// CHECK: Registry-owned adapter record, validated manually in the handler.
    pub registry_adapter_record: UncheckedAccount<'info>,

    /// CHECK: Registered adapter program, validated against the Registry record.
    #[account(executable)]
    pub adapter_program: UncheckedAccount<'info>,

    /// CHECK: Registered adapter state PDA, validated against the Registry record and by the adapter.
    #[account(mut)]
    pub adapter_state: UncheckedAccount<'info>,

    /// CHECK: Dispatcher PDA that signs the adapter CPI.
    #[account(seeds = [AUTHORITY_SEED], bump = config.authority_bump)]
    pub dispatcher_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        token::mint = underlying_mint,
        token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// CHECK: Registered adapter vault, validated against the Registry record and by the adapter.
    #[account(mut)]
    pub adapter_vault: UncheckedAccount<'info>,

    /// CHECK: Registered adapter vault authority PDA.
    pub adapter_vault_authority: UncheckedAccount<'info>,

    pub underlying_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct DepositCompleted {
    pub user: Pubkey,
    pub adapter_program: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

#[event]
pub struct WithdrawCompleted {
    pub user: Pubkey,
    pub adapter_program: Pubkey,
    pub amount: u64,
    pub remaining_balance: u64,
}

#[error_code]
pub enum DispatcherError {
    #[msg("Dnipro Dispatcher is paused")]
    Paused,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Caller is not the Dnipro administrator")]
    Unauthorized,
    #[msg("The supplied Registry adapter record is invalid")]
    InvalidRegistryRecord,
    #[msg("The selected adapter is inactive")]
    AdapterInactive,
    #[msg("No live Dnipro position exists")]
    NoPosition,
    #[msg("Withdrawal exceeds the Dnipro position")]
    InsufficientPosition,
    #[msg("Adapter CPI failed")]
    AdapterCpiFailed,
    #[msg("Arithmetic overflow")]
    Overflow,
}
