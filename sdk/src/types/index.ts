import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface ProgramIds {
  dispatcher: PublicKey;
  registry: PublicKey;
}

export enum AdapterCategory {
  Lending = 0,
  Liquidity = 1,
  RealWorldAsset = 2,
  Insurance = 3,
  Other = 4,
}

/**
 * Registry record exposed by Dnipro v2.
 * Legacy display fields are retained with neutral values so the existing CLI
 * and documentation UI remain source-compatible while protocol-specific data
 * is supplied by adapter metadata/indexing.
 */
export interface AdapterInfo {
  programId: PublicKey;
  underlyingMint: PublicKey;
  adapterState: PublicKey;
  adapterVault: PublicKey;
  adapterVaultAuthority: PublicKey;
  isActive: boolean;
  name: string;

  protocol: string;
  category: AdapterCategory;
  apyBps: number;
  tvl: BN;
  depositsPaused: boolean;
  maxDeposit: BN;
  minDeposit: BN;
  registeredAt: number;
  updatedAt: number;
  registeredBy: PublicKey;
  metadataUri: string;
  riskScore: number;
}

export interface AdapterDisplay extends AdapterInfo {
  apyPercent: string;
  tvlFormatted: string;
  categoryLabel: string;
  riskLabel: 'Low' | 'Medium' | 'High';
  withdrawalDelay?: string;
}

export interface Position {
  owner: PublicKey;
  adapterProgramId: PublicKey;
  underlyingMint: PublicKey;
  depositedAmount: BN;
  shares: BN;
  feesPaid: BN;
  openedAt: number;
  lastUpdatedAt: number;
  isActive: boolean;
  publicKey: PublicKey;
}

export interface PositionWithValue extends Position {
  currentValue: BN;
  pnl: BN;
  pnlPercent: string;
  adapterInfo?: AdapterDisplay;
}

export interface DispatcherConfig {
  admin: PublicKey;
  registryProgram: PublicKey;
  paused: boolean;
  bump: number;
  authorityBump: number;

  // Compatibility fields for v0.1 callers. Devnet v2 currently charges no fee.
  feeBps: number;
  feeRecipient: PublicKey;
  totalDepositsUsd: BN;
  totalWithdrawalsUsd: BN;
  activePositions: BN;
  version: number;
}

export interface RegistryConfig {
  governance: PublicKey;
  adapterCount: number;
  bump: number;

  // Compatibility fields retained for existing callers.
  pendingGovernance: PublicKey | null;
  timelockDelay: number;
  activeCount: number;
  version: number;
}

export interface DepositParams {
  amount: BN;
  minSharesOut?: BN;
  slippageBps?: number;
}

export interface WithdrawParams {
  /** v2 withdrawal amount in underlying base units. */
  amount?: BN;
  /** @deprecated v0.1 name; treated as amount by v2. */
  shares: BN;
  minAmountOut?: BN;
  slippageBps?: number;
}

export interface LiveRouteAccounts {
  adapterState: PublicKey;
  adapterVault: PublicKey;
  adapterVaultAuthority: PublicKey;
}

export interface DepositEvent {
  user: PublicKey;
  adapterProgramId: PublicKey;
  underlyingMint: PublicKey;
  amount: BN;
  sharesReceived: BN;
  feePaid: BN;
  timestamp: number;
  txSignature: string;
}

export interface WithdrawEvent {
  user: PublicKey;
  adapterProgramId: PublicKey;
  underlyingMint: PublicKey;
  sharesBurned: BN;
  amountReceived: BN;
  feePaid: BN;
  timestamp: number;
  txSignature: string;
}

export interface DniproClientOptions {
  programIds?: Partial<ProgramIds>;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
}

export interface SimulationResult {
  estimatedOutput: BN;
  estimatedFee: BN;
  priceImpactBps: number;
  minOutput: BN;
  warnings: string[];
}
