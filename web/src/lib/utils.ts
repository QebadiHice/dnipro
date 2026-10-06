// web/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import BN from 'bn.js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsdc(amount: BN | number, decimals = 2): string {
  const n = typeof amount === 'number' ? amount : Number(amount.toString()) / 1e6;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(decimals)}`;
}

export function formatAddress(addr: string, chars = 4): string {
  if (!addr || addr.length < chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export function bpsToPercent(bps: number, decimals = 2): string {
  return (bps / 100).toFixed(decimals) + '%';
}

export function riskColor(score: number): string {
  if (score <= 30) return 'text-green-400';
  if (score <= 60) return 'text-yellow-400';
  return 'text-red-400';
}

export function riskLabel(score: number): 'Low' | 'Medium' | 'High' {
  if (score <= 30) return 'Low';
  if (score <= 60) return 'Medium';
  return 'High';
}

export function riskBadgeClass(score: number): string {
  if (score <= 30) return 'bg-green-400/10 text-green-400 border-green-400/20';
  if (score <= 60) return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
  return 'bg-red-400/10 text-red-400 border-red-400/20';
}

export function categoryLabel(category: number): string {
  return ['Lending', 'Liquidity', 'Real World Asset', 'Insurance', 'Other'][category] ?? 'Unknown';
}

export function categoryIcon(category: number): string {
  return ['🏦', '💧', '🌍', '🛡️', '🔧'][category] ?? '❓';
}

export function formatTimestamp(unixTs: number): string {
  return new Date(unixTs * 1000).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function estimateDailyYield(principalUsdc: number, apyBps: number): number {
  return (principalUsdc * apyBps) / (10_000 * 365);
}
