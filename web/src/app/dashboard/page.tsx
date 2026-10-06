import type { Metadata } from 'next';
import { DashboardClient } from './DashboardClient';

export const metadata: Metadata = {
  title: 'Reference Dashboard — Dnipro',
  description: 'Connect a Solana wallet and inspect the Dnipro reference adapter flow.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
