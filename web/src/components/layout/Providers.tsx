'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { clusterApiUrl } from '@solana/web3.js';

require('@solana/wallet-adapter-react-ui/styles.css');

const ConnectionProviderFixed: any = ConnectionProvider;
const WalletProviderFixed: any = WalletProvider;
const WalletModalProviderFixed: any = WalletModalProvider;

function configuredNetwork(): WalletAdapterNetwork {
  const value = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? 'devnet').toLowerCase();
  if (value === 'mainnet-beta' || value === 'mainnet') return WalletAdapterNetwork.Mainnet;
  if (value === 'testnet') return WalletAdapterNetwork.Testnet;
  return WalletAdapterNetwork.Devnet;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const network = configuredNetwork();
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl(network),
    [network]
  );
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProviderFixed endpoint={endpoint}>
      <WalletProviderFixed wallets={wallets} autoConnect>
        <WalletModalProviderFixed>{children}</WalletModalProviderFixed>
      </WalletProviderFixed>
    </ConnectionProviderFixed>
  );
}
