export function DeveloperSection() {
  const codeSnippet = `import { DniproClient, ADAPTER_PROGRAM_IDS, usdcToAtomics } from '@dnipro/sdk';

const client = new DniproClient(connection);

// Discover adapters registered with Dnipro
const adapters = await client.getActiveAdapters();

// The same Dispatcher surface is used for every verified adapter
const tx = client.buildDepositTransaction({
  user: wallet.publicKey,
  adapterProgramId: LIVE_ADAPTER_PROGRAM_ID,
  underlyingMint: DEVNET_USDC_MINT,
  adapterState,
  adapterVault,
  adapterVaultAuthority,
  deposit: { amount: usdcToAtomics(1) },
});`;

  return (
    <section className="py-24 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="tag mb-4">for developers</span>
            <h2 className="heading-serif text-3xl sm:text-4xl mb-6">A stable integration surface for changing yield venues</h2>
            <p className="text-muted-foreground text-lg mb-8">
              The <code className="text-dnipro-300 font-mono text-sm">@dnipro/sdk</code> packages typed instruction builders, PDA helpers, account fetchers, and adapter discovery. The CLI scaffolds a new adapter with the expected interface.
            </p>

            <div className="space-y-4">
              {[
                { cmd: 'npm install @dnipro/sdk', desc: 'Install the TypeScript SDK' },
                { cmd: 'dnipro generate my-protocol', desc: 'Scaffold a new adapter' },
                { cmd: 'open playground/README.md', desc: 'Use the canonical Playground deploy flow' },
                { cmd: 'yarn dev', desc: 'Run the wallet dashboard locally' },
              ].map(({ cmd, desc }) => (
                <div key={cmd} className="flex items-center gap-4">
                  <code className="surface rounded-lg px-3 py-2 text-sm font-mono text-dnipro-300 flex-1">$ {cmd}</code>
                  <span className="text-sm text-muted-foreground hidden sm:block w-44">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/40">
              <span className="text-xs text-muted-foreground font-mono">dnipro-example.ts</span>
              <span className="text-xs text-muted-foreground font-mono">typescript</span>
            </div>
            <pre className="p-5 text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed">
              <code>{codeSnippet}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
