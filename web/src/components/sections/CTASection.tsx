import Link from 'next/link';
import { ArrowRight, Github } from 'lucide-react';
import { RiverBackground } from '@/components/visual/RiverBackground';

export function CTASection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="surface rounded-lg p-12 sm:p-16 relative overflow-hidden text-center">
          <RiverBackground className="opacity-40" />
          <div className="relative">
            <span className="tag mb-5">open-source · solana</span>
            <h2 className="heading-serif text-3xl sm:text-4xl mb-4">Inspect the rails, then run the reference app</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Dnipro is being prepared for a live Colosseum demo. The repository is open today; deployed program and transaction links should be added as each live integration is verified.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 rounded-md bg-wheat-400 px-8 py-3.5 text-sm font-semibold text-river-ink hover:bg-wheat-300 transition-colors"
              >
                Open reference app <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://github.com/QebadiHice75/dnipro"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-md border border-border px-8 py-3.5 text-sm font-semibold hover:bg-secondary transition-colors"
              >
                <Github className="h-4 w-4" /> View source
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
