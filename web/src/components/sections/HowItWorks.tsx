const STEPS = [
  {
    title: 'Integrate one client',
    desc: 'Wallets, treasury products, and apps talk to the Dnipro dispatcher through the same SDK surface.',
  },
  {
    title: 'Discover approved adapters',
    desc: 'The registry exposes adapter status and metadata instead of forcing every app to maintain its own allowlist.',
  },
  {
    title: 'Route through one dispatcher',
    desc: 'Deposit and withdraw instructions forward into the selected adapter while preserving a consistent calling pattern.',
  },
  {
    title: 'Track positions consistently',
    desc: 'Apps can reason about deposited value and adapter positions without rebuilding protocol-specific UI logic each time.',
  },
  {
    title: 'Add venues without rebuilding the app',
    desc: 'New protocol integrations live behind adapters, keeping the consumer integration stable as coverage expands.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <span className="tag mb-4">how it works</span>
            <h2 className="heading-serif text-3xl sm:text-4xl mb-4">Three adapter calls, one integration surface</h2>
            <p className="text-muted-foreground">
              Dnipro standardises <code className="text-xs bg-secondary px-1.5 py-0.5 rounded font-mono">deposit</code>,{' '}
              <code className="text-xs bg-secondary px-1.5 py-0.5 rounded font-mono">withdraw</code>, and{' '}
              <code className="text-xs bg-secondary px-1.5 py-0.5 rounded font-mono">current_value</code> while adapters own protocol-specific logic.
            </p>
          </div>

          <ol className="lg:col-span-8 divide-y divide-border/60 border-t border-b border-border/60">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-6 py-5 group">
                <span className="font-mono text-sm text-muted-foreground w-6 shrink-0 pt-0.5 group-hover:text-wheat-400 transition-colors">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-medium mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
