// web/src/components/sections/ArchitectureDiagram.tsx
import {
  IconLending, IconLiquidity, IconRWA, IconInsurance,
} from '@/components/icons/AdapterIcons';

const USER_NODES = [
  { label: 'Wallet',    sub: 'Phantom · Solflare' },
  { label: 'Dashboard', sub: 'Next.js + SDK'      },
  { label: 'CLI',       sub: 'dnipro generate'    },
];

const ADAPTERS = [
  { icon: IconLending,   name: 'Kamino',   sub: 'kUSDC · lending'      },
  { icon: IconLending,   name: 'MarginFi', sub: 'mfUSDC · lending'     },
  { icon: IconLiquidity, name: 'Jupiter',  sub: 'JLP · liquidity'      },
  { icon: IconRWA,       name: 'Maple',    sub: 'syrupUSDC · RWA'      },
  { icon: IconInsurance, name: 'Drift',    sub: 'IF-USDC · insurance'  },
];

export function ArchitectureDiagram() {
  return (
    <section className="py-24 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 max-w-2xl">
          <span className="tag mb-4">system map</span>
          <h2 className="heading-serif text-3xl sm:text-4xl mb-4">
            Core + adapters, one integration surface
          </h2>
          <p className="text-muted-foreground text-lg">
            The Dispatcher routes every call; the Registry decides what's
            allowed; adapters carry it the rest of the way.
          </p>
        </div>

        <div className="surface rounded-lg p-6 sm:p-8 overflow-x-auto">
          <div className="min-w-[760px] grid grid-cols-12 gap-6 items-stretch">

            {/* User layer */}
            <div className="col-span-3 flex flex-col gap-3">
              <div className="text-xs font-mono text-muted-foreground mb-1">user layer</div>
              {USER_NODES.map(n => (
                <div key={n.label} className="surface-flat rounded-lg p-4">
                  <div className="text-sm font-medium">{n.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{n.sub}</div>
                </div>
              ))}
            </div>

            {/* Connector column 1 */}
            <div className="col-span-1 flex flex-col items-center justify-center gap-2 text-dnipro-400">
              <ConnectorArrow label="deposit / withdraw" />
            </div>

            {/* Core */}
            <div className="col-span-4 flex flex-col gap-3">
              <div className="text-xs font-mono text-muted-foreground mb-1">dnipro core</div>

              <div className="rounded-lg border-2 border-dnipro-400/50 bg-dnipro-900/40 p-4">
                <div className="text-sm font-semibold text-dnipro-200">Dispatcher</div>
                <div className="text-xs text-dnipro-300/80 mt-1 font-mono">
                  deposit() · withdraw() · current_value()
                </div>
              </div>

              <div className="flex items-center justify-center text-xs text-muted-foreground py-0.5">
                validates against
              </div>

              <div className="rounded-lg border border-wheat-400/40 bg-wheat-900/20 p-4">
                <div className="text-sm font-semibold text-wheat-300">Registry</div>
                <div className="text-xs text-wheat-200/70 mt-1 font-mono">
                  governance · timelock · adapter records
                </div>
              </div>

              <div className="surface-flat rounded-lg p-3 mt-1">
                <div className="text-sm font-medium">Position PDA</div>
                <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                  ["position", user, adapter_id]
                </div>
              </div>
            </div>

            {/* Connector column 2 */}
            <div className="col-span-1 flex flex-col items-center justify-center gap-2 text-dnipro-400">
              <ConnectorArrow label="CPI" />
            </div>

            {/* Adapter layer */}
            <div className="col-span-3 flex flex-col gap-2">
              <div className="text-xs font-mono text-muted-foreground mb-1">adapter layer</div>
              {ADAPTERS.map(a => (
                <div key={a.name} className="surface-flat rounded-lg p-3 flex items-center gap-3">
                  <a.icon size={18} className="text-dnipro-400 shrink-0" />
                  <div>
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{a.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SDK footer */}
          <div className="mt-6 surface-flat rounded-lg p-4 text-center text-sm">
            <span className="font-mono text-wheat-300">@dnipro/sdk</span>
            <span className="mx-3 text-muted-foreground">—</span>
            <span className="text-muted-foreground">
              DniproClient · PDA helpers · instruction builders · account fetchers
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ConnectorArrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <svg width="40" height="16" viewBox="0 0 40 16" aria-hidden="true">
        <line x1="0" y1="8" x2="32" y2="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M28 4 L34 8 L28 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[10px] font-mono text-muted-foreground rotate-0">{label}</span>
    </div>
  );
}
