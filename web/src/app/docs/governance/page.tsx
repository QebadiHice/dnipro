// web/src/app/docs/governance/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Governance — Dnipro',
  description: 'Dnipro protocol governance and timelock',
};

export default function GovernancePage() {
  return (
    <div className="min-h-screen py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link href="/docs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Docs
        </Link>

        <h1 className="heading-serif text-4xl mb-3">Governance</h1>
        <p className="text-muted-foreground text-lg mb-10">
          How the Dnipro governance system protects the protocol and its users.
        </p>

        <div className="space-y-8">
          {[
            {
              title: 'Overview',
              content: `The Dnipro Registry is controlled by a governance authority — intended to be a Squads multisig in production. All protocol-level changes require a governance proposal that goes through a timelock before taking effect.

This means:
- No adapter can be registered or deactivated without advance notice
- Fee changes require a timelock delay (protecting users from surprise fee increases)  
- The community can review and react to proposed changes before they activate`,
            },
            {
              title: 'Timelock Mechanism',
              content: `Every governance action follows this flow:

1. **Propose** — governance calls \`propose_governance_action(proposal_id, action)\`
2. **Wait** — the timelock delay passes (default: 48 hours on mainnet)
3. **Execute** — governance calls \`execute_governance_action(proposal_id)\`

The GovernanceProposal PDA stores: proposer, action type, proposed_at, executable_after, executed.

If governance attempts to execute before \`executable_after\`, the transaction reverts with \`TimelockNotElapsed\`.`,
            },
            {
              title: 'Governed Actions',
              content: `Actions that require a governance proposal + timelock:
- Register a new adapter
- Deactivate an existing adapter  
- Update the timelock delay itself
- Transfer governance authority to a new address

Actions that governance can take immediately (no timelock):
- Update adapter APY / TVL metadata (informational only, no user impact)
- Pause adapter deposits (emergency measure — time-sensitive)`,
            },
            {
              title: 'Submitting an Adapter',
              content: `To get your adapter registered with Dnipro:

1. Build and deploy your adapter program to mainnet
2. Verify it implements the three-function interface correctly
3. Open a PR to this repository with your adapter code and tests
4. The Dnipro governance authority will review and submit a registration proposal
5. After the 48-hour timelock, your adapter goes live in the explorer

The registry will store: name, protocol, underlying mint, category, APY (initially estimated), TVL (initially 0), risk score (assessed by governance), metadata URI (pointing to audit report).`,
            },
          ].map(({ title, content }) => (
            <div key={title} className="surface rounded-lg p-6">
              <h2 className="heading-serif text-xl mb-4 accent-text">{title}</h2>
              <div className="space-y-3">
                {content.split('\n\n').map((para, i) => {
                  if (para.startsWith('1.') || para.startsWith('-')) {
                    const lines = para.split('\n').filter(Boolean);
                    return (
                      <ul key={i} className="space-y-1.5">
                        {lines.map(line => (
                          <li key={line} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-dnipro-400 mt-0.5 shrink-0">→</span>
                            <span dangerouslySetInnerHTML={{ __html: line.replace(/^[0-9]+\.\s|-\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>').replace(/`([^`]+)`/g, '<code class="text-xs bg-secondary text-dnipro-300 px-1 rounded font-mono">$1</code>') }} />
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>').replace(/`([^`]+)`/g, '<code class="text-xs bg-secondary text-dnipro-300 px-1 rounded font-mono">$1</code>') }} />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
