import { Blocks, Route, ShieldCheck } from 'lucide-react';

const ITEMS = [
  {
    icon: Blocks,
    eyebrow: 'Problem',
    title: 'Every venue is a separate integration',
    text: 'Accounts, instruction shapes, receipt tokens, risk metadata, and withdrawal rules change from protocol to protocol.',
  },
  {
    icon: Route,
    eyebrow: 'Wedge',
    title: 'Integrate Dnipro once',
    text: 'Apps build against one dispatcher and typed SDK while protocol-specific logic stays behind adapters.',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Trust model',
    title: 'Discovery is governance-gated',
    text: 'The registry makes adapter status explicit and gives integrators one place to reason about approved routes.',
  },
];

export function WhyDniproSection() {
  return (
    <section className="py-24 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <span className="tag mb-4">why dnipro</span>
          <h2 className="heading-serif text-3xl sm:text-4xl mb-4">
            One integration instead of five bespoke code paths
          </h2>
          <p className="text-muted-foreground text-lg">
            Dnipro is infrastructure first. The dashboard is a reference client that proves the same adapter surface can be consumed by a wallet, treasury tool, or another Solana application.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {ITEMS.map(({ icon: Icon, eyebrow, title, text }) => (
            <div key={title} className="surface rounded-lg p-6">
              <div className="h-10 w-10 rounded-lg border border-dnipro-500/30 bg-dnipro-900/30 flex items-center justify-center mb-5">
                <Icon className="h-5 w-5 text-dnipro-300" />
              </div>
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-wheat-300 mb-2">{eyebrow}</div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
