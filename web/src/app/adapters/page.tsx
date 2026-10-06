import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock, FileCode2, Filter, FlaskConical, Shield } from 'lucide-react';
import { MOCK_ADAPTERS } from '@/lib/mockData';
import { ProtocolMark } from '@/components/icons/AdapterIcons';

export const metadata: Metadata = {
  title: 'Adapter Explorer — Dnipro',
  description: 'Inspect the reference adapters that implement the Dnipro yield interface.',
};

const CATEGORIES = ['All', 'Lending', 'Liquidity', 'Real World Asset', 'Insurance'];

export default function AdaptersPage() {
  return (
    <div className="min-h-screen py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <span className="tag mb-4">reference implementation</span>
          <h1 className="heading-serif text-4xl mb-3">Adapter Explorer</h1>
          <p className="text-muted-foreground text-lg max-w-3xl">
            Browse the five protocol modules included in the Dnipro reference build. These are engineering integrations, not a claim that all five routes are currently deployed or accepting funds.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Reference adapters', value: '5' },
            { label: 'Adapter calls', value: '3' },
            { label: 'Underlying asset demo', value: 'USDC' },
            { label: 'Live status', value: 'Pre-deploy' },
          ].map(s => (
            <div key={s.label} className="surface rounded-xl p-4 text-center">
              <div className="text-xl font-semibold font-mono">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-8">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {CATEGORIES.map(cat => (
            <span key={cat} className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground">
              {cat}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {MOCK_ADAPTERS.map(adapter => (
            <Link key={adapter.id} href={`/adapters/${adapter.id}`}>
              <div className="surface rounded-lg p-6 hover:border-dnipro-500/40 hover:bg-dnipro-500/5 transition-all duration-200 group h-full">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <ProtocolMark letter={adapter.icon} className="text-dnipro-400" size={44} />
                    <div>
                      <h2 className="font-medium text-lg group-hover:accent-text transition-colors">{adapter.name}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{adapter.categoryLabel}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground font-mono">{adapter.shareSymbol}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-wheat-400/30 bg-wheat-400/5 text-wheat-300">Reference</span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><FileCode2 className="h-3 w-3" /> Interface</div>
                    <div className="text-sm font-mono font-medium">3 calls</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><FlaskConical className="h-3 w-3" /> Metrics</div>
                    <div className="text-sm font-mono font-medium">Sample</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><Shield className="h-3 w-3" /> Risk model</div>
                    <div className="text-sm font-mono font-medium">{adapter.riskScore}/100</div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-5 line-clamp-2">{adapter.description}</p>

                <div className="flex items-center justify-between border-t border-border/50 pt-4">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Min model: ${(adapter.minDeposit / 1e6).toFixed(0)} USDC</span>
                    {adapter.withdrawalDelay && <span className="flex items-center gap-1 text-yellow-400"><Clock className="h-3 w-3" /> {adapter.withdrawalDelay}</span>}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-dnipro-400 group-hover:gap-2 transition-all">Details <ArrowRight className="h-3 w-3" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="surface rounded-lg p-8 text-center border border-dnipro-500/20">
          <h3 className="text-xl font-semibold font-mono mb-2">Want to add a venue?</h3>
          <p className="text-muted-foreground mb-5">Implement the three-function adapter surface, test the underlying CPI, then submit it for registry review.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/docs/build-adapter" className="rounded-xl bg-wheat-400 px-5 py-2.5 text-sm font-semibold text-river-ink hover:bg-wheat-300 transition-colors">Build an Adapter</Link>
            <Link href="/docs/governance" className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors">Governance Docs</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
