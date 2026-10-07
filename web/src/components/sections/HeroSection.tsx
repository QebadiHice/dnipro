'use client';

import Link from 'next/link';
import { ArrowRight, Github } from 'lucide-react';
import { motion } from 'framer-motion';
import { RiverBackground } from '@/components/visual/RiverBackground';
import { IconLending, IconLiquidity, IconRWA, IconInsurance } from '@/components/icons/AdapterIcons';

const PROTOCOLS = [
  { name: 'Kamino', icon: IconLending },
  { name: 'MarginFi', icon: IconLending },
  { name: 'Jupiter', icon: IconLiquidity },
  { name: 'Maple', icon: IconRWA },
  { name: 'Drift', icon: IconInsurance },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <RiverBackground className="opacity-80" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <div className="grid lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="tag mb-8"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-wheat-400" />
              Crypto World&apos;s Fair 2026 · Superteam UK Build for Breakpoint
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="heading-serif text-5xl sm:text-6xl lg:text-[4.5rem] leading-[1.05] mb-6"
            >
              One interface
              <br />
              for every
              <br />
              <span className="river-underline accent-text">current</span> of yield
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-xl mb-10"
            >
              Dnipro gives Solana apps, wallets, and treasury products one governed adapter layer
              for discovering and routing into yield venues without rebuilding every protocol integration.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center gap-3"
            >
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-md bg-wheat-400 px-6 py-3 text-sm font-semibold text-river-ink hover:bg-wheat-300 transition-colors"
              >
                Open reference app <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/architecture"
                className="flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-semibold hover:bg-secondary transition-colors"
              >
                Read the architecture
              </Link>
              <a
                href="https://github.com/QebadiHice75/dnipro"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Github className="h-4 w-4" /> GitHub
              </a>
            </motion.div>
          </div>

          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="surface rounded-lg overflow-hidden"
            >
              <div className="border-b border-border px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">adapter-manifest.json</span>
                <span className="text-xs font-mono text-wheat-300">5 reference</span>
              </div>
              <ul className="divide-y divide-border">
                {PROTOCOLS.map(({ name, icon: Icon }, i) => (
                  <motion.li
                    key={name}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + i * 0.06 }}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/50 transition-colors"
                  >
                    <Icon size={17} className="text-dnipro-400 shrink-0" />
                    <span className="text-sm font-medium flex-1">{name}</span>
                    <span className="text-xs font-mono text-muted-foreground">adapter</span>
                  </motion.li>
                ))}
              </ul>
              <div className="px-5 py-3 bg-secondary/40 text-xs font-mono text-muted-foreground">
                build once · add venues behind the same interface
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 pt-8 border-t border-border/60 flex flex-wrap gap-x-8 gap-y-3 text-xs font-mono text-muted-foreground"
        >
          <span>anchor 0.31.1</span>
          <span>solana programs</span>
          <span>governance registry</span>
          <span>typed sdk + cli</span>
          <span>mit licensed</span>
        </motion.div>
      </div>
    </section>
  );
}
