use anchor_lang::prelude::*;

declare_id!("JBSNe6wmCMiJXemkHm7qTRNFaPDd8sjJdwwjYGiAgkfe");

const REGISTRY_CONFIG_SEED: &[u8] = b"registry_config_v2";
const ADAPTER_RECORD_SEED: &[u8] = b"adapter_v2";

#[program]
pub mod registry {
    use super::*;

    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.governance = ctx.accounts.governance.key();
        config.adapter_count = 0;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn register_adapter(ctx: Context<RegisterAdapter>, name: [u8; 32]) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let record = &mut ctx.accounts.adapter_record;

        record.program_id = ctx.accounts.adapter_program.key();
        record.underlying_mint = ctx.accounts.underlying_mint.key();
        record.adapter_state = ctx.accounts.adapter_state.key();
        record.adapter_vault = ctx.accounts.adapter_vault.key();
        record.adapter_vault_authority = ctx.accounts.adapter_vault_authority.key();
        record.active = true;
        record.name = name;
        record.bump = ctx.bumps.adapter_record;

        config.adapter_count = config
            .adapter_count
            .checked_add(1)
            .ok_or(RegistryError::Overflow)?;

        emit!(AdapterRegistered {
            program_id: record.program_id,
            underlying_mint: record.underlying_mint,
            adapter_state: record.adapter_state,
            adapter_vault: record.adapter_vault,
            adapter_vault_authority: record.adapter_vault_authority,
        });

        Ok(())
    }

    pub fn set_adapter_active(ctx: Context<SetAdapterActive>, active: bool) -> Result<()> {
        ctx.accounts.adapter_record.active = active;
        Ok(())
    }
}

#[account]
pub struct RegistryConfig {
    pub governance: Pubkey,
    pub adapter_count: u32,
    pub bump: u8,
}

impl RegistryConfig {
    pub const LEN: usize = 8 + 32 + 4 + 1;
}

#[account]
pub struct AdapterRecord {
    pub program_id: Pubkey,
    pub underlying_mint: Pubkey,
    pub adapter_state: Pubkey,
    pub adapter_vault: Pubkey,
    pub adapter_vault_authority: Pubkey,
    pub active: bool,
    pub name: [u8; 32],
    pub bump: u8,
}

impl AdapterRecord {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 32 + 1 + 32 + 1;
}

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(
        init,
        payer = governance,
        space = RegistryConfig::LEN,
        seeds = [REGISTRY_CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, RegistryConfig>,

    #[account(mut)]
    pub governance: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterAdapter<'info> {
    #[account(
        mut,
        seeds = [REGISTRY_CONFIG_SEED],
        bump = config.bump,
        constraint = config.governance == governance.key() @ RegistryError::Unauthorized
    )]
    pub config: Account<'info, RegistryConfig>,

    #[account(
        init,
        payer = governance,
        space = AdapterRecord::LEN,
        seeds = [ADAPTER_RECORD_SEED, adapter_program.key().as_ref()],
        bump
    )]
    pub adapter_record: Account<'info, AdapterRecord>,

    /// CHECK: Registry stores the deployed adapter program id. Executability is checked here.
    #[account(executable)]
    pub adapter_program: UncheckedAccount<'info>,

    /// CHECK: Adapter-owned state PDA, verified by Dispatcher against this record.
    pub adapter_state: UncheckedAccount<'info>,

    /// CHECK: Adapter token vault, verified by Dispatcher against this record.
    pub adapter_vault: UncheckedAccount<'info>,

    /// CHECK: Adapter vault authority PDA, verified by Dispatcher against this record.
    pub adapter_vault_authority: UncheckedAccount<'info>,

    /// CHECK: SPL mint address is stored in the record and checked by Dispatcher.
    pub underlying_mint: UncheckedAccount<'info>,

    #[account(mut)]
    pub governance: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetAdapterActive<'info> {
    #[account(
        seeds = [REGISTRY_CONFIG_SEED],
        bump = config.bump,
        constraint = config.governance == governance.key() @ RegistryError::Unauthorized
    )]
    pub config: Account<'info, RegistryConfig>,

    #[account(
        mut,
        seeds = [ADAPTER_RECORD_SEED, adapter_record.program_id.as_ref()],
        bump = adapter_record.bump
    )]
    pub adapter_record: Account<'info, AdapterRecord>,

    pub governance: Signer<'info>,
}

#[event]
pub struct AdapterRegistered {
    pub program_id: Pubkey,
    pub underlying_mint: Pubkey,
    pub adapter_state: Pubkey,
    pub adapter_vault: Pubkey,
    pub adapter_vault_authority: Pubkey,
}

#[error_code]
pub enum RegistryError {
    #[msg("Only registry governance may perform this action")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    Overflow,
}
