// web/src/app/architecture/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Architecture — Dnipro',
  description: 'Dnipro v2 routing architecture, live Devnet adapter path, and current protocol-integration limits',
};

const SECTIONS = [
  {
    id: 'overview',
    title: 'System Overview',
    content: `Dnipro is organized as **two core Anchor programs plus adapter programs**:

1. **Dispatcher** — the wallet-facing entry point for \`deposit(amount)\` and \`withdraw(amount)\`. It owns per-user position PDAs and performs CPI only after validating the selected route against Registry.

2. **Registry** — a governance-controlled allowlist. Each record binds an adapter program to its underlying mint, state PDA, token vault, vault authority, and active status.

3. **Adapters** — programs behind the common Dnipro route interface. The included **Dnipro USDC Devnet Vault** is the live end-to-end proof. Kamino, MarginFi, Jupiter, Maple/Syrup, and Drift remain reference integrations until their protocol-specific CPIs are implemented and verified.`,
  },
  {
    id: 'pda-model',
    title: 'PDA Model',
    content: `The live v2 path uses deterministic Program Derived Addresses:

| Account | Seeds | Program | Description |
|---------|-------|---------|-------------|
| \`DispatcherConfig\` | \`["dispatcher_config_v2"]\` | Dispatcher | Admin, Registry program, pause state |
| \`DispatcherAuthority\` | \`["dispatcher_authority_v2"]\` | Dispatcher | CPI signer accepted by adapters |
| \`Position\` | \`["position_v2", user, adapter_program_id]\` | Dispatcher | Per-user per-adapter test-USDC position |
| \`RegistryConfig\` | \`["registry_config_v2"]\` | Registry | Governance authority, adapter count |
| \`AdapterRecord\` | \`["adapter_v2", adapter_program_id]\` | Registry | Program, mint, state, vault, authority, active status |
| \`AdapterState\` | \`["adapter_state_v1"]\` | Adapter | Adapter admin/config and routed deposits |
| \`AdapterVault\` | \`["vault_v1"]\` | Adapter | Program-controlled SPL-token vault |
| \`VaultAuthority\` | \`["vault_authority_v1"]\` | Adapter | PDA that signs vault withdrawals |`,
  },
  {
    id: 'instruction-set',
    title: 'Instruction Set',
    content: `**Dispatcher Instructions:**
- \`initialize(registry_program)\` — initializes v2 config and Dispatcher authority PDA
- \`deposit(amount)\` — validates Registry record, CPIs to adapter, updates Position
- \`withdraw(amount)\` — validates Registry record, CPIs to adapter, updates Position
- \`set_paused(paused)\` — admin emergency control

**Registry Instructions:**
- \`initialize_registry()\` — initializes governance config
- \`register_adapter(name)\` — creates the Registry record for one deployed adapter
- \`set_adapter_active(active)\` — governance-controlled route status

**Live adapter interface:**
- \`initialize_adapter()\` — creates adapter state and SPL-token vault
- \`adapter_deposit(amount)\` — receives tokens only from a CPI authorized by the Dispatcher PDA
- \`adapter_withdraw(amount)\` — returns tokens from the vault using the adapter vault-authority PDA`,
  },
  {
    id: 'routing',
    title: 'Registry-gated Routing',
    content: `The Dispatcher does not accept an arbitrary adapter as a trusted route. Before CPI it derives the expected Registry record PDA and verifies:

- the Registry program owns the record;
- the record was derived for the supplied adapter program;
- the record's underlying mint matches the transaction mint;
- the adapter state, vault, and vault-authority accounts match the registered accounts;
- the adapter is active.

Only after those checks does the Dispatcher sign the adapter CPI with \`dispatcher_authority_v2\`. The live adapter stores that authority during initialization and rejects direct withdrawal/deposit calls that do not carry the Dispatcher PDA signature.`,
  },
  {
    id: 'live-demo',
    title: 'Live Devnet Route',
    content: `The current Colosseum demo uses Circle-compatible **Solana Devnet test USDC** and a Dnipro-owned vault adapter.

A successful live deposit proves:

\`wallet → Dispatcher → Registry validation → adapter CPI → SPL vault → Position PDA → confirmed Solana signature\`

A withdrawal follows the same path in reverse and is constrained by the user's Dispatcher position.

The live vault is deliberately **not described as a yield-bearing protocol**. It proves the common routing standard and keeps protocol claims honest while the external venue adapters are completed.`,
  },
  {
    id: 'security',
    title: 'Security & Current Limits',
    content: `**Controls in the live v2 demo path:**
- Registry-gated adapter routing
- Program-executable checks for registered adapters
- Dispatcher-only adapter authorization through a PDA signer
- Per-user Position PDAs
- SPL token mint/authority constraints
- Adapter active/inactive control
- Dispatcher pause control
- Checked arithmetic for position/vault accounting

**Current limits:**
- The Devnet vault is a routing proof, not an external yield strategy
- Kamino, MarginFi, Jupiter, Maple/Syrup, and Drift are still reference integrations
- The demo path uses a single underlying mint (Devnet USDC)
- Upgrade authorities/governance are appropriate for a hackathon Devnet build, not a production treasury
- No program in this repository should be represented as audited or mainnet-ready until independent review and protocol-specific testing support that claim`,
  },
  {
    id: 'adapter-interface',
    title: 'Adapter Interface Standard',
    content: `The v2 live adapter contract is intentionally small. A compatible adapter receives a Dispatcher-authority signer plus the user and token accounts:

\`\`\`rust
pub fn adapter_deposit(
    ctx: Context<RouteTokens>,
    amount: u64,
) -> Result<()>

pub fn adapter_withdraw(
    ctx: Context<RouteTokens>,
    amount: u64,
) -> Result<()>
\`\`\`

A production protocol adapter can replace the Devnet vault's direct SPL transfer with protocol-specific CPI while keeping the same Dispatcher-facing route. That is the core Dnipro abstraction: the app integrates the Dispatcher once while adapters absorb venue-specific account and instruction complexity.`,
  },
];

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="heading-serif text-4xl mb-3">Architecture</h1>
          <p className="text-muted-foreground text-lg">
            Explore the Dnipro v2 routing path, Registry-gated adapter model, live Devnet proof, and remaining production work.
          </p>
        </div>

        {/* Table of contents */}
        <div className="surface rounded-lg p-5 mb-10">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contents</h3>
          <div className="space-y-1">
            {SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-sm text-dnipro-400 hover:text-dnipro-300 transition-colors py-0.5"
              >
                → {s.title}
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {SECTIONS.map(section => (
            <div key={section.id} id={section.id} className="scroll-mt-20">
              <h2 className="heading-serif text-2xl mb-4 accent-text">{section.title}</h2>
              <div className="surface rounded-lg p-6">
                <div className="prose prose-invert prose-sm max-w-none">
                  {section.content.split('\n\n').map((para, i) => {
                    // Detect code blocks
                    if (para.startsWith('```')) {
                      const lines = para.split('\n');
                      const code = lines.slice(1, -1).join('\n');
                      return (
                        <pre key={i} className="bg-black/30 rounded-xl p-4 text-xs font-mono text-dnipro-200 overflow-x-auto my-4">
                          <code>{code}</code>
                        </pre>
                      );
                    }
                    // Detect tables
                    if (para.includes('|---')) {
                      const rows = para.trim().split('\n');
                      const headers = rows[0].split('|').filter(Boolean).map(h => h.trim());
                      const body = rows.slice(2).map(r => r.split('|').filter(Boolean).map(c => c.trim()));
                      return (
                        <div key={i} className="overflow-x-auto my-4">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border/50">
                                {headers.map(h => <th key={h} className="text-left py-2 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {body.map((row, ri) => (
                                <tr key={ri} className="border-b border-border/30 last:border-0">
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="py-2 px-3 text-sm">
                                      <code className="text-xs text-dnipro-300 font-mono">{cell}</code>
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                    // Detect inline code and bold
                    const formatted = para
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/`([^`]+)`/g, '<code class="text-xs bg-secondary text-dnipro-300 px-1.5 py-0.5 rounded font-mono">$1</code>');
                    return (
                      <p key={i} className="text-muted-foreground leading-relaxed mb-3"
                        dangerouslySetInnerHTML={{ __html: formatted }} />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
