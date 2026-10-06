// sdk/src/types/index.ts
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

// ── Program IDs ──────────────────────────────────────────────────────────────

export interface ProgramIds {
  dispatcher: PublicKey;
  registry: PublicKey;
}

// ── Adapter ──────────────────────────────────────────────────────────────────

export enum AdapterCategory {
  Lending = 0,
  Liquidity = 1,
  RealWorldAsset = 2,
  Insurance = 3,
  Other = 4,
}

export interface AdapterInfo {
  programId: PublicKey;
  name: string;
  protocol: string;
  underlyingMint: PublicKey;
  category: AdapterCategory;
  apyBps: number;
  tvl: BN;
  isActive: boolean;
  depositsPaused: boolean;
  maxDeposit: BN;
  minDeposit: BN;
  registeredAt: number;
  updatedAt: number;
  registeredBy: PublicKey;
  metadataUri: string;
  riskScore: number;
}

// Augmented with computed display fields
export interface AdapterDisplay extends AdapterInfo {
  apyPercent: string;
  tvlFormatted: string;
  categoryLabel: string;
  riskLabel: 'Low' | 'Medium' | 'High';
  withdrawalDelay?: string; // e.g. "7 days" for Maple
}

// ── Position ─────────────────────────────────────────────────────────────────

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
  adapterInfo: AdapterDisplay;
}

// ── Dispatcher Config ────────────────────────────────────────────────────────

export interface DispatcherConfig {
  admin: PublicKey;
  registryProgram: PublicKey;
  feeBps: number;
  feeRecipient: PublicKey;
  paused: boolean;
  totalDepositsUsd: BN;
  totalWithdrawalsUsd: BN;
  activePositions: BN;
  version: number;
}

// ── Registry Config ───────────────────────────────────────────────────────────

export interface RegistryConfig {
  governance: PublicKey;
  pendingGovernance: PublicKey | null;
  timelockDelay: number;
  adapterCount: number;
  activeCount: number;
  version: number;
}

// ── Instructions ─────────────────────────────────────────────────────────────

export interface DepositParams {
  amount: BN;
  minSharesOut?: BN;
  slippageBps?: number; // default 50 = 0.5%
}

export interface WithdrawParams {
  shares: BN;            // 0 = withdraw all
  minAmountOut?: BN;
  slippageBps?: number;
}

// ── Events ────────────────────────────────────────────────────────────────────

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

// ── SDK Options ───────────────────────────────────────────────────────────────

export interface DniproClientOptions {
  programIds?: Partial<ProgramIds>;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
}

// ── Simulation result ─────────────────────────────────────────────────────────

export interface SimulationResult {
  estimatedOutput: BN;
  estimatedFee: BN;
  priceImpactBps: number;
  minOutput: BN;
  warnings: string[];
}
