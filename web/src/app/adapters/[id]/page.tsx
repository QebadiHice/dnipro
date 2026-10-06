import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Clock, FileCode, FlaskConical, Shield } from 'lucide-react';
import { MOCK_ADAPTERS, generateApyHistory } from '@/lib/mockData';
import { formatUsdc } from '@/lib/utils';
import { AdapterDetailClient } from './AdapterDetailClient';
import { ProtocolMark } from '@/components/icons/AdapterIcons';

type PageParams = Promise<{ id: string }>;

export async function generateStaticParams() {
  return MOCK_ADAPTERS.map(a => ({ id: a.id }));
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { id } = await params;
  const adapter = MOCK_ADAPTERS.find(a => a.id === id);
  if (!adapter) return { title: 'Not Found — Dnipro' };
  return { title: `${adapter.name} — Dnipro Reference Adapter`, description: adapter.description };
}

export default async function AdapterDetailPage({ params }: { params: PageParams }) {
  const { id } = await params;
  const adapter = MOCK_ADAPTERS.find(a => a.id === id);
  if (!adapter) notFound();

  const apyHistory = generateApyHistory(adapter.apyBps);

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Link href="/adapters" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> All Adapters
        </Link>

        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <ProtocolMark letter={adapter.icon} className="text-dnipro-400" size={56} />
            <div>
              <h1 className="heading-serif text-3xl">{adapter.name}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-muted-foreground">{adapter.categoryLabel}</span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-wheat-400/30 bg-wheat-400/5 text-wheat-300">Reference integration</span>
                <span className="text-xs text-muted-foreground">pre-deployment</span>
              </div>
            </div>
          </div>

          <Link href="/dashboard" className="rounded-xl bg-wheat-400 px-6 py-3 text-sm font-semibold text-river-ink hover:bg-wheat-300">
            Open reference flow
          </Link>
        </div>

        <div className="surface rounded-lg p-4 mb-8 border border-wheat-400/20 bg-wheat-400/[0.03]">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The values below are sample data used to exercise the interface. Do not treat the APY, TVL, risk score, or reference program ID as current production data.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Sample APY', value: adapter.apyPercent, color: 'text-wheat-300', icon: FlaskConical },
            { label: 'Sample TVL', value: adapter.tvlFormatted, color: 'text-foreground', icon: FlaskConical },
            { label: 'Risk model', value: `${adapter.riskScore}/100`, color: 'text-foreground', icon: Shield },
            { label: 'Withdrawal model', value: adapter.withdrawalDelay ?? 'Instant', color: adapter.withdrawalDelay ? 'text-yellow-400' : 'text-dnipro-300', icon: Clock },
          ].map(m => (
            <div key={m.label} className="surface rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
              <p className={`text-xl font-mono font-medium ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        <AdapterDetailClient adapter={adapter} apyHistory={apyHistory} />

        <div className="grid sm:grid-cols-2 gap-6 mt-8">
          <div className="surface rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><FileCode className="h-4 w-4 text-dnipro-400" /> Technical Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Reference Program ID', value: adapter.programId.slice(0, 20) + '…', mono: true },
                { label: 'Underlying Mint', value: adapter.underlyingMint.slice(0, 20) + '…', mono: true },
                { label: 'Share Token Model', value: adapter.shareSymbol, mono: true },
                { label: 'Sample Exchange Rate', value: `${(adapter.exchangeRateBps / 10000).toFixed(4)}x`, mono: false },
                { label: 'Min Deposit Model', value: `$${(adapter.minDeposit / 1e6).toFixed(2)} USDC`, mono: false },
                { label: 'Max Deposit Model', value: adapter.maxDeposit === 0 ? 'Unlimited' : formatUsdc(adapter.maxDeposit / 1e6), mono: false },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1 border-b border-border/30 last:border-0 gap-4">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={row.mono ? 'font-mono text-xs text-dnipro-300 text-right' : 'font-medium text-right'}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface rounded-lg p-6">
            <h3 className="font-semibold mb-4">Protocol resources</h3>
            <div className="space-y-3">
              {[
                { label: 'Protocol Website', href: adapter.website },
                { label: 'Documentation', href: adapter.docs },
                { label: 'Security Resources', href: adapter.auditUrl },
              ].map(link => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-dnipro-500/40 hover:bg-secondary transition-all text-sm group">
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">{link.label}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-dnipro-400 transition-colors" />
                </a>
              ))}
            </div>

            <div className="mt-5 p-4 bg-secondary/40 rounded-xl border border-border/50">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Production registration should only happen after the underlying protocol CPI, account constraints, withdrawal semantics, and cluster deployment have been independently verified.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
