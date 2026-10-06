import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/layout/Providers';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Dnipro — Universal Yield Adapter Layer for Solana',
  description:
    'Dnipro gives Solana apps, wallets, and treasury products one governed adapter interface for multiple yield venues.',
  keywords: ['solana', 'defi', 'yield', 'adapter', 'treasury', 'kamino', 'marginfi', 'jupiter', 'maple', 'drift'],
  authors: [{ name: 'Dnipro' }],
  openGraph: {
    title: 'Dnipro — One interface for Solana yield',
    description: 'A governance-gated adapter layer for Solana yield integrations.',
    siteName: 'Dnipro',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Dnipro — One interface for Solana yield',
    description: 'A governance-gated adapter layer for Solana yield integrations.',
    creator: '@angelraptumde',
  },
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
