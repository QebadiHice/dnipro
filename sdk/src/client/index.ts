// sdk/src/client/index.ts
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SendOptions,
  Signer,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import BN from 'bn.js';
import {
  ADAPTER_PROGRAM_IDS,
  USDC_MINT,
  ADAPTER_METADATA,
  BPS_DENOMINATOR,
  USDC_DECIMALS,
  USDC_BASE,
} from '../constants';
import {
  fetchDispatcherConfig,
  fetchRegistryConfig,
  fetchAllAdapters,
  fetchPosition,
  fetchAllPositions,
  fetchAdapterRecord,
} from '../accounts';
import {
  buildDepositIx,
  buildWithdrawIx,
  buildCurrentValueIx,
} from '../instructions';
import type {
  DniproClientOptions,
  AdapterInfo,
  AdapterDisplay,
  Position,
  PositionWithValue,
  DispatcherConfig,
  RegistryConfig,
  DepositParams,
  WithdrawParams,
  SimulationResult,
} from '../types';
import { formatUsdc, bpsToPercent, riskLabel } from '../utils';

export class DniproClient {
  public readonly connection: Connection;
  private readonly opts: Required<DniproClientOptions>;

  constructor(connection: Connection, opts: DniproClientOptions = {}) {
    this.connection = connection;
    this.opts = {
      programIds: opts.programIds ?? {},
      commitment: opts.commitment ?? 'confirmed',
      preflightCommitment: opts.preflightCommitment ?? 'confirmed',
    };
  }

  // ── Config fetchers ───────────────────────────────────────────────────────

  async getDispatcherConfig(): Promise<DispatcherConfig | null> {
    return fetchDispatcherConfig(this.connection);
  }

  async getRegistryConfig(): Promise<RegistryConfig | null> {
    return fetchRegistryConfig(this.connection);
  }

  // ── Adapter discovery ─────────────────────────────────────────────────────

  async getAllAdapters(): Promise<AdapterDisplay[]> {
    const programIds = Object.values(ADAPTER_PROGRAM_IDS);
    const adapters = await fetchAllAdapters(this.connection, programIds);
    return adapters.map(a => this.enrichAdapter(a));
  }

  async getAdapter(programId: PublicKey): Promise<AdapterDisplay | null> {
    const adapter = await fetchAdapterRecord(this.connection, programId);
    if (!adapter) return null;
    return this.enrichAdapter(adapter);
  }

  async getActiveAdapters(): Promise<AdapterDisplay[]> {
    const all = await this.getAllAdapters();
    return all.filter(a => a.isActive && !a.depositsPaused);
  }

  private enrichAdapter(a: AdapterInfo): AdapterDisplay {
    const metaKey = a.protocol as keyof typeof ADAPTER_METADATA;
    const meta = ADAPTER_METADATA[metaKey];
    return {
      ...a,
      apyPercent: bpsToPercent(a.apyBps),
      tvlFormatted: formatUsdc(a.tvl),
      categoryLabel: this.categoryLabel(a.category),
      riskLabel: riskLabel(a.riskScore),
      withdrawalDelay: meta?.withdrawalDelay ?? undefined,
    };
  }

  private categoryLabel(category: number): string {
    return ['Lending', 'Liquidity', 'Real World Asset', 'Insurance', 'Other'][category] ?? 'Unknown';
  }

  // ── Position management ───────────────────────────────────────────────────

  async getPosition(user: PublicKey, adapterProgramId: PublicKey): Promise<Position | null> {
    return fetchPosition(this.connection, user, adapterProgramId);
  }

  async getAllPositions(user: PublicKey): Promise<PositionWithValue[]> {
    const programIds = Object.values(ADAPTER_PROGRAM_IDS);
    const [positions, adapters] = await Promise.all([
      fetchAllPositions(this.connection, user, programIds),
      this.getAllAdapters(),
    ]);

    const adapterMap = new Map(adapters.map(a => [a.programId.toBase58(), a]));

    return positions.map(p => {
      const adapterInfo = adapterMap.get(p.adapterProgramId.toBase58());
      const currentValue = p.depositedAmount; // simplified; in prod CPI adapter
      const pnl = currentValue.sub(p.depositedAmount);
      const pnlPct = p.depositedAmount.gtn(0)
        ? pnl.muln(10000).div(p.depositedAmount)
        : new BN(0);

      return {
        ...p,
        currentValue,
        pnl,
        pnlPercent: (Number(pnlPct.toString()) / 100).toFixed(2) + '%',
        adapterInfo: adapterInfo!,
      };
    });
  }

  // ── Deposit ───────────────────────────────────────────────────────────────

  async simulateDeposit(
    adapterProgramId: PublicKey,
    amount: BN
  ): Promise<SimulationResult> {
    const config = await this.getDispatcherConfig();
    const feeBps = config?.feeBps ?? 30;

    const fee = amount.muln(feeBps).divn(BPS_DENOMINATOR);
    const netAmount = amount.sub(fee);
    const warnings: string[] = [];

    if (amount.ltn(1_000_000)) {
      warnings.push('Amount below $1 USDC — gas costs may exceed yield.');
    }

    return {
      estimatedOutput: netAmount,
      estimatedFee: fee,
      priceImpactBps: 0, // lending adapters have no price impact
      minOutput: netAmount.muln(9950).divn(10000), // 0.5% slippage
      warnings,
    };
  }

  buildDepositTransaction(params: {
    user: PublicKey;
    adapterProgramId: PublicKey;
    underlyingMint: PublicKey;
    adapterVault: PublicKey;
    feeRecipientAccount: PublicKey;
    deposit: DepositParams;
  }): Transaction {
    const tx = new Transaction();

    // Priority fee
    tx.add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 })
    );
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 })
    );

    tx.add(buildDepositIx(params));
    return tx;
  }

  // ── Withdraw ──────────────────────────────────────────────────────────────

  async simulateWithdraw(
    adapterProgramId: PublicKey,
    shares: BN
  ): Promise<SimulationResult> {
    const config = await this.getDispatcherConfig();
    const feeBps = config?.feeBps ?? 30;
    const fee = shares.muln(feeBps).divn(BPS_DENOMINATOR);
    const netAmount = shares.sub(fee);

    return {
      estimatedOutput: netAmount,
      estimatedFee: fee,
      priceImpactBps: 0,
      minOutput: netAmount.muln(9950).divn(10000),
      warnings: [],
    };
  }

  buildWithdrawTransaction(params: {
    user: PublicKey;
    adapterProgramId: PublicKey;
    underlyingMint: PublicKey;
    adapterVault: PublicKey;
    feeRecipientAccount: PublicKey;
    withdraw: WithdrawParams;
  }): Transaction {
    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 }));
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
    tx.add(buildWithdrawIx(params));
    return tx;
  }

  // ── Portfolio summary ─────────────────────────────────────────────────────

  async getPortfolioSummary(user: PublicKey) {
    const positions = await this.getAllPositions(user);

    const totalDeposited = positions.reduce(
      (sum, p) => sum.add(p.depositedAmount), new BN(0)
    );
    const totalValue = positions.reduce(
      (sum, p) => sum.add(p.currentValue), new BN(0)
    );
    const totalPnl = totalValue.sub(totalDeposited);

    return {
      positions,
      totalDeposited,
      totalValue,
      totalPnl,
      totalDepositedFormatted: formatUsdc(totalDeposited),
      totalValueFormatted: formatUsdc(totalValue),
      totalPnlFormatted: formatUsdc(totalPnl),
      positionCount: positions.length,
    };
  }
}
