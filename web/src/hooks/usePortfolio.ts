'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { MOCK_POSITIONS, PORTFOLIO_SUMMARY, MOCK_ADAPTERS } from '@/lib/mockData';

export type PositionData = typeof MOCK_POSITIONS[number] & {
  adapter: typeof MOCK_ADAPTERS[number] | undefined;
};

export interface PortfolioSummary {
  positions: PositionData[];
  totalDeposited: number;
  totalValue: number;
  totalPnl: number;
  pnlPercent: string;
  positionCount: number;
}

export function usePortfolio() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

  const fetchPortfolio = useCallback(async () => {
    if (!connected || !publicKey) {
      setPortfolio(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (demoMode) {
        const positions: PositionData[] = MOCK_POSITIONS.map(p => ({
          ...p,
          adapter: MOCK_ADAPTERS.find(a => a.id === p.adapterId),
        }));

        setPortfolio({
          positions,
          totalDeposited: PORTFOLIO_SUMMARY.totalDeposited,
          totalValue: PORTFOLIO_SUMMARY.totalValue,
          totalPnl: PORTFOLIO_SUMMARY.totalPnl,
          pnlPercent: PORTFOLIO_SUMMARY.pnlPercent,
          positionCount: positions.length,
        });
        return;
      }

      // Production path after deployment:
      // const { DniproClient } = await import('@dnipro/sdk');
      // const client = new DniproClient(connection);
      // const result = await client.getPortfolioSummary(publicKey);
      setPortfolio(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected, connection, demoMode]);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  return { portfolio, loading, error, refetch: fetchPortfolio, demoMode };
}
