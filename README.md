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

- **Dispatcher** — one transaction surface for deposit, withdraw, and position reads.
- **Registry** — governance-controlled discovery and adapter metadata.
- **Adapters** — protocol-specific programs that implement the same interface.
- **SDK + CLI** — typed integration tooling for apps and adapter builders.
- **Reference dashboard** — wallet-native UX that demonstrates the integration path.

## Architecture

```text
Wallet / App / Treasury / CLI
            │
            ▼
    ┌──────────────────┐       ┌──────────────────┐
    │    Dispatcher    │      ·│     Registry     │
    │ deposit()        │ policy│ Adapter records  │
    │ withdraw()       │ target│ Governance       │
    │ current_value()  │       │ Timelock model   │
    └────────┬─────────┘       └──────────────────┘
             │ CPI
      ┌──────┴──────────────────────────────┐
      │             Adapter layer          │
      │ Kamino · MarginFi · Jupiter        │
      │ Maple · Drift                      │
      └─────────────────────────────────────┘
```

## Current build status

Dnipro currently ships a complete reference architecture: Anchor dispatcher + registry programs, five adapter implementations, TypeScript SDK, CLI generator, docs, tests, and the Next.js reference dashboard.

The adapter set is intentionally labelled **reference** until each underlying protocol CPI is completed, its account wiring matches the dispatcher path, Registry enforcement is added to routing, and the programs are deployed and tested. The dashboard also labels sample portfolio/APY data as demo data. We do not present simulated transactions as confirmed on-chain activity.

Before a public demo, complete at least one adapter end-to-end, finish dispatcher↔registry enforcement and share accounting for that path, deploy to devnet, and publish the resulting Solana addresses/transaction links.

## Quick start

```bash
# Clone
git clone https://github.com/QebadiHice/dnipro.git
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

### Anchor programs

```bash
# Build programs and generate deploy keypairs
anchor build

# IMPORTANT: sync declare_id! values with generated keypairs
anchor keys sync

# Propagate the synced public IDs into the SDK, scripts, tests, UI metadata
npm run sync:ids

# Rebuild after syncing program IDs
anchor build

# Run local integration tests
anchor test
```

The public keys committed in this repository are **reference IDs only**. Run `anchor keys sync` followed by `npm run sync:ids` before your deployment. Commit only the resulting public addresses and source changes never private keypair files.

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
- GitHub: [QebadiHice/dnipro](https://github.com/QebadiHice/dnipro)

## Security

This repository is an early-stage protocol implementation and has not been represented as audited. Do not route production funds through an undeployed or unaudited build. Report security issues through a private GitHub security advisory rather than a public issue.

## License

MIT © 2026 Dnipro contributors.
