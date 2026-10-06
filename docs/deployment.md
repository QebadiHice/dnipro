# Dnipro Deployment Guide

Use **devnet first**. Do not move the reference build to mainnet until at least one adapter has a real underlying-protocol CPI, end-to-end tests, and a reviewed authority model.

## Prerequisites

- Rust toolchain
- Solana CLI compatible with the workspace
- Anchor CLI 0.31.1
- Node.js 18+
- Yarn
- A Solana keypair you control

## 1. Clone and install

```bash
git clone https://github.com/QebadiHice/dnipro.git
cd dnipro
yarn install
cp web/.env.example web/.env.local
```

## 2. Build and create deployment identities

The public IDs committed in the reference repository are not represented as deployed Dnipro programs. Generate your own deployment keypairs locally and keep them out of Git.

```bash
anchor build
anchor keys sync
npm run sync:ids
anchor build
```

`anchor keys sync` updates Anchor program IDs. `npm run sync:ids` propagates those public IDs into the SDK, scripts, tests, reference UI, and metadata. The repository ignores `*.keypair.json`; do not commit private deployment keypairs.

## 3. Test locally

```bash
solana config set --url localhost
anchor test
```

The current repository contains reference adapters. Passing local tests does **not** prove an underlying protocol integration is complete.

## 4. Deploy to devnet

```bash
solana config set --url devnet
solana airdrop 2
anchor deploy --provider.cluster devnet
```

After deployment, record every program address and verify it against the local keypair:

```bash
solana address -k target/deploy/dispatcher-keypair.json
solana address -k target/deploy/registry-keypair.json
solana address -k target/deploy/kamino_adapter-keypair.json
```

Repeat for any adapter you deploy.

## 5. Initialize Dnipro

```bash
CLUSTER=devnet ts-node scripts/initialize.ts
```

Use a dedicated governance keypair/multisig plan before any production deployment. Do not use a temporary developer wallet as permanent governance.

## 6. Register only verified adapters

Do not register all five simply because the source folders exist. Register an adapter only after its underlying protocol CPI and required accounts are implemented and tested.

Example:

```bash
ts-node scripts/register-adapter.ts --adapter kamino --cluster devnet
```

For the Colosseum demo, **one genuinely working adapter is stronger than five simulated adapters**.

## 7. Wire the reference dashboard to live data

Edit `web/.env.local`:

```bash
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_DISPATCHER_PROGRAM_ID=<DEPLOYED_DISPATCHER>
NEXT_PUBLIC_REGISTRY_PROGRAM_ID=<DEPLOYED_REGISTRY>
```

The current reference dashboard intentionally does not fake live transactions. Before setting demo mode to false, wire its deposit/withdraw actions to the deployed dispatcher and show Solscan links only for confirmed signatures.

## 8. Deploy the web app

```bash
cd web
vercel --prod
```

Set the same environment variables in Vercel. Add the returned deployment URL to the Colosseum submission.

## 9. Verify the demo before submission

For each claim you plan to make, keep a direct proof path:

```text
program -> Solscan program address
transaction -> confirmed signature
adapter -> protocol CPI + tested accounts
user -> permissioned feedback / repeat usage evidence
metric -> query or reproducible calculation
```

The web app exposes `/api/health` with its configured network and demo/live mode. After live wiring, extend that endpoint with RPC and program-account checks if useful.

## Mainnet

Treat mainnet as a separate release decision, not a hackathon checkbox. Before mainnet, review program upgrade authority, registry governance, timelock behavior, protocol-specific account constraints, fee handling, monitoring, incident procedures, and independent security review.
