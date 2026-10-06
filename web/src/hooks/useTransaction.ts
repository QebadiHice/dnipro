'use client';

import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

export type TxStatus = 'idle' | 'building' | 'signing' | 'confirming' | 'success' | 'error';

export interface TxState {
  status: TxStatus;
  signature: string | null;
  error: string | null;
}

/**
 * Broadcasts only a real transaction provided by the caller.
 * This hook intentionally contains no fake-signature or fake-confirmation path.
 */
export function useTransaction() {
  const { sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [state, setState] = useState<TxState>({
    status: 'idle',
    signature: null,
    error: null,
  });

  const reset = useCallback(() => {
    setState({ status: 'idle', signature: null, error: null });
  }, []);

  const execute = useCallback(
    async (buildTx: () => Promise<import('@solana/web3.js').Transaction>) => {
      setState({ status: 'building', signature: null, error: null });
      try {
        const tx = await buildTx();
        setState(s => ({ ...s, status: 'signing' }));
        const sig = await sendTransaction(tx, connection, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        setState(s => ({ ...s, status: 'confirming', signature: sig }));
        await connection.confirmTransaction(sig, 'confirmed');
        setState({ status: 'success', signature: sig, error: null });
        return sig;
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        setState({ status: 'error', signature: null, error: msg });
        throw err;
      }
    },
    [sendTransaction, connection]
  );

  return { state, execute, reset };
}

export const isBusy = (s: TxStatus) => ['building', 'signing', 'confirming'].includes(s);
export const isDone = (s: TxStatus) => s === 'success' || s === 'error';
export const statusLabel: Record<TxStatus, string> = {
  idle: 'Ready',
  building: 'Building transaction…',
  signing: 'Sign in wallet…',
  confirming: 'Confirming on-chain…',
  success: 'Confirmed on-chain',
  error: 'Transaction failed',
};
