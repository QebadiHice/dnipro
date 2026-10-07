'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction } from '@solana/web3.js';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  Loader2,
  Radio,
  RefreshCw,
  Settings2,
  WalletCards,
} from 'lucide-react';
import { IconWallet, IconEmpty, ProtocolMark } from '@/components/icons/AdapterIcons';
import { cn, formatUsdc, formatAddress } from '@/lib/utils';
import { MOCK_ADAPTERS, MOCK_POSITIONS, PORTFOLIO_SUMMARY } from '@/lib/mockData';
import { useTransaction, isBusy, statusLabel } from '@/hooks/useTransaction';
import {
  LIVE_PROGRAMS,
  buildDepositIx,
  buildInitializeAdapterIx,
  buildInitializeDispatcherIx,
  buildInitializeRegistryIx,
  buildRegisterAdapterIx,
  buildWithdrawIx,
  explorerTx,
  liveBalances,
  liveSetupState,
} from '@/lib/liveDnipro';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type TabId = 'positions' | 'deposit' | 'withdraw';
type PreviewResult = { type: 'deposit' | 'withdraw'; message: string } | null;
type SetupState = Awaited<ReturnType<typeof liveSetupState>>;
type LiveBalances = Awaited<ReturnType<typeof liveBalances>>;

const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? 'devnet';
const LIVE_CONFIGURED = !!LIVE_PROGRAMS.dispatcher && !!LIVE_PROGRAMS.registry && !!LIVE_PROGRAMS.adapter;

const LIVE_ADAPTER = {
  id: 'live',
  programId: LIVE_PROGRAMS.adapter?.toBase58() ?? 'not-configured',
  programIdStatus: 'deployed' as const,
  integrationStatus: 'Live Devnet' as const,
  dataMode: 'On-chain' as const,
  name: 'Dnipro USDC Devnet Vault',
  protocol: 'dnipro',
  description:
    'Live Dnipro adapter-standard proof on Solana Devnet. Deposits move real test USDC into a program-controlled vault through the Dispatcher and can be withdrawn on-chain. It does not claim external protocol yield.',
  underlyingMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  underlyingSymbol: 'USDC',
  category: 4,
  categoryLabel: 'Live routing proof',
  apyBps: 0,
  apyPercent: '—',
  tvlFormatted: 'On-chain',
  tvlRaw: 0,
  isActive: true,
  depositsPaused: false,
  minDeposit: 100_000,
  maxDeposit: 0,
  riskScore: 0,
  riskLabel: 'Devnet' as const,
  withdrawalDelay: null,
  website: '#',
  docs: '/docs',
  auditUrl: '#',
  shareSymbol: 'USDC',
  exchangeRateBps: 10_000,
  icon: 'D',
};

const ROUTES = LIVE_CONFIGURED ? [LIVE_ADAPTER, ...MOCK_ADAPTERS] : MOCK_ADAPTERS;

const PORTFOLIO_HISTORY = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }),
  value: 7000 + Math.sin(i * 0.3) * 200 + i * 19,
}));

function toUsdcBaseUnits(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return BigInt(Math.round(n * 1_000_000));
}

export function DashboardClient() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const tx = useTransaction();

  const [activeTab, setActiveTab] = useState<TabId>('positions');
  const [selectedAdapterId, setSelectedAdapterId] = useState(LIVE_CONFIGURED ? 'live' : 'kamino');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [previewResult, setPreviewResult] = useState<PreviewResult>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [live, setLive] = useState<LiveBalances | null>(null);
  const [fallbackSol, setFallbackSol] = useState<number | null>(null);

  const selectedAdapter = ROUTES.find(a => a.id === selectedAdapterId) ?? ROUTES[0];
  const isLiveRoute = selectedAdapter.id === 'live';
  const samplePosition = MOCK_POSITIONS.find(p => p.adapterId === selectedAdapterId);

  const referencePreview = useMemo(() => {
    if (isLiveRoute) return null;
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const fee = amount * 0.003;
    return {
      fee,
      net: amount - fee,
      shares: ((amount - fee) * 10_000) / selectedAdapter.exchangeRateBps,
      annualYield: ((amount - fee) * selectedAdapter.apyBps) / 10_000,
    };
  }, [depositAmount, selectedAdapter, isLiveRoute]);

  const refreshAll = useCallback(async () => {
    if (!publicKey) return;
    setWalletLoading(true);
    try {
      if (LIVE_CONFIGURED) {
        const [setupState, balances] = await Promise.all([
          liveSetupState(connection),
          liveBalances(connection, publicKey),
        ]);
        setSetup(setupState);
        setLive(balances);
        setFallbackSol(balances.sol);
      } else {
        const lamports = await connection.getBalance(publicKey, 'confirmed');
        setFallbackSol(lamports / 1_000_000_000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWalletLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (connected && publicKey) void refreshAll();
  }, [connected, publicKey, refreshAll]);

  const sendSetupIx = useCallback(
    async (ix: ReturnType<typeof buildInitializeRegistryIx>) => {
      const transaction = new Transaction().add(ix);
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      await connection.confirmTransaction(signature, 'confirmed');
      return signature;
    },
    [connection, sendTransaction]
  );

  const initializeLiveDemo = useCallback(async () => {
    if (!publicKey || !LIVE_CONFIGURED) return;
    setSetupBusy(true);
    setSetupError(null);
    try {
      let state = await liveSetupState(connection);
      if (!state.registryReady) {
        await sendSetupIx(buildInitializeRegistryIx(publicKey));
        state = await liveSetupState(connection);
      }
      if (!state.dispatcherReady) {
        await sendSetupIx(buildInitializeDispatcherIx(publicKey));
        state = await liveSetupState(connection);
      }
      if (!state.adapterReady) {
        await sendSetupIx(buildInitializeAdapterIx(publicKey));
        state = await liveSetupState(connection);
      }
      if (!state.registered) {
        await sendSetupIx(buildRegisterAdapterIx(publicKey));
      }
      await refreshAll();
    } catch (err: any) {
      setSetupError(err?.message ?? String(err));
    } finally {
      setSetupBusy(false);
    }
  }, [connection, publicKey, refreshAll, sendSetupIx]);

  const runReferencePreview = useCallback(async (type: 'deposit' | 'withdraw') => {
    setPreviewBusy(true);
    setPreviewResult(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 450));
      setPreviewResult({
        type,
        message:
          type === 'deposit'
            ? 'Reference route preview generated. No transaction was broadcast.'
            : 'Reference withdrawal preview generated. No transaction was broadcast.',
      });
    } finally {
      setPreviewBusy(false);
    }
  }, []);

  const liveDeposit = useCallback(async () => {
    if (!publicKey || !setup?.ready) return;
    const base = toUsdcBaseUnits(depositAmount);
    if (!base) return;
    if ((live?.usdc ?? 0) + 1e-9 < Number(base) / 1e6) {
      tx.reset();
      return;
    }

    try {
      await tx.execute(async () => {
        const ixs = await buildDepositIx(connection, publicKey, base);
        return new Transaction().add(...ixs);
      });
      setDepositAmount('');
      await refreshAll();
    } catch {
      // useTransaction already exposes the wallet/program error.
    }
  }, [connection, depositAmount, live?.usdc, publicKey, refreshAll, setup?.ready, tx]);

  const liveWithdraw = useCallback(async () => {
    if (!publicKey || !setup?.ready) return;
    const base = toUsdcBaseUnits(withdrawAmount);
    if (!base) return;
    try {
      await tx.execute(async () => new Transaction().add(buildWithdrawIx(publicKey, base)));
      setWithdrawAmount('');
      await refreshAll();
    } catch {
      // useTransaction already exposes the wallet/program error.
    }
  }, [publicKey, refreshAll, setup?.ready, tx, withdrawAmount]);

  if (!connected) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-border text-dnipro-400">
            <IconWallet size={28} />
          </div>
          <span className="tag mb-4">Dnipro · {NETWORK}</span>
          <h1 className="heading-serif text-3xl mb-3">Connect a Solana wallet</h1>
          <p className="text-muted-foreground mb-4">
            Connect Phantom or Solflare to use the live Dnipro Devnet route and compare the reference protocol adapters through the same interface.
          </p>
          <p className="text-xs text-muted-foreground mb-8">
            The live route uses Devnet test USDC only. Reference protocol routes never broadcast transactions.
          </p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  const txBusy = isBusy(tx.state.status);
  const solBalance = live?.sol ?? fallbackSol;

  return (
    <div className="min-h-screen py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-semibold">Dnipro Dashboard</h1>
              <span className="text-[10px] uppercase tracking-wider border border-dnipro-400/30 bg-dnipro-400/5 text-dnipro-300 rounded-full px-2 py-1">
                live devnet + reference routes
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{formatAddress(publicKey!.toBase58(), 6)}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="surface rounded-md px-3 py-2 text-xs flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-dnipro-400" />
              <span className="text-muted-foreground">cluster</span>
              <span className="font-mono">{NETWORK}</span>
            </div>
            <div className="surface rounded-md px-3 py-2 text-xs flex items-center gap-2">
              <WalletCards className="h-3.5 w-3.5 text-dnipro-400" />
              <span className="text-muted-foreground">SOL</span>
              <span className="font-mono">{walletLoading ? '…' : solBalance == null ? '—' : solBalance.toFixed(4)}</span>
            </div>
            <div className="surface rounded-md px-3 py-2 text-xs flex items-center gap-2">
              <span className="text-muted-foreground">Devnet USDC</span>
              <span className="font-mono">{LIVE_CONFIGURED ? (live?.usdc ?? 0).toFixed(2) : 'adapter not set'}</span>
            </div>
            <button onClick={() => void refreshAll()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className={cn('h-4 w-4', walletLoading && 'animate-spin')} /> Refresh
            </button>
          </div>
        </div>

        {!LIVE_CONFIGURED ? (
          <div className="surface rounded-lg p-4 mb-8 border border-yellow-400/20 bg-yellow-400/[0.03]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium">One final deployment value is required</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dispatcher and Registry are configured. Deploy the included <code>devnet-vault-adapter</code> in Solana Playground, then set <code>NEXT_PUBLIC_LIVE_ADAPTER_PROGRAM_ID</code> in Vercel.
                </p>
              </div>
            </div>
          </div>
        ) : !setup?.ready ? (
          <div className="surface rounded-lg p-4 mb-8 border border-wheat-400/20 bg-wheat-400/[0.03]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Settings2 className="h-4 w-4 text-wheat-300 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-wheat-200">Initialize the live Devnet route</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    One-time setup creates the Registry record, Dispatcher state, USDC vault and adapter state. Your connected wallet becomes the Devnet admin.
                  </p>
                  {setupError && <p className="text-xs text-red-400 mt-2 break-all">{setupError}</p>}
                </div>
              </div>
              <button
                onClick={() => void initializeLiveDemo()}
                disabled={setupBusy}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold bg-wheat-400 text-river-ink hover:bg-wheat-300 disabled:opacity-40 flex items-center justify-center gap-2 shrink-0"
              >
                {setupBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Initializing…</> : 'Initialize live demo'}
              </button>
            </div>
          </div>
        ) : (
          <div className="surface rounded-lg p-4 mb-8 border border-dnipro-400/20 bg-dnipro-400/[0.03]">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-dnipro-300 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-dnipro-200">Live Dnipro route ready</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Deposits and withdrawals on the Dnipro USDC Devnet Vault are signed by your wallet, routed through the deployed Dispatcher, verified against Registry, and executed by the adapter program.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="surface rounded-lg p-5">
            <p className="text-xs text-muted-foreground mb-1">Your live Dnipro position</p>
            <p className="text-2xl font-semibold">{formatUsdc(live?.positionUsdc ?? 0)}</p>
          </div>
          <div className="surface rounded-lg p-5">
            <p className="text-xs text-muted-foreground mb-1">Live adapter vault</p>
            <p className="text-2xl font-semibold text-dnipro-300">{formatUsdc(live?.vaultUsdc ?? 0)}</p>
          </div>
          <div className="surface rounded-lg p-5">
            <p className="text-xs text-muted-foreground mb-1">Reference portfolio</p>
            <p className="text-2xl font-semibold text-wheat-200">{formatUsdc(PORTFOLIO_SUMMARY.totalValue / 1e6)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">sample visual only</p>
          </div>
        </div>

        <div className="surface rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Unified yield interface</h2>
              <p className="text-xs text-muted-foreground mt-1">One Dnipro UX across a live Devnet route and protocol reference adapters.</p>
            </div>
            <span className="text-xs text-wheat-300 bg-wheat-400/10 px-2 py-1 rounded-full">reference history</span>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={PORTFOLIO_HISTORY}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#666' }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 11, fill: '#666' }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(1)}K`} />
              <Tooltip contentStyle={{ background: '#0f2a26', border: '1px solid #1a3d39', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v.toFixed(0)}`, 'Reference value']} />
              <Area type="monotone" dataKey="value" stroke="#3aab9e" strokeWidth={2} fillOpacity={0.08} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Available routes</h2>
            {ROUTES.map(adapter => (
              <button
                key={adapter.id}
                onClick={() => {
                  setSelectedAdapterId(adapter.id);
                  setPreviewResult(null);
                  tx.reset();
                }}
                className={cn(
                  'w-full text-left surface rounded-xl p-4 border transition-all',
                  selectedAdapterId === adapter.id ? 'border-dnipro-400/60 bg-dnipro-900/30' : 'border-border hover:border-dnipro-400/30'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProtocolMark letter={adapter.icon} size={32} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{adapter.name}</div>
                      <div className="text-xs text-muted-foreground">{adapter.id === 'live' ? 'live · on-chain' : `reference · ${adapter.categoryLabel}`}</div>
                    </div>
                  </div>
                  <span className={cn('h-2 w-2 rounded-full shrink-0', adapter.id === 'live' && setup?.ready ? 'bg-dnipro-300' : 'bg-wheat-400/60')} />
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="surface rounded-xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ProtocolMark letter={selectedAdapter.icon} size={42} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-semibold">{selectedAdapter.name}</h2>
                        <span className={cn('text-[10px] uppercase rounded-full px-2 py-1 border', isLiveRoute ? 'text-dnipro-300 border-dnipro-400/30 bg-dnipro-400/5' : 'text-wheat-300 border-wheat-400/30 bg-wheat-400/5')}>
                          {selectedAdapter.integrationStatus}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{selectedAdapter.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">APY</div>
                    <div className="font-mono text-dnipro-300">{selectedAdapter.apyPercent}</div>
                  </div>
                </div>
              </div>

              <div className="flex border-b border-border">
                {[
                  { id: 'positions' as TabId, label: 'Position', icon: WalletCards },
                  { id: 'deposit' as TabId, label: isLiveRoute ? 'Deposit' : 'Deposit Preview', icon: ArrowDownToLine },
                  { id: 'withdraw' as TabId, label: isLiveRoute ? 'Withdraw' : 'Withdraw Preview', icon: ArrowUpFromLine },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setPreviewResult(null);
                      tx.reset();
                    }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors',
                      activeTab === tab.id ? 'bg-dnipro-900/50 text-dnipro-200 border-b-2 border-dnipro-400' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <tab.icon className="h-4 w-4" /> {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'positions' && (
                  isLiveRoute ? (
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-3 gap-4">
                        {[
                          ['Wallet USDC', formatUsdc(live?.usdc ?? 0)],
                          ['Dnipro position', formatUsdc(live?.positionUsdc ?? 0)],
                          ['Adapter vault', formatUsdc(live?.vaultUsdc ?? 0)],
                        ].map(([label, value]) => (
                          <div key={label} className="bg-secondary/40 rounded-xl p-4">
                            <div className="text-xs text-muted-foreground mb-1">{label}</div>
                            <div className="font-mono font-medium">{value}</div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This position is read from Solana Devnet. The live vault proves the Dnipro routing standard; it intentionally reports no external-protocol yield.
                      </p>
                    </div>
                  ) : samplePosition ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs text-wheat-300 bg-wheat-400/5 border border-wheat-400/20 rounded-xl p-3">
                        <FlaskConical className="h-3.5 w-3.5" /> This protocol position remains reference data until its protocol-specific adapter is deployed.
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {[
                          ['Sample deposited', formatUsdc(samplePosition.depositedAmount / 1e6)],
                          ['Sample value', formatUsdc(samplePosition.currentValue / 1e6)],
                          ['Sample shares', `${(samplePosition.shares / 1e6).toFixed(4)} ${selectedAdapter.shareSymbol}`],
                          ['Sample PnL', `${formatUsdc(samplePosition.pnl / 1e6)} (${samplePosition.pnlPercent})`],
                        ].map(([label, value]) => (
                          <div key={label} className="bg-secondary/40 rounded-xl p-4">
                            <div className="text-xs text-muted-foreground mb-1">{label}</div>
                            <div className="font-mono font-medium">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12"><IconEmpty size={36} className="mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">No reference position for this route</p></div>
                  )
                )}

                {activeTab === 'deposit' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">USDC amount</label>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={e => {
                          setDepositAmount(e.target.value);
                          setPreviewResult(null);
                          tx.reset();
                        }}
                        placeholder="5.00"
                        min="0"
                        className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-dnipro-500/50 transition-all"
                      />
                    </div>

                    {isLiveRoute ? (
                      <div className="bg-secondary/40 rounded-xl p-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Wallet balance</span><span>{formatUsdc(live?.usdc ?? 0)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Dnipro fee</span><span className="text-dnipro-300">0.00% on Devnet</span></div>
                        <div className="flex justify-between border-t border-border/50 pt-2"><span className="text-muted-foreground">Route</span><span className="font-mono">Dispatcher → Registry → Adapter vault</span></div>
                      </div>
                    ) : referencePreview ? (
                      <div className="bg-secondary/40 rounded-xl p-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Reference fee model (0.30%)</span><span className="text-yellow-400">-{formatUsdc(referencePreview.fee)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Net amount</span><span className="font-medium">{formatUsdc(referencePreview.net)}</span></div>
                        <div className="flex justify-between border-t border-border/50 pt-2"><span className="text-muted-foreground">Sample shares</span><span className="text-dnipro-300 font-mono">~{referencePreview.shares.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Sample annual yield</span><span className="text-dnipro-300">+{formatUsdc(referencePreview.annualYield)}/yr</span></div>
                      </div>
                    ) : null}

                    {selectedAdapter.withdrawalDelay && !isLiveRoute && (
                      <div className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-3">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>Reference model includes a <strong>{selectedAdapter.withdrawalDelay}</strong> withdrawal cooldown.</span>
                      </div>
                    )}

                    {isLiveRoute && tx.state.status !== 'idle' && (
                      <div className={cn('rounded-xl p-3 text-xs border', tx.state.status === 'error' ? 'border-red-400/20 bg-red-400/5 text-red-300' : 'border-dnipro-400/20 bg-dnipro-400/5 text-dnipro-300')}>
                        <div className="flex items-start gap-2">
                          {txBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin mt-0.5" /> : <CheckCircle2 className="h-3.5 w-3.5 mt-0.5" />}
                          <div className="min-w-0">
                            <div>{statusLabel[tx.state.status]}</div>
                            {tx.state.error && <div className="mt-1 break-all">{tx.state.error}</div>}
                            {tx.state.signature && (
                              <a href={explorerTx(tx.state.signature)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 underline">
                                View real transaction on Solscan <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {!isLiveRoute && previewResult?.type === 'deposit' && (
                      <div className="flex items-start gap-2 text-xs text-dnipro-300 bg-dnipro-400/5 border border-dnipro-400/20 rounded-xl p-3">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{previewResult.message}</span>
                      </div>
                    )}

                    <button
                      onClick={() => isLiveRoute ? void liveDeposit() : void runReferencePreview('deposit')}
                      disabled={
                        isLiveRoute
                          ? txBusy || !setup?.ready || !toUsdcBaseUnits(depositAmount) || Number(depositAmount) > (live?.usdc ?? 0)
                          : previewBusy || !referencePreview
                      }
                      className={cn(
                        'w-full rounded-xl py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2',
                        (isLiveRoute ? txBusy || !setup?.ready || !toUsdcBaseUnits(depositAmount) || Number(depositAmount) > (live?.usdc ?? 0) : previewBusy || !referencePreview)
                          ? 'bg-wheat-900/30 text-wheat-200/30 cursor-not-allowed'
                          : 'bg-wheat-400 text-river-ink hover:bg-wheat-300'
                      )}
                    >
                      {isLiveRoute
                        ? txBusy
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> {statusLabel[tx.state.status]}</>
                          : <><ArrowDownToLine className="h-4 w-4" /> Deposit {depositAmount || '0'} USDC on-chain</>
                        : previewBusy
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating preview…</>
                          : <><ArrowDownToLine className="h-4 w-4" /> Preview deposit</>}
                    </button>
                  </div>
                )}

                {activeTab === 'withdraw' && (
                  <div className="space-y-4">
                    {isLiveRoute ? (
                      <>
                        <div className="bg-secondary/40 rounded-xl p-4 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Live Dnipro position</span><span className="font-mono text-dnipro-300">{formatUsdc(live?.positionUsdc ?? 0)}</span></div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">USDC to withdraw</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={withdrawAmount}
                              onChange={e => {
                                setWithdrawAmount(e.target.value);
                                tx.reset();
                              }}
                              placeholder="0.00"
                              min="0"
                              className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-dnipro-500/50 transition-all"
                            />
                            <button onClick={() => setWithdrawAmount((live?.positionUsdc ?? 0).toString())} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-dnipro-400 hover:text-dnipro-300">MAX</button>
                          </div>
                        </div>

                        {tx.state.status !== 'idle' && (
                          <div className={cn('rounded-xl p-3 text-xs border', tx.state.status === 'error' ? 'border-red-400/20 bg-red-400/5 text-red-300' : 'border-dnipro-400/20 bg-dnipro-400/5 text-dnipro-300')}>
                            <div className="flex items-start gap-2">
                              {txBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin mt-0.5" /> : <CheckCircle2 className="h-3.5 w-3.5 mt-0.5" />}
                              <div className="min-w-0">
                                <div>{statusLabel[tx.state.status]}</div>
                                {tx.state.error && <div className="mt-1 break-all">{tx.state.error}</div>}
                                {tx.state.signature && (
                                  <a href={explorerTx(tx.state.signature)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 underline">
                                    View real transaction on Solscan <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => void liveWithdraw()}
                          disabled={txBusy || !setup?.ready || !toUsdcBaseUnits(withdrawAmount) || Number(withdrawAmount) > (live?.positionUsdc ?? 0)}
                          className={cn(
                            'w-full rounded-xl py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 border',
                            txBusy || !setup?.ready || !toUsdcBaseUnits(withdrawAmount) || Number(withdrawAmount) > (live?.positionUsdc ?? 0)
                              ? 'bg-secondary text-muted-foreground/40 cursor-not-allowed border-border'
                              : 'bg-secondary text-foreground hover:bg-secondary/60 border-border hover:border-dnipro-400/40'
                          )}
                        >
                          {txBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> {statusLabel[tx.state.status]}</> : <><ArrowUpFromLine className="h-4 w-4" /> Withdraw {withdrawAmount || '0'} USDC on-chain</>}
                        </button>
                      </>
                    ) : samplePosition ? (
                      <>
                        <div className="bg-secondary/40 rounded-xl p-4 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Sample shares</span><span className="font-mono text-dnipro-300">{(samplePosition.shares / 1e6).toFixed(4)} {selectedAdapter.shareSymbol}</span></div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Shares to preview</label>
                          <input
                            type="number"
                            value={withdrawAmount}
                            onChange={e => { setWithdrawAmount(e.target.value); setPreviewResult(null); }}
                            placeholder="0.00"
                            min="0"
                            className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-dnipro-500/50 transition-all"
                          />
                        </div>
                        {previewResult?.type === 'withdraw' && (
                          <div className="flex items-start gap-2 text-xs text-dnipro-300 bg-dnipro-400/5 border border-dnipro-400/20 rounded-xl p-3">
                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{previewResult.message}</span>
                          </div>
                        )}
                        <button
                          onClick={() => void runReferencePreview('withdraw')}
                          disabled={previewBusy || !withdrawAmount || Number(withdrawAmount) <= 0}
                          className={cn(
                            'w-full rounded-xl py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 border',
                            previewBusy || !withdrawAmount || Number(withdrawAmount) <= 0
                              ? 'bg-secondary text-muted-foreground/40 cursor-not-allowed border-border'
                              : 'bg-secondary text-foreground hover:bg-secondary/60 border-border hover:border-dnipro-400/40'
                          )}
                        >
                          {previewBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating preview…</> : <><ArrowUpFromLine className="h-4 w-4" /> Preview withdrawal</>}
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-12"><IconEmpty size={36} className="mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">No reference position to preview</p></div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground px-1">
              The Dnipro USDC Devnet Vault is a genuine on-chain routing proof using test USDC. Kamino, MarginFi, Jupiter, Maple and Drift remain clearly labelled reference integrations until their protocol-specific CPIs are implemented and verified.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
