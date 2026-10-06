// programs/registry/src/lib.rs
// Dnipro Registry Program
// Governance-gated adapter registration, discovery, and metadata storage.

use anchor_lang::prelude::*;

pub mod error;
pub mod state;
pub mod instructions;
pub mod events;

use instructions::*;

declare_id!("EXm2s98kb6eiYemAMc56NNF8wGHFW5NA4j4F9tpkp9ZS");

#[program]
pub mod registry {
    use super::*;

    /// Initialize the registry (called once by governance authority).
    pub fn initialize_registry(
        ctx: Context<InitializeRegistry>,
        params: InitializeRegistryParams,
    ) -> Result<()> {
        instructions::initialize_registry::handler(ctx, params)
    }

    /// Register a new adapter (governance gated).
    pub fn register_adapter(
        ctx: Context<RegisterAdapter>,
        params: RegisterAdapterParams,
    ) -> Result<()> {
        instructions::register_adapter::handler(ctx, params)
    }

    /// Update adapter metadata (governance gated).
    pub fn update_adapter(
        ctx: Context<UpdateAdapter>,
        params: UpdateAdapterParams,
    ) -> Result<()> {
        instructions::update_adapter::handler(ctx, params)
    }

    /// Deactivate an adapter (governance gated, reversible).
    pub fn deactivate_adapter(ctx: Context<DeactivateAdapter>) -> Result<()> {
        instructions::deactivate_adapter::handler(ctx)
    }

    /// Reactivate a previously deactivated adapter.
    pub fn reactivate_adapter(ctx: Context<ReactivateAdapter>) -> Result<()> {
        instructions::reactivate_adapter::handler(ctx)
    }

    /// Propose a governance action (for timelock).
    pub fn propose_governance_action(
        ctx: Context<ProposeGovernanceAction>,
        params: ProposeParams,
    ) -> Result<()> {
        instructions::governance::propose_handler(ctx, params)
    }

    /// Execute a governance action after timelock.
    pub fn execute_governance_action(
        ctx: Context<ExecuteGovernanceAction>,
    ) -> Result<()> {
        instructions::governance::execute_handler(ctx)
    }
}
