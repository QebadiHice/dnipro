import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? 'devnet';
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
  const dispatcher = process.env.NEXT_PUBLIC_DISPATCHER_PROGRAM_ID ?? null;
  const registry = process.env.NEXT_PUBLIC_REGISTRY_PROGRAM_ID ?? null;
  const liveAdapter = process.env.NEXT_PUBLIC_LIVE_ADAPTER_PROGRAM_ID ?? null;

  return NextResponse.json({
    ok: true,
    project: 'Dnipro',
    network,
    demoMode,
    coreProgramsConfigured: Boolean(dispatcher && registry),
    liveAdapterConfigured: Boolean(liveAdapter),
    liveTransactions: Boolean(dispatcher && registry && liveAdapter),
    timestamp: new Date().toISOString(),
  });
}
