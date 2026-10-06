// web/src/app/architecture/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Architecture — Dnipro',
  description: 'Dnipro system architecture, reference implementation, and current limitations',
};

const SECTIONS = [
  {
    id: 'overview',
    title: 'System Overview',
    content: `Dnipro is organized as **two core Anchor programs plus protocol-specific adapter programs**:

1. **Dispatcher** — the intended user-facing entry point for \`deposit()\`, \`withdraw()\`, and \`current_value()\` flows. It owns user position PDAs, applies configured fees, and routes calls to an adapter program.

2. **Registry** — a governance-controlled catalog for adapter metadata and status. The Registry and Dispatcher are separate in the current reference build; production routing must enforce registry membership and adapter status directly before a venue is treated as approved.

3. **Adapters** — protocol-specific programs implementing the common three-function interface. The five included modules are **reference implementations**. A venue is not considered live until its real underlying-protocol CPI/accounts are implemented, tested on the target cluster, and its deployed program address is verified.`,
  },
  {
    id: 'pda-model',
    title: 'PDA Model',
    content: `All state is stored in deterministic Program Derived Addresses:

| Account | Seeds | Program | Description |
|---------|-------|---------|-------------|
| \`DispatcherConfig\` | \`["dispatcher_config"]\` | Dispatcher | Global fee config, pause flag |
| \`Position\` | \`["position", user, adapter_program_id]\` | Dispatcher | Per-user per-adapter yield position |
| \`RegistryConfig\` | \`["registry_config"]\` | Registry | Governance authority, adapter count |
| \`AdapterRecord\` | \`["adapter", adapter_program_id]\` | Registry | Per-adapter metadata and status |
| \`GovernanceProposal\` | \`["proposal", proposal_id]\` | Registry | Timelock governance action |

**Position PDAs** are unique per (user, adapter) pair — one user can have simultaneous positions across all five adapters, each tracked independently.`,
  },
  {
    id: 'instruction-set',
    title: 'Instruction Set',
    content: `**Dispatcher Instructions:**
- \`initialize(registry_program, fee_bps, fee_recipient)\` — admin only, called once
- \`deposit(amount, min_shares_out)\` — route tokens to adapter, create/update Position
- \`withdraw(shares, min_amount_out)\` — redeem shares from adapter, update Position
- \`current_value(adapter_program_id)\` — read-only value query via CPI
- \`update_config(fee_bps?, fee_recipient?, registry_program?)\` — admin gated
- \`set_paused(paused)\` — emergency pause, admin gated
- \`transfer_admin(new_admin)\` — two-step admin transfer

**Registry Instructions:**
- \`initialize_registry(timelock_delay)\` — governance only
- \`register_adapter(params)\` — governance gated, creates AdapterRecord PDA
- \`update_adapter(params)\` — update APY, TVL, metadata
- \`deactivate_adapter()\` — pause all deposits to this adapter
- \`reactivate_adapter()\` — re-enable deposits
- \`propose_governance_action(proposal_id, action)\` — submit timelock proposal
- \`execute_governance_action()\` — execute after timelock elapsed

**Adapter Interface (each adapter implements):**
- \`adapter_deposit(amount, min_shares_out) → u64\` — returns shares minted
- \`adapter_withdraw(shares, min_amount_out) → u64\` — returns tokens received
- \`adapter_current_value(shares) → u64\` — returns current token value`,
  },
  {
    id: 'fee-model',
    title: 'Fee Model',
    content: `Dnipro supports a configurable protocol fee on deposit and withdrawal flows. The initialization script currently uses **30 bps (0.30%)** as a reference configuration; production pricing should be validated with users and measured against transaction economics.

**Fee Formula:**
\`\`\`
fee = amount * fee_bps / 10_000
net_amount = amount - fee
\`\`\`

Fees are collected into the configured fee-recipient token account. The economic model is intentionally configurable; Dnipro should not claim a break-even period until real venue yields, transaction costs, and user behavior are measured.

Any production treasury or governance policy should be documented separately from this reference build.`,
  },
  {
    id: 'security',
    title: 'Security & Current Limits',
    content: `**Controls represented in the reference build:**
- Critical fee and position arithmetic uses checked or saturating operations where implemented
- Deposit/withdraw interfaces include \`min_shares_out\` / \`min_amount_out\` parameters
- Dispatcher configuration includes an emergency pause
- Registry instructions are governance-authority gated
- Registry code includes timelock proposal records for future governance execution flows

**Adapter boundaries:**
- Each adapter is a separate on-chain program and can be deployed/upgraded independently
- Position PDAs are owned by the Dispatcher rather than an adapter
- Separation reduces coupling, but it is **not** a guarantee against a malicious or incorrectly wired CPI. Account constraints, registry enforcement, upgrade authorities, and integration tests remain essential.

**Known limitations in this submission build:**
- The included adapters model the Dnipro interface but do not yet perform the real underlying venue CPIs
- Dispatcher deposit/withdraw do not yet receive Registry accounts, so adapter membership/status is not enforced in the routing path
- Dispatcher CPI account lists do not yet match the richer account contexts required by the reference adapters
- Adapter return values are not yet propagated into Dispatcher share accounting, so live position accounting is incomplete
- \`current_value\` returns deposited principal as a baseline instead of consuming CPI return data
- Governance proposal execution currently records execution state; it does not yet apply every proposed action automatically
- No program in this repository should be represented as audited or production-ready until deployment, tests, and an external security review support that claim`,
  },
  {
    id: 'adapter-interface',
    title: 'Adapter Interface Standard',
    content: `Any Solana program can become a Dnipro adapter by implementing three instructions with the following Anchor discriminators and signatures:

\`\`\`rust
// Discriminator: sha256("global:adapter_deposit")[..8]
pub fn adapter_deposit(
    ctx: Context<AdapterDeposit>,
    amount: u64,
    min_shares_out: u64,
) -> Result<u64>  // returns shares minted

// Discriminator: sha256("global:adapter_withdraw")[..8]  
pub fn adapter_withdraw(
    ctx: Context<AdapterWithdraw>,
    shares: u64,
    min_amount_out: u64,
) -> Result<u64>  // returns tokens received

// Discriminator: sha256("global:adapter_current_value")[..8]
pub fn adapter_current_value(
    ctx: Context<AdapterCurrentValue>,
    shares: u64,
) -> Result<u64>  // returns current token value
\`\`\`

The adapter must also maintain an \`adapter_state\` PDA at seeds \`["adapter_state"]\` and a \`vault_authority\` PDA at \`["vault_authority"]\` to enable signed vault transfers.

Use \`dnipro generate <name>\` to scaffold a complete adapter template.`,
  },
];

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="heading-serif text-4xl mb-3">Architecture</h1>
          <p className="text-muted-foreground text-lg">
            Explore the Dnipro on-chain design, PDA model, reference interface, and the work remaining before production.
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
