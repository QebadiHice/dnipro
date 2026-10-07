# Live Devnet Demo — Dnipro v2

This build includes a real Solana Devnet deposit/withdraw path for **test USDC**:

```text
Phantom / Solflare
      ↓
Dnipro Dashboard
      ↓
Dispatcher
      ↓  validates Registry adapter record
Registry
      ↓
Dnipro USDC Devnet Vault adapter
      ↓
program-controlled SPL-token vault
```

The live vault is a proof of the Dnipro adapter standard. It is intentionally **not** represented as Kamino, MarginFi, Jupiter, Maple, Drift, or as a yield-bearing production strategy. Those protocol routes stay labelled reference integrations until their protocol-specific CPIs are implemented and verified.

## Deployed core program IDs

```text
Dispatcher: BfSctTciPvzNL3KwkNsQnqUmr5tK9R5B7zz6MCT845rt
Registry:   JBSNe6wmCMiJXemkHm7qTRNFaPDd8sjJdwwjYGiAgkfe
```

These are the existing Solana Playground deployment identities. Upgrade those same Playground projects with the current source in:

```text
programs/dispatcher/src/lib.rs
programs/registry/src/lib.rs
```

Do not create new Dispatcher/Registry projects unless you intend to change the public program IDs.

## 1. Upgrade Registry in Solana Playground

Open your existing `dnipro-registry` project.

Replace its `src/lib.rs` with the current repository file:

```text
programs/registry/src/lib.rs
```

Build. Confirm the `declare_id!` remains:

```text
JBSNe6wmCMiJXemkHm7qTRNFaPDd8sjJdwwjYGiAgkfe
```

Then Deploy to upgrade the existing program.

## 2. Upgrade Dispatcher

Open your existing `dnipro-dispatcher` Playground project.

Replace `src/lib.rs` with:

```text
programs/dispatcher/src/lib.rs
```

Build. Confirm the program ID remains:

```text
BfSctTciPvzNL3KwkNsQnqUmr5tK9R5B7zz6MCT845rt
```

Deploy the upgrade.

## 3. Deploy the live adapter

Create a new **Anchor** project in Solana Playground named:

```text
dnipro-devnet-vault
```

Replace its starter `src/lib.rs` with:

```text
programs/adapters/devnet-vault/src/lib.rs
```

The repository file deliberately uses:

```rust
declare_id!("11111111111111111111111111111111");
```

On the first Playground build, Playground assigns the project program identity. Keep the generated ID and Deploy.

Copy only the public adapter program ID. Never copy or share a deployment private key or wallet recovery phrase.

## 4. Configure local/Vercel environment

Set:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DISPATCHER_PROGRAM_ID=BfSctTciPvzNL3KwkNsQnqUmr5tK9R5B7zz6MCT845rt
NEXT_PUBLIC_REGISTRY_PROGRAM_ID=JBSNe6wmCMiJXemkHm7qTRNFaPDd8sjJdwwjYGiAgkfe
NEXT_PUBLIC_LIVE_ADAPTER_PROGRAM_ID=<YOUR_NEW_ADAPTER_PROGRAM_ID>
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

The Devnet USDC mint above is test-only.

## 5. Initialize once from the dashboard

Redeploy/restart the web app and connect the wallet you want to act as the Devnet admin.

The dashboard will show **Initialize live demo** if the v2 accounts do not exist yet. Clicking it sends only the missing setup transactions, in order:

1. Initialize Registry v2 config.
2. Initialize Dispatcher v2 config and authority PDA.
3. Initialize the adapter state and token vault.
4. Register that adapter in Registry.

Each transaction requires wallet approval.

## 6. Test a real deposit

Get test USDC for the connected wallet and open **Dnipro USDC Devnet Vault**.

Enter, for example:

```text
5 USDC
```

Click **Deposit 5 USDC on-chain**.

Expected proof:

- Phantom/Solflare approval appears.
- Transaction confirms on Devnet.
- Wallet USDC decreases by 5.
- Dnipro position increases by 5.
- Adapter vault increases by 5.
- A real Solscan transaction link appears.

## 7. Test a real withdrawal

Open **Withdraw**, enter an amount or click **MAX**, approve the wallet transaction, then verify:

- wallet USDC increases;
- Dnipro position decreases;
- vault balance decreases;
- the dashboard shows a real Solscan transaction link.

## What this proves

This live route proves the core Dnipro abstraction end-to-end: one wallet-facing transaction surface, Registry-gated adapter routing, CPI into an adapter, program-controlled custody, position tracking, withdrawal, and verifiable Solana signatures.

It does **not** yet prove protocol-specific yield. A real Kamino/MarginFi/etc. adapter is the next integration milestone and should replace the Devnet vault route only after its external protocol accounts and CPI path are verified.
