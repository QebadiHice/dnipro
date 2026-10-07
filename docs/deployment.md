# Dnipro Deployment Guide

Dnipro's Colosseum demo uses **Solana Playground for on-chain programs** and **Vercel for the Next.js web app**.

For the current live Devnet flow, follow [`live-devnet-demo.md`](live-devnet-demo.md).

## Architecture

```text
GitHub: QebadiHice75/dnipro
        │
        ├── programs/dispatcher ─────┐
        ├── programs/registry ───────┼── Solana Playground → Devnet
        └── programs/adapters/       │
            devnet-vault ────────────┘

        web/ ─────────────────────────── Vercel
```

## Core program IDs

```text
Dispatcher: BfSctTciPvzNL3KwkNsQnqUmr5tK9R5B7zz6MCT845rt
Registry:   JBSNe6wmCMiJXemkHm7qTRNFaPDd8sjJdwwjYGiAgkfe
```

Upgrade the existing Playground projects rather than generating new core IDs.

## Vercel

Import the GitHub repository and set:

```text
Framework: Next.js
Root Directory: web
Node.js: 22.x
```

Environment variables:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DISPATCHER_PROGRAM_ID=BfSctTciPvzNL3KwkNsQnqUmr5tK9R5B7zz6MCT845rt
NEXT_PUBLIC_REGISTRY_PROGRAM_ID=JBSNe6wmCMiJXemkHm7qTRNFaPDd8sjJdwwjYGiAgkfe
NEXT_PUBLIC_LIVE_ADAPTER_PROGRAM_ID=<DEPLOYED_DEVNET_VAULT_ADAPTER>
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

Keep `NEXT_PUBLIC_DEMO_MODE=true` because the external protocol routes remain reference integrations. The dashboard independently marks the Dnipro Devnet Vault as a live on-chain route when its adapter ID is configured and initialized.

Never put wallet seed phrases, private keys, or Solana deployment keypairs in Vercel environment variables.
