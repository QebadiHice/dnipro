// web/src/app/docs/sdk/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'SDK Reference — Dnipro',
  description: 'Full @dnipro/sdk TypeScript API reference',
};

const API_SECTIONS = [
  {
    title: 'DniproClient',
    description: 'Main client class. Instantiate once per connection.',
    methods: [
      { sig: 'new DniproClient(connection, opts?)',          ret: 'DniproClient',             desc: 'Create a new client instance' },
      { sig: 'getDispatcherConfig()',                        ret: 'Promise<DispatcherConfig>', desc: 'Fetch global dispatcher config PDA' },
      { sig: 'getRegistryConfig()',                          ret: 'Promise<RegistryConfig>',  desc: 'Fetch registry governance config' },
      { sig: 'getAllAdapters()',                             ret: 'Promise<AdapterDisplay[]>', desc: 'Fetch all registered adapters' },
      { sig: 'getActiveAdapters()',                         ret: 'Promise<AdapterDisplay[]>', desc: 'Adapters that are active and accepting deposits' },
      { sig: 'getAdapter(programId)',                       ret: 'Promise<AdapterDisplay>',  desc: 'Fetch a specific adapter by program ID' },
      { sig: 'getPosition(user, adapterProgramId)',         ret: 'Promise<Position>',        desc: "Fetch a user's position in one adapter" },
      { sig: 'getAllPositions(user)',                       ret: 'Promise<PositionWithValue[]>', desc: 'All active positions for a user' },
      { sig: 'getPortfolioSummary(user)',                   ret: 'Promise<PortfolioSummary>',desc: 'Aggregate portfolio stats' },
      { sig: 'simulateDeposit(adapterId, amount)',          ret: 'Promise<SimulationResult>',desc: 'Estimate fee and shares before depositing' },
      { sig: 'simulateWithdraw(adapterId, shares)',         ret: 'Promise<SimulationResult>',desc: 'Estimate output before withdrawing' },
      { sig: 'buildDepositTransaction(params)',             ret: 'Transaction',              desc: 'Unsigned deposit transaction ready to sign' },
      { sig: 'buildWithdrawTransaction(params)',            ret: 'Transaction',              desc: 'Unsigned withdraw transaction ready to sign' },
    ],
  },
  {
    title: 'Account Fetchers',
    description: 'Low-level account deserialization functions.',
    methods: [
      { sig: 'findDispatcherConfigPDA()',           ret: '[PublicKey, number]', desc: 'PDA: ["dispatcher_config"]' },
      { sig: 'findRegistryConfigPDA()',             ret: '[PublicKey, number]', desc: 'PDA: ["registry_config"]' },
      { sig: 'findPositionPDA(user, adapterId)',    ret: '[PublicKey, number]', desc: 'PDA: ["position", user, adapter]' },
      { sig: 'findAdapterRecordPDA(adapterId)',     ret: '[PublicKey, number]', desc: 'PDA: ["adapter", adapter_program_id]' },
      { sig: 'fetchDispatcherConfig(connection)',   ret: 'Promise<DispatcherConfig | null>', desc: 'Fetch and deserialize dispatcher config' },
      { sig: 'fetchAdapterRecord(connection, id)', ret: 'Promise<AdapterInfo | null>',    desc: 'Fetch and deserialize adapter record' },
      { sig: 'fetchAllAdapters(connection, ids)',  ret: 'Promise<AdapterInfo[]>',          desc: 'Batch fetch multiple adapter records' },
      { sig: 'fetchPosition(connection, user, id)',ret: 'Promise<Position | null>',        desc: "Fetch and deserialize user's position" },
      { sig: 'fetchAllPositions(connection, user, ids)', ret: 'Promise<Position[]>',       desc: 'Batch fetch all positions for a user' },
    ],
  },
  {
    title: 'Instruction Builders',
    description: 'Build raw TransactionInstructions without a client instance.',
    methods: [
      { sig: 'buildInitializeDispatcherIx(params)',  ret: 'TransactionInstruction', desc: 'Initialize dispatcher (admin, one-time)' },
      { sig: 'buildDepositIx(params)',               ret: 'TransactionInstruction', desc: 'Deposit instruction' },
      { sig: 'buildWithdrawIx(params)',              ret: 'TransactionInstruction', desc: 'Withdraw instruction' },
      { sig: 'buildCurrentValueIx(params)',          ret: 'TransactionInstruction', desc: 'Current value query instruction' },
      { sig: 'buildRegisterAdapterIx(params)',       ret: 'TransactionInstruction', desc: 'Registry: register adapter (governance)' },
    ],
  },
  {
    title: 'Utilities',
    description: 'Formatting and math helpers.',
    methods: [
      { sig: 'formatUsdc(amount)',          ret: 'string',  desc: 'Format BN atomics as "$1,234.56"' },
      { sig: 'bpsToPercent(bps)',           ret: 'string',  desc: 'Convert basis points to "8.20%"' },
      { sig: 'riskLabel(score)',            ret: '"Low"|"Medium"|"High"', desc: 'Score 0-100 → label' },
      { sig: 'usdcToAtomics(usdcAmount)',   ret: 'BN',      desc: 'Convert USDC float to 6-decimal BN' },
      { sig: 'atomicsToUsdc(atomics)',      ret: 'number',  desc: 'Convert 6-decimal BN to USDC float' },
      { sig: 'estimateDailyYield(principal, apyBps)', ret: 'BN', desc: 'Estimate one day of yield' },
      { sig: 'formatAddress(pubkey, chars)', ret: 'string', desc: 'Shorten address: "AbCd…XyZw"' },
      { sig: 'formatTimestamp(unixTs)',     ret: 'string',  desc: 'Format Unix timestamp as date' },
    ],
  },
  {
    title: 'Constants',
    description: 'Program IDs, seeds, and adapter metadata.',
    methods: [
      { sig: 'DISPATCHER_PROGRAM_ID',  ret: 'PublicKey', desc: 'Dispatcher program address' },
      { sig: 'REGISTRY_PROGRAM_ID',    ret: 'PublicKey', desc: 'Registry program address' },
      { sig: 'ADAPTER_PROGRAM_IDS',    ret: 'Record<string, PublicKey>', desc: 'Map of adapter name → program ID' },
      { sig: 'USDC_MINT',             ret: 'PublicKey', desc: 'USDC mint address (mainnet)' },
      { sig: 'SEEDS',                 ret: 'object',    desc: 'PDA seed buffers' },
      { sig: 'ADAPTER_METADATA',      ret: 'object',    desc: 'Static per-adapter metadata' },
      { sig: 'BPS_DENOMINATOR',       ret: '10_000',    desc: 'Basis points denominator' },
    ],
  },
];

export default function SdkPage() {
  return (
    <div className="min-h-screen py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Link href="/docs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Docs
        </Link>

        <div className="mb-10">
          <h1 className="heading-serif text-4xl mb-3">SDK Reference</h1>
          <p className="text-muted-foreground text-lg">
            Full API reference for <code className="text-dnipro-300 font-mono text-sm bg-secondary px-1.5 py-0.5 rounded">@dnipro/sdk</code>
          </p>
        </div>

        <div className="space-y-10">
          {API_SECTIONS.map(section => (
            <div key={section.title}>
              <h2 className="heading-serif text-xl mb-1 accent-text">{section.title}</h2>
              <p className="text-sm text-muted-foreground mb-4">{section.description}</p>

              <div className="surface rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/40">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-2/5">Signature</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/5">Returns</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.methods.map((m, i) => (
                      <tr key={m.sig} className={`border-b border-border/30 last:border-0 ${i % 2 === 0 ? '' : 'bg-secondary/40'}`}>
                        <td className="py-3 px-4">
                          <code className="text-xs font-mono text-dnipro-300 break-all">{m.sig}</code>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs font-mono text-green-400/80">{m.ret}</code>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">{m.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
