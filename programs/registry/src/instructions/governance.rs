// programs/registry/src/instructions/governance.rs
use anchor_lang::prelude::*;
use crate::state::{RegistryConfig, GovernanceProposal, GovernanceAction};
use crate::error::RegistryError;
use crate::events::{GovernanceProposedEvent, GovernanceExecutedEvent};

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct ProposeParams {
    pub proposal_id: u64,
    pub action: GovernanceAction,
}

#[derive(Accounts)]
#[instruction(params: ProposeParams)]
pub struct ProposeGovernanceAction<'info> {
    #[account(
        seeds = [RegistryConfig::SEEDS],
        bump = config.bump,
        constraint = config.governance == governance.key() @ RegistryError::Unauthorized,
    )]
    pub config: Account<'info, RegistryConfig>,

    #[account(
        init,
        payer = governance,
        space = GovernanceProposal::LEN,
        seeds = [GovernanceProposal::SEEDS, &params.proposal_id.to_le_bytes()],
        bump
    )]
    pub proposal: Account<'info, GovernanceProposal>,

    #[account(mut)]
    pub governance: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn propose_handler(ctx: Context<ProposeGovernanceAction>, params: ProposeParams) -> Result<()> {
    let clock = Clock::get()?;
    let executable_after = clock.unix_timestamp + ctx.accounts.config.timelock_delay;

    let proposal = &mut ctx.accounts.proposal;
    proposal.id = params.proposal_id;
    proposal.proposer = ctx.accounts.governance.key();
    proposal.action = params.action;
    proposal.proposed_at = clock.unix_timestamp;
    proposal.executable_after = executable_after;
    proposal.executed = false;
    proposal.bump = ctx.bumps.proposal;

    emit!(GovernanceProposedEvent {
        proposal_id: params.proposal_id,
        proposer: ctx.accounts.governance.key(),
        executable_after,
        timestamp: clock.unix_timestamp,
    });

    msg!("Governance proposal #{} submitted, executable after {}", params.proposal_id, executable_after);
    Ok(())
}

#[derive(Accounts)]
pub struct ExecuteGovernanceAction<'info> {
    #[account(
        seeds = [RegistryConfig::SEEDS],
        bump = config.bump,
        constraint = config.governance == governance.key() @ RegistryError::Unauthorized,
    )]
    pub config: Account<'info, RegistryConfig>,

    #[account(mut, seeds = [GovernanceProposal::SEEDS, &proposal.id.to_le_bytes()], bump = proposal.bump)]
    pub proposal: Account<'info, GovernanceProposal>,

    pub governance: Signer<'info>,
}

pub fn execute_handler(ctx: Context<ExecuteGovernanceAction>) -> Result<()> {
    let clock = Clock::get()?;
    let proposal = &mut ctx.accounts.proposal;

    require!(!proposal.executed, RegistryError::AlreadyExecuted);
    require!(
        clock.unix_timestamp >= proposal.executable_after,
        RegistryError::TimelockNotElapsed
    );

    proposal.executed = true;

    emit!(GovernanceExecutedEvent {
        proposal_id: proposal.id,
        executor: ctx.accounts.governance.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("Governance proposal #{} executed", proposal.id);
    Ok(())
}
