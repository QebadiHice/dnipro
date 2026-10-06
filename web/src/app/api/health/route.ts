import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? 'devnet';
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

  return NextResponse.json({
    ok: true,
    project: 'Dnipro',
    network,
    demoMode,
    liveTransactions: false,
    timestamp: new Date().toISOString(),
  });
}
