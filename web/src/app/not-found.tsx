// web/src/app/not-found.tsx
import Link from 'next/link';
import { DniproMark } from '@/components/icons/AdapterIcons';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-border text-muted-foreground">
          <DniproMark size={28} />
        </div>
        <h1 className="heading-serif text-6xl mb-4">404</h1>
        <h2 className="text-xl font-semibold mb-3">Lost upstream</h2>
        <p className="text-muted-foreground mb-8">
          This page doesn't exist or has drifted somewhere else.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="rounded-md bg-wheat-400 px-5 py-2.5 text-sm font-semibold text-river-ink hover:bg-wheat-300 transition-colors"
          >
            Back to shore
          </Link>
          <Link
            href="/docs"
            className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
          >
            Docs
          </Link>
        </div>
      </div>
    </div>
  );
}
