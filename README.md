# ⚡ Dnipro: Universal Yield Adapter Layer for Solana

> One integration for Solana yield venues, built as an open-source submission for Crypto World's Fair 2026 and the Superteam UK Build for Breakpoint ecosystem.

Dnipro is an open-source adapter-layer architecture for giving Solana applications, wallets, and treasury products one interface for discovering and routing into yield venues. Instead of integrating every protocol independently, an app can integrate the Dnipro dispatcher once and address adapters through the same deposit, withdraw, and current-value surface.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Anchor](https://img.shields.io/badge/Anchor-0.31.1-purple)](https://anchor-lang.com)
[![Solana](https://img.shields.io/badge/Solana-2.2.20-green)](https://solana.com)
[![World's Fair 2026](https://img.shields.io/badge/Crypto%20World's%20Fair-2026-f0b44d)](https://colosseum.com/worldsfair)

## Why Dnipro

Yield integrations are fragmented. Each venue exposes different accounts, instruction shapes, share accounting, risk assumptions, and withdrawal behavior. That creates repeated engineering work for any product that wants to offer multiple yield sources.

Dnipro separates that complexity into two layers:

- **Dispatcher** — one transaction surface for deposit/withdraw, Registry-gated routing, and per-user position PDAs.
- **Registry** — governance-controlled adapter allowlist with program, mint, state, vault, and active-status records.
- **Adapters** — programs behind the standard route interface. The included Devnet Vault is live; protocol-specific adapters remain reference integrations.
- **SDK + CLI** — typed integration tooling for apps and adapter builders.
- **Reference dashboard** — wallet-native UX that demonstrates the integration path.

## Architecture

```text
Wallet / App / Treasury / CLI
            │
            ▼
    ┌──────────────────┐       ┌──────────────────┐
    │    Dispatcher    │      ·│     Registry     │
    │ deposit()        │ verify│ Adapter records  │
    │ withdraw()       │ route │ Governance       │
    │ position PDA     │       │ Active status    │
    └────────┬─────────┘       └──────────────────┘
             │ CPI
      ┌──────┴──────────────────────────────┐
      │             Adapter layer          │
      │ Live Devnet USDC Vault              │
      │ Kamino · MarginFi · Jupiter · ...  │
      └─────────────────────────────────────┘
```

## Current build status

Dnipro now has two explicit layers:

- **Live Devnet route** — the deployed Dispatcher and Registry can route real **test USDC** into the included Dnipro Devnet Vault adapter, track the user's on-chain position, withdraw it, and expose the confirmed Solana signature in the dashboard.
- **Protocol reference routes** — Kamino, MarginFi, Jupiter, Maple/Syrup, and Drift remain clearly labelled reference integrations until their protocol-specific CPIs and account sets are implemented and verified.

The live vault is intentionally not described as yield-bearing. It proves the adapter standard and transaction path without making an unsupported protocol claim. See [`docs/live-devnet-demo.md`](docs/live-devnet-demo.md) for the Solana Playground + Vercel setup.

Deployed core Devnet identities:

```text
Dispatcher: BfSctTciPvzNL3KwkNsQnqUmr5tK9R5B7zz6MCT845rt
Registry:   JBSNe6wmCMiJXemkHm7qTRNFaPDd8sjJdwwjYGiAgkfe
```

## Quick start

```bash
# Clone
git clone https://github.com/QebadiHice75/dnipro.git
cd dnipro

# Install workspace dependencies
yarn install

# Copy web environment
cp web/.env.example web/.env.local

# Build the TypeScript packages
yarn build:sdk
yarn build:cli

# Start the web app
yarn dev
```

### On-chain programs

The Colosseum Devnet build uses **Solana Playground** for deployment. The Dispatcher and Registry identities are already fixed to the public Devnet IDs shown above. Do **not** run `anchor keys sync` against those two programs unless you deliberately want to create different program identities.

For the live demo, upgrade the existing Playground projects with the current `programs/dispatcher/src/lib.rs` and `programs/registry/src/lib.rs`, then deploy the included `programs/adapters/devnet-vault` as a new Playground program. Full steps are in [`docs/live-devnet-demo.md`](docs/live-devnet-demo.md).

Local Anchor builds remain useful for development if you maintain matching keypairs, but the browser deployment path is the canonical hackathon demo flow.

## SDK

```ts
import { DniproClient, ADAPTER_PROGRAM_IDS, usdcToAtomics } from '@dnipro/sdk';

const client = new DniproClient(connection);
const adapters = await client.getActiveAdapters();

const preview = await client.simulateDeposit(
  ADAPTER_PROGRAM_IDS.kamino,
  usdcToAtomics(100)
);
```

## CLI

```bash
npm install -g @dnipro/cli
dnipro generate my-protocol
dnipro list
dnipro inspect kamino
dnipro portfolio <wallet>
```

## Reference adapters

| Adapter | Category | Repository status |
|---|---|---|
| Kamino USDC | Lending | Reference adapter |
| MarginFi USDC | Lending | Reference adapter |
| Jupiter JLP | Liquidity | Reference adapter |
| Maple / Syrup | RWA / credit | Reference adapter |
| Drift Insurance Fund | Insurance | Reference adapter |

Protocol APY, TVL, and risk change over time. Production deployments should read or index current protocol data instead of relying on the sample values used by the reference UI.

## Colosseum demo target

For the five-minute judge flow, the strongest version is:

1. Connect a wallet on devnet or mainnet.
2. Select one fully deployed live adapter.
3. Deposit a small amount through the Dnipro dispatcher.
4. Show the updated position in the dashboard.
5. Open the real transaction on Solscan.
6. Show how the same interface can route to another adapter.
7. Close with real user evidence: interviews, repeat testers, and the acquisition loop.

See [`docs/colosseum-checklist.md`](docs/colosseum-checklist.md) for the remaining submission checklist.

## Competition context

Dnipro is being prepared for **Crypto World's Fair 2026 / Colosseum** and **Superteam UK Build for Breakpoint**. Those programs are submission channels and communities around the project; they do not own or operate Dnipro.

- X: [@angelraptumde](https://x.com/angelraptumde)
- GitHub: [QebadiHice75/dnipro](https://github.com/QebadiHice75/dnipro)

## Security

This repository is an early-stage protocol implementation and has not been represented as audited. Do not route production funds through an undeployed or unaudited build. Report security issues through a private GitHub security advisory rather than a public issue.

## License

MIT © 2026 Dnipro contributors.
