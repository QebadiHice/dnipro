'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { MOCK_ADAPTERS } from '@/lib/mockData';

export type AdapterData = typeof MOCK_ADAPTERS[number];

/**
 * Adapter discovery hook. In demo mode it returns the explicitly-labelled
 * reference data. After deployment this is the place to swap in DniproClient.
 */
export function useAdapters() {
  const { connection } = useConnection();
  const [adapters, setAdapters] = useState<AdapterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

  const fetchAdapters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (demoMode) {
        setAdapters(MOCK_ADAPTERS);
        return;
      }

      // Production path after program deployment:
      // const { DniproClient } = await import('@dnipro/sdk');
      // const client = new DniproClient(connection);
      // const result = await client.getAllAdapters();
      // setAdapters(result as AdapterData[]);
      setAdapters(MOCK_ADAPTERS);
    } catch (e) {
      setError(e as Error);
      setAdapters(MOCK_ADAPTERS);
    } finally {
      setLoading(false);
    }
  }, [connection, demoMode]);

  useEffect(() => { fetchAdapters(); }, [fetchAdapters]);

  return { adapters, loading, error, refetch: fetchAdapters, demoMode };
}

export function useAdapter(id: string) {
  const { adapters, loading, error, demoMode } = useAdapters();
  const adapter = adapters.find(a => a.id === id) ?? null;
  return { adapter, loading, error, demoMode };
}
