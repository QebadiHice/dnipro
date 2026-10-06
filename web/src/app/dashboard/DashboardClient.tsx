'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Clock,
  FlaskConical,
  Loader2,
  RefreshCw,
  Radio,
  WalletCards,
} from 'lucide-react';
import { IconWallet, IconEmpty, ProtocolMark } from '@/components/icons/AdapterIcons';
import { cn, formatUsdc, formatAddress } from '@/lib/utils';
import { MOCK_ADAPTERS, MOCK_POSITIONS, PORTFOLIO_SUMMARY } from '@/lib/mockData';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type TabId = 'positions' | 'deposit' | 'withdraw';
type PreviewResult = { type: 'deposit' | 'withdraw'; message: string } | null;

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? 'devnet';

const PORTFOLIO_HISTORY = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  value: 7000 + Math.sin(i * 0.3) * 200 + i * 19,
}));

export function DashboardClient() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();

  const [activeTab, setActiveTab] = useState<TabId>('positions');
  const [selectedAdapterId, setSelectedAdapterId] = useState('kamino');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const selectedAdapter = MOCK_ADAPTERS.find(a => a.id === selectedAdapterId)!;
  const userPosition = MOCK_POSITIONS.find(p => p.adapterId === selectedAdapterId);

  const depositPreview = useMemo(() => {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const fee = amount * 0.003;
    return {
      fee,
      net: amount - fee,
      shares: (amount - fee) * 10000 / selectedAdapter.exchangeRateBps,
      annualYield: (amount - fee) * selectedAdapter.apyBps / 10000,
    };
  }, [depositAmount, selectedAdapter]);

  const refreshWallet = useCallback(async () => {
    if (!publicKey) return;
    setBalanceLoading(true);
    try {
      const lamports = await connection.getBalance(publicKey, 'confirmed');
      setSolBalance(lamports / 1_000_000_000);
    } catch {
      setSolBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (connected && publicKey) refreshWallet();
  }, [connected, publicKey, refreshWallet]);

  const runPreview = useCallback(async (type: 'deposit' | 'withdraw') => {
    setIsProcessing(true);
    setPreviewResult(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 650));
      setPreviewResult({
        type,
        message: type === 'deposit'
          ? 'Deposit preview generated. No transaction was broadcast.'
          : 'Withdrawal preview generated. No transaction was broadcast.',
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  if (!connected) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-border text-dnipro-400">
            <IconWallet size={28} />
          </div>
          <span className="tag mb-4">reference app · {NETWORK}</span>
          <h1 className="heading-serif text-3xl mb-3">Connect a Solana wallet</h1>
          <p className="text-muted-foreground mb-4">
            The wallet connection and SOL balance are live. Portfolio, APY, and transaction flows remain clearly labelled sample data until the Dnipro programs are deployed.
          </p>
          <p className="text-xs text-muted-foreground mb-8">
            Connecting does not move funds. Preview actions do not broadcast transactions.
          </p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-semibold">Reference Dashboard</h1>
              <span className="text-[10px] uppercase tracking-wider border border-wheat-400/30 bg-wheat-400/5 text-wheat-300 rounded-full px-2 py-1">demo data</span>
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
              <span className="text-muted-foreground">wallet SOL</span>
              <span className="font-mono">{balanceLoading ? '…' : solBalance == null ? 'unavailable' : solBalance.toFixed(4)}</span>
            </div>
            <button onClick={refreshWallet} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className={cn('h-4 w-4', balanceLoading && 'animate-spin')} /> Refresh
            </button>
          </div>
        </div>

        <div className="surface rounded-lg p-4 mb-8 border border-wheat-400/20 bg-wheat-400/[0.03]">
          <div className="flex items-start gap-3">
            <FlaskConical className="h-4 w-4 text-wheat-300 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-wheat-200">Reference mode is explicit</div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Portfolio values and APY figures below are sample data for UX testing. Deposit/withdraw buttons generate local previews only. Real Solscan links should appear only after a deployed Dnipro transaction is actually confirmed.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="surface rounded-lg p-5">
            <p className="text-xs text-muted-foreground mb-1">Sample Deposited</p>
            <p className="text-2xl font-semibold">{formatUsdc(PORTFOLIO_SUMMARY.totalDeposited / 1e6)}</p>
          </div>
          <div className="surface rounded-lg p-5">
            <p className="text-xs text-muted-foreground mb-1">Sample Current Value</p>
            <p className="text-2xl font-semibold text-dnipro-300">{formatUsdc(PORTFOLIO_SUMMARY.totalValue / 1e6)}</p>
          </div>
          <div className="surface rounded-lg p-5">
            <p className="text-xs text-muted-foreground mb-1">Sample PnL</p>
            <p className="text-2xl font-semibold text-dnipro-300">
              +{formatUsdc(PORTFOLIO_SUMMARY.totalPnl / 1e6)}
              <span className="text-base ml-2 text-dnipro-300/70">{PORTFOLIO_SUMMARY.pnlPercent}</span>
            </p>
          </div>
        </div>

        <div className="surface rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Sample portfolio visualisation</h2>
              <p className="text-xs text-muted-foreground mt-1">Deterministic demo series — not wallet history.</p>
            </div>
            <span className="text-xs text-wheat-300 bg-wheat-400/10 px-2 py-1 rounded-full">sample data</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={PORTFOLIO_HISTORY}>
              <defs>
                <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3aab9e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3aab9e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#666' }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 11, fill: '#666' }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(1)}K`} />
              <Tooltip contentStyle={{ background: '#0f2a26', border: '1px solid #1a3d39', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v.toFixed(0)}`, 'Sample value']} />
              <Area type="monotone" dataKey="value" stroke="#3aab9e" strokeWidth={2} fill="url(#portfolioGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Select Adapter</h2>
            {MOCK_ADAPTERS.map(adapter => (
              <button
                key={adapter.id}
                onClick={() => { setSelectedAdapterId(adapter.id); setPreviewResult(null); }}
                className={cn(
                  'w-full text-left surface rounded-xl p-4 transition-all border',
                  selectedAdapterId === adapter.id ? 'border-dnipro-500/50 bg-dnipro-500/10' : 'border-transparent hover:border-border'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ProtocolMark letter={adapter.icon} className="text-dnipro-400" size={28} />
                    <div>
                      <div className="text-sm font-medium">{adapter.name}</div>
                      <div className="text-xs text-muted-foreground">reference · {adapter.categoryLabel}</div>
                    </div>
                  </div>
                  {selectedAdapterId === adapter.id && <div className="h-2 w-2 rounded-full bg-dnipro-400" />}
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="surface rounded-lg p-5">
              <div className="flex items-start justify-between mb-4 gap-4">
                <div className="flex items-center gap-3">
                  <ProtocolMark letter={selectedAdapter.icon} className="text-dnipro-400" size={40} />
                  <div>
                    <h2 className="text-lg font-semibold">{selectedAdapter.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full border border-wheat-400/30 text-wheat-300">reference adapter</span>
                      <span className="text-xs text-muted-foreground">sample APY {selectedAdapter.apyPercent}</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground">pre-deploy</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div><div className="text-muted-foreground text-xs mb-0.5">Asset</div><div className="font-medium">{selectedAdapter.underlyingSymbol}</div></div>
                <div><div className="text-muted-foreground text-xs mb-0.5">Share model</div><div className="font-medium font-mono text-dnipro-300">{selectedAdapter.shareSymbol}</div></div>
                <div><div className="text-muted-foreground text-xs mb-0.5">Min model</div><div className="font-medium">{formatUsdc(selectedAdapter.minDeposit / 1e6)}</div></div>
                <div><div className="text-muted-foreground text-xs mb-0.5">Withdrawal</div><div className="font-medium">{selectedAdapter.withdrawalDelay ?? 'Instant model'}</div></div>
              </div>

              <p className="text-xs text-muted-foreground mt-4 leading-relaxed">{selectedAdapter.description}</p>
            </div>

            <div className="surface rounded-lg overflow-hidden">
              <div className="flex border-b border-border/50">
                {([
                  { id: 'positions', label: 'Sample Position', icon: IconWallet },
                  { id: 'deposit', label: 'Deposit Preview', icon: ArrowDownToLine },
                  { id: 'withdraw', label: 'Withdraw Preview', icon: ArrowUpFromLine },
                ] as { id: TabId; label: string; icon: any }[]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setPreviewResult(null); }}
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
                  userPosition ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs text-wheat-300 bg-wheat-400/5 border border-wheat-400/20 rounded-xl p-3">
                        <FlaskConical className="h-3.5 w-3.5" /> This position is sample data, not a wallet balance.
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {[
                          ['Deposited', formatUsdc(userPosition.depositedAmount / 1e6)],
                          ['Sample value', formatUsdc(userPosition.currentValue / 1e6)],
                          ['Shares', `${(userPosition.shares / 1e6).toFixed(4)} ${selectedAdapter.shareSymbol}`],
                          ['Sample PnL', `${formatUsdc(userPosition.pnl / 1e6)} (${userPosition.pnlPercent})`],
                        ].map(([label, value]) => (
                          <div key={label} className="bg-secondary/40 rounded-xl p-4">
                            <div className="text-xs text-muted-foreground mb-1">{label}</div>
                            <div className="font-mono font-medium">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12"><IconEmpty size={36} className="mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">No sample position for this adapter</p></div>
                  )
                )}

                {activeTab === 'deposit' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">USDC amount</label>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={e => { setDepositAmount(e.target.value); setPreviewResult(null); }}
                        placeholder="100.00"
                        min="0"
                        className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-dnipro-500/50 transition-all"
                      />
                    </div>

                    {depositPreview && (
                      <div className="bg-secondary/40 rounded-xl p-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Fee model (0.30%)</span><span className="text-yellow-400">-{formatUsdc(depositPreview.fee)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Net amount</span><span className="font-medium">{formatUsdc(depositPreview.net)}</span></div>
                        <div className="flex justify-between border-t border-border/50 pt-2"><span className="text-muted-foreground">Sample shares</span><span className="text-dnipro-300 font-mono">~{depositPreview.shares.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Sample annual yield</span><span className="text-dnipro-300">+{formatUsdc(depositPreview.annualYield)}/yr</span></div>
                      </div>
                    )}

                    {selectedAdapter.withdrawalDelay && (
                      <div className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-3">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>The reference model includes a <strong>{selectedAdapter.withdrawalDelay}</strong> withdrawal cooldown.</span>
                      </div>
                    )}

                    {previewResult?.type === 'deposit' && (
                      <div className="flex items-start gap-2 text-xs text-dnipro-300 bg-dnipro-400/5 border border-dnipro-400/20 rounded-xl p-3">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{previewResult.message}</span>
                      </div>
                    )}

                    <button
                      onClick={() => runPreview('deposit')}
                      disabled={isProcessing || !depositPreview}
                      className={cn(
                        'w-full rounded-xl py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2',
                        isProcessing || !depositPreview ? 'bg-wheat-900/30 text-wheat-200/30 cursor-not-allowed' : 'bg-wheat-400 text-river-ink hover:bg-wheat-300'
                      )}
                    >
                      {isProcessing ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating preview…</> : <><ArrowDownToLine className="h-4 w-4" /> Preview deposit</>}
                    </button>
                  </div>
                )}

                {activeTab === 'withdraw' && (
                  <div className="space-y-4">
                    {userPosition ? (
                      <>
                        <div className="bg-secondary/40 rounded-xl p-4 text-sm">
                          <div className="flex justify-between mb-1"><span className="text-muted-foreground">Sample shares</span><span className="font-mono text-dnipro-300">{(userPosition.shares / 1e6).toFixed(4)} {selectedAdapter.shareSymbol}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Sample value</span><span>{formatUsdc(userPosition.currentValue / 1e6)}</span></div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Shares to preview</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={withdrawShares}
                              onChange={e => { setWithdrawShares(e.target.value); setPreviewResult(null); }}
                              placeholder="0.00"
                              min="0"
                              className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-dnipro-500/50 transition-all"
                            />
                            <button onClick={() => setWithdrawShares((userPosition.shares / 1e6).toString())} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-dnipro-400 hover:text-dnipro-300">MAX</button>
                          </div>
                        </div>

                        {selectedAdapter.withdrawalDelay && (
                          <div className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-3">
                            <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>Reference cooldown: <strong>{selectedAdapter.withdrawalDelay}</strong>.</span>
                          </div>
                        )}

                        {previewResult?.type === 'withdraw' && (
                          <div className="flex items-start gap-2 text-xs text-dnipro-300 bg-dnipro-400/5 border border-dnipro-400/20 rounded-xl p-3">
                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{previewResult.message}</span>
                          </div>
                        )}

                        <button
                          onClick={() => runPreview('withdraw')}
                          disabled={isProcessing || !withdrawShares || Number(withdrawShares) <= 0}
                          className={cn(
                            'w-full rounded-xl py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 border',
                            isProcessing || !withdrawShares || Number(withdrawShares) <= 0
                              ? 'bg-secondary text-muted-foreground/40 cursor-not-allowed border-border'
                              : 'bg-secondary text-foreground hover:bg-secondary/60 border-border hover:border-dnipro-400/40'
                          )}
                        >
                          {isProcessing ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating preview…</> : <><ArrowUpFromLine className="h-4 w-4" /> Preview withdrawal</>}
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-12"><IconEmpty size={36} className="mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">No sample position to preview</p></div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {DEMO_MODE && (
              <p className="text-xs text-muted-foreground px-1">
                To turn this into the Colosseum live demo, wire this panel to a deployed Dnipro dispatcher and one verified adapter, then replace previews with signed transactions and real Solscan links.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
