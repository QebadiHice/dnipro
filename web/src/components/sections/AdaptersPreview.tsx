'use client';

import Link from 'next/link';
import { ArrowRight, Clock, FlaskConical, Layers3 } from 'lucide-react';
import { MOCK_ADAPTERS } from '@/lib/mockData';
import { ProtocolMark, CATEGORY_ICONS } from '@/components/icons/AdapterIcons';

export function AdaptersPreview() {
  return (
    <section className="py-24 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 max-w-2xl">
          <span className="tag mb-4">05 reference adapters</span>
          <h2 className="heading-serif text-3xl sm:text-4xl mb-4">
            Five venues, <span className="river-underline">one adapter contract</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Each module demonstrates the same Dnipro interface while keeping venue-specific logic isolated behind the adapter boundary.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MOCK_ADAPTERS.map((adapter) => {
            const CategoryIcon = CATEGORY_ICONS[adapter.category];
            return (
              <Link
                key={adapter.id}
                href={`/adapters/${adapter.id}`}
                className="group surface rounded-lg p-6 hover:border-dnipro-500/50 transition-colors duration-200"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <ProtocolMark letter={adapter.icon} className="text-dnipro-400 shrink-0" size={36} />
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-dnipro-300 transition-colors">
                        {adapter.name}
                      </h3>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <CategoryIcon size={13} />
                        {adapter.categoryLabel}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-md border border-wheat-400/30 bg-wheat-400/5 text-wheat-300">
                    Reference
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-border/60">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Layers3 className="h-3.5 w-3.5 text-dnipro-400" />
                      <span className="text-xs text-muted-foreground">Interface</span>
                    </div>
                    <span className="text-sm font-semibold">deposit · withdraw</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <FlaskConical className="h-3.5 w-3.5 text-wheat-300" />
                      <span className="text-xs text-muted-foreground">UI data</span>
                    </div>
                    <span className="text-sm font-semibold">Sample</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{adapter.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {adapter.withdrawalDelay ? (
                      <><Clock className="h-3.5 w-3.5" /> models {adapter.withdrawalDelay} unlock</>
                    ) : (
                      <><span className="h-1.5 w-1.5 rounded-full bg-dnipro-400" /> instant-withdraw model</>
                    )}
                  </div>
                  <span className="text-xs text-dnipro-400 group-hover:gap-2 flex items-center gap-1 transition-all">
                    View adapter <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link href="/adapters" className="inline-flex items-center gap-2 text-sm text-dnipro-400 hover:text-dnipro-300 transition-colors">
            Explore the reference adapters <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
