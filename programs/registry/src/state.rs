// programs/registry/src/state.rs
use anchor_lang::prelude::*;

/// The master registry configuration.
/// PDA: ["registry_config"]
#[account]
pub struct RegistryConfig {
    /// Governance authority (DAO / multisig)
    pub governance: Pubkey,
    /// Pending governance (for two-step transfer)
    pub pending_governance: Option<Pubkey>,
    /// Timelock delay for governance actions (seconds)
    pub timelock_delay: i64,
    /// Total adapters registered
    pub adapter_count: u32,
    /// Total active adapters
    pub active_count: u32,
    pub version: u8,
    pub bump: u8,
    pub _reserved: [u8; 64],
}

impl RegistryConfig {
    pub const LEN: usize = 8 + 32 + 33 + 8 + 4 + 4 + 1 + 1 + 64;
    pub const SEEDS: &'static [u8] = b"registry_config";
}

/// Adapter registration record.
/// PDA: ["adapter", adapter_program_id]
#[account]
pub struct AdapterRecord {
    /// The on-chain program that implements the adapter
    pub program_id: Pubkey,
    /// Human-readable name (e.g. "Kamino USDC")
    pub name: [u8; 64],
    /// Protocol identifier (e.g. "kamino", "marginfi")
    pub protocol: [u8; 32],
    /// Underlying token mint (e.g. USDC)
    pub underlying_mint: Pubkey,
    /// Adapter category
    pub category: AdapterCategory,
    /// Current on-chain APY in basis points (updated by oracle or admin)
    pub apy_bps: u32,
    /// Total value locked routed through Dnipro (underlying tokens)
    pub tvl: u64,
    /// Whether the adapter is currently accepting deposits
    pub is_active: bool,
    /// Whether deposits are paused (emergency)
    pub deposits_paused: bool,
    /// Maximum deposit per user (0 = unlimited)
    pub max_deposit: u64,
    /// Minimum deposit amount
    pub min_deposit: u64,
    /// Unix timestamp of registration
    pub registered_at: i64,
    /// Last metadata update
    pub updated_at: i64,
    /// Authority who registered this adapter
    pub registered_by: Pubkey,
    /// IPFS CID or URL for extended metadata / audit report
    pub metadata_uri: [u8; 128],
    /// Risk score 0-100 (lower is safer)
    pub risk_score: u8,
    pub bump: u8,
    pub _reserved: [u8; 32],
}

impl AdapterRecord {
    pub const LEN: usize = 8
        + 32 + 64 + 32 + 32 + 1 + 4 + 8 + 1 + 1 + 8 + 8 + 8 + 8 + 32 + 128 + 1 + 1 + 32;
    pub const SEEDS: &'static [u8] = b"adapter";

    pub fn name_str(&self) -> &str {
        let end = self.name.iter().position(|&b| b == 0).unwrap_or(64);
        std::str::from_utf8(&self.name[..end]).unwrap_or("unknown")
    }

    pub fn protocol_str(&self) -> &str {
        let end = self.protocol.iter().position(|&b| b == 0).unwrap_or(32);
        std::str::from_utf8(&self.protocol[..end]).unwrap_or("unknown")
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum AdapterCategory {
    /// Lending/borrowing protocol (Kamino, MarginFi)
    Lending,
    /// Liquidity provision / AMM (Jupiter)
    Liquidity,
    /// Real-world asset / private credit (Maple)
    RealWorldAsset,
    /// Insurance fund / risk protocol (Drift)
    Insurance,
    /// Other / custom
    Other,
}

/// Governance proposal for timelock.
/// PDA: ["proposal", proposal_id]
#[account]
pub struct GovernanceProposal {
    pub id: u64,
    pub proposer: Pubkey,
    pub action: GovernanceAction,
    pub proposed_at: i64,
    pub executable_after: i64,
    pub executed: bool,
    pub bump: u8,
}

impl GovernanceProposal {
    pub const LEN: usize = 8 + 8 + 32 + 65 + 8 + 8 + 1 + 1;
    pub const SEEDS: &'static [u8] = b"proposal";
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub enum GovernanceAction {
    RegisterAdapter { program_id: Pubkey },
    DeactivateAdapter { program_id: Pubkey },
    UpdateTimelock { new_delay: i64 },
    TransferGovernance { new_governance: Pubkey },
}
