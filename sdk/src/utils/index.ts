// sdk/src/utils/index.ts
import BN from 'bn.js';
import { USDC_DECIMALS, USDC_BASE } from '../constants';

export function formatUsdc(amount: BN, decimals = 2): string {
  const n = Number(amount.toString()) / USDC_BASE;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(decimals)}`;
}

export function bpsToPercent(bps: number, decimals = 2): string {
  return (bps / 100).toFixed(decimals) + '%';
}

export function riskLabel(score: number): 'Low' | 'Medium' | 'High' {
  if (score <= 30) return 'Low';
  if (score <= 60) return 'Medium';
  return 'High';
}

export function usdcToAtomics(usdcAmount: number): BN {
  return new BN(Math.floor(usdcAmount * USDC_BASE));
}

export function atomicsToUsdc(atomics: BN): number {
  return Number(atomics.toString()) / USDC_BASE;
}

export function apyToApr(apyBps: number): number {
  // APR = (1 + APY)^(1/365) - 1, approximated
  const apy = apyBps / 10000;
  return ((1 + apy) ** (1 / 365) - 1) * 365 * 10000;
}

export function estimateDailyYield(principal: BN, apyBps: number): BN {
  const dailyRateBps = apyBps / 365;
  return principal.muln(Math.floor(dailyRateBps)).divn(10000);
}

export function formatAddress(pubkey: string, chars = 4): string {
  return `${pubkey.slice(0, chars)}...${pubkey.slice(-chars)}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function formatTimestamp(unixTs: number): string {
  return new Date(unixTs * 1000).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}
