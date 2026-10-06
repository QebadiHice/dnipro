import Link from 'next/link';
import { Code2, Eye, Github, WalletCards } from 'lucide-react';

const PROOF = [
  { icon: Code2, title: 'Open-source programs', text: 'Dispatcher, registry, adapters, SDK, CLI, tests, and docs live in the same repository.' },
  { icon: WalletCards, title: 'Wallet-native reference app', text: 'The dashboard connects a Solana wallet and exposes the exact flow intended for the live protocol demo.' },
  { icon: Eye, title: 'No fake on-chain claims', text: 'Sample APY and portfolio data are labelled. Simulated previews are never linked to a fake Solscan transaction.' },
];

export function VerificationSection() {
  return (
    <section className="py-24 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4">
            <span className="tag mb-4">built for verification</span>
            <h2 className="heading-serif text-3xl sm:text-4xl mb-4">A demo judges can inspect, not just watch</h2>
            <p className="text-muted-foreground mb-6">
              Dnipro is structured so every important claim can eventually resolve to source code, a deployed program, or a real transaction signature.
            </p>
            <a
              href="https://github.com/QebadiHice/dnipro"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-wheat-300 hover:text-wheat-200"
            >
              <Github className="h-4 w-4" /> Inspect the repository
            </a>
          </div>

          <div className="lg:col-span-8 grid md:grid-cols-3 gap-4">
            {PROOF.map(({ icon: Icon, title, text }) => (
              <div key={title} className="surface rounded-lg p-5">
                <Icon className="h-5 w-5 text-dnipro-300 mb-4" />
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
            <Link href="/docs" className="md:col-span-3 surface rounded-lg p-5 flex items-center justify-between gap-4 hover:border-dnipro-500/40 transition-colors">
              <div>
                <div className="font-semibold">Developer documentation</div>
                <div className="text-sm text-muted-foreground">Adapter interface, SDK reference, governance, and deployment path.</div>
              </div>
              <span className="text-wheat-300">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
