// web/src/app/docs/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Code2, Layers, Zap, ArrowRight, Terminal, GitBranch } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Documentation — Dnipro',
  description: 'Dnipro protocol documentation',
};

const DOC_SECTIONS = [
  {
    icon: Zap,
    title: 'Getting Started',
    href: '/docs/getting-started',
    desc: 'Install the SDK, connect to a cluster, and make your first deposit in under 10 minutes.',
    tags: ['Quickstart'],
  },
  {
    icon: Layers,
    title: 'Architecture',
    href: '/architecture',
    desc: 'Deep dive into the Dispatcher, Registry, and adapter programs. PDA model and account layouts.',
    tags: ['On-chain', 'Design'],
  },
  {
    icon: Code2,
    title: 'TypeScript SDK',
    href: '/docs/sdk',
    desc: 'Full API reference for @dnipro/sdk. DniproClient, instruction builders, account fetchers.',
    tags: ['SDK', 'TypeScript'],
  },
  {
    icon: Terminal,
    title: 'CLI Reference',
    href: '/docs/cli',
    desc: 'Complete CLI command reference. Generate adapters, list protocols, manage positions.',
    tags: ['CLI', 'Tooling'],
  },
  {
    icon: GitBranch,
    title: 'Build an Adapter',
    href: '/docs/build-adapter',
    desc: 'Step-by-step guide to creating a new Dnipro-compatible yield adapter.',
    tags: ['Adapter', 'Tutorial'],
  },
  {
    icon: BookOpen,
    title: 'Governance',
    href: '/docs/governance',
    desc: 'How the Dnipro governance timelock works and how to submit adapter registration proposals.',
    tags: ['Governance', 'DAO'],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

        <div className="mb-12">
          <h1 className="heading-serif text-4xl mb-3">Documentation</h1>
          <p className="text-muted-foreground text-lg">
            Everything you need to use, integrate, and build on the Dnipro protocol.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 mb-16">
          {DOC_SECTIONS.map(({ icon: Icon, title, href, desc, tags }) => (
            <Link key={href} href={href}>
              <div className="surface rounded-lg p-6 h-full hover:border-dnipro-500/40 hover:bg-dnipro-500/5 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-dnipro-600/20">
                    <Icon className="h-5 w-5 text-dnipro-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold mb-1 group-hover:text-dnipro-300 transition-colors flex items-center gap-2">
                      {title} <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{desc}</p>
                    <div className="flex gap-2">
                      {tags.map(tag => (
                        <span key={tag} className="text-xs bg-secondary border border-border rounded px-2 py-0.5 text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Build Adapter Guide - inline */}
        <div id="build-adapter" className="surface rounded-lg p-8 mb-8">
          <h2 className="heading-serif text-2xl mb-2">Build Your Own Adapter</h2>
          <p className="text-muted-foreground mb-8">
            Create a Dnipro-compatible adapter in four steps using the CLI generator.
          </p>

          <div className="space-y-6">
            {[
              {
                step: '01',
                title: 'Scaffold with the CLI',
                code: `$ npm install -g @dnipro/cli
$ dnipro generate my-protocol`,
                desc: 'Generates a complete Anchor program template with all three required instructions pre-wired.',
              },
              {
                step: '02',
                title: 'Implement the three interface functions',
                code: `// adapter_deposit: accept tokens, issue shares
pub fn adapter_deposit(ctx, amount, min_shares_out) -> Result<u64>

// adapter_withdraw: redeem shares, return tokens  
pub fn adapter_withdraw(ctx, shares, min_amount_out) -> Result<u64>

// adapter_current_value: read-only value query
pub fn adapter_current_value(ctx, shares) -> Result<u64>`,
                desc: 'Fill in your protocol-specific logic. The template handles Anchor boilerplate.',
              },
              {
                step: '03',
                title: 'Build and deploy',
                code: `$ anchor build -p my-protocol-adapter
$ anchor deploy -p my-protocol-adapter --provider.cluster devnet`,
                desc: 'Deploy and verify on devnet first. Promote to mainnet only after the integration and account constraints are proven.',
              },
              {
                step: '04',
                title: 'Register after verification',
                code: `$ dnipro register my-protocol
# CLI helper is currently a guided stub; use scripts/register-adapter.ts
# only after the deployed adapter has been verified`,
                desc: 'The current Registry supports governance-authority registration. Complete policy/timelock enforcement before describing the flow as fully decentralized governance.',
              },
            ].map(({ step, title, code, desc }) => (
              <div key={step} className="flex gap-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-wheat-400/40 bg-wheat-900/30 text-wheat-300 font-mono font-medium text-sm">
                  {step}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-2">{title}</h3>
                  <pre className="bg-black/40 rounded-xl p-4 text-xs font-mono text-dnipro-200 overflow-x-auto mb-2">
                    <code>{code}</code>
                  </pre>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SDK Quick Reference */}
        <div className="surface rounded-lg p-8">
          <h2 className="heading-serif text-2xl mb-6">SDK Quick Reference</h2>
          <div className="space-y-4">
            {[
              {
                label: 'Initialize client',
                code: `import { DniproClient } from '@dnipro/sdk';
const client = new DniproClient(connection);`,
              },
              {
                label: 'List all adapters',
                code: `const adapters = await client.getAllAdapters();
// → AdapterDisplay[]`,
              },
              {
                label: 'Get user positions',
                code: `const portfolio = await client.getPortfolioSummary(wallet.publicKey);
// → { positions, totalValue, totalPnl, ... }`,
              },
              {
                label: 'Build deposit transaction',
                code: `const tx = client.buildDepositTransaction({
  user: wallet.publicKey,
  adapterProgramId: ADAPTER_PROGRAM_IDS.kamino,
  underlyingMint: USDC_MINT,
  adapterVault: vaultPubkey,
  feeRecipientAccount: feeAccount,
  deposit: { amount: usdcToAtomics(1000) },
});`,
              },
              {
                label: 'Simulate deposit',
                code: `const sim = await client.simulateDeposit(
  ADAPTER_PROGRAM_IDS.kamino,
  usdcToAtomics(1000)
);
// → { estimatedOutput, estimatedFee, warnings }`,
              },
            ].map(({ label, code }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">{label}</p>
                <pre className="bg-black/40 rounded-xl p-4 text-xs font-mono text-dnipro-200 overflow-x-auto">
                  <code>{code}</code>
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
