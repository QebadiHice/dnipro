# Dnipro live Devnet upgrade notes

This build is designed to turn the previous preview-only dashboard into a real Solana Devnet routing demo while keeping external protocol claims honest.

## Fixed core IDs

```text
Dispatcher: BfSctTciPvzNL3KwkNsQnqUmr5tK9R5B7zz6MCT845rt
Registry:   JBSNe6wmCMiJXemkHm7qTRNFaPDd8sjJdwwjYGiAgkfe
```

The repository source and web configuration use those IDs.

## What is live

The new **Dnipro USDC Devnet Vault** adapter can receive real Devnet test USDC through the Dispatcher, track the user's Dnipro Position PDA, and return the USDC through the same Dispatcher route. Every successful action produces a genuine Solana transaction signature.

This adapter is a routing/storage proof and intentionally reports no yield. It is not presented as Kamino, MarginFi, Jupiter, Maple, or Drift.

## What remains reference-only

Kamino, MarginFi, Jupiter, Maple/Syrup, and Drift remain visible as reference routes. Their APY/position screens are previews until protocol-specific CPI integrations are implemented and verified.

## Deployment sequence

1. In the existing Solana Playground Registry project, replace `src/lib.rs` with `playground/registry-lib.rs`, **Build**, then **Deploy**. Keep the existing Registry program ID.
2. In the existing Dispatcher Playground project, replace `src/lib.rs` with `playground/dispatcher-lib.rs`, **Build**, then **Deploy**. Keep the existing Dispatcher program ID.
3. Create a new Anchor Playground project named `dnipro-devnet-vault` and replace its `src/lib.rs` with `playground/devnet-vault-lib.rs`.
4. Build the new adapter once. Playground replaces the `111111...` placeholder with its new program ID. Copy that public ID, then Deploy.
5. Put that ID into `NEXT_PUBLIC_LIVE_ADAPTER_PROGRAM_ID` locally and in Vercel.
6. Redeploy Vercel.
7. Connect the Devnet Phantom wallet you want to become the Dnipro Registry governance / Dispatcher admin and click **Initialize live demo**. It does not need to be the Playground deployment wallet. Approve the missing setup transactions.
8. Deposit a small amount such as 1 USDC. Confirm that wallet USDC falls, Dnipro position/vault rise, and a real Solscan link appears.
9. Withdraw the same amount. Confirm the position/vault fall and wallet USDC returns.

## Vercel environment

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DISPATCHER_PROGRAM_ID=BfSctTciPvzNL3KwkNsQnqUmr5tK9R5B7zz6MCT845rt
NEXT_PUBLIC_REGISTRY_PROGRAM_ID=JBSNe6wmCMiJXemkHm7qTRNFaPDd8sjJdwwjYGiAgkfe
NEXT_PUBLIC_LIVE_ADAPTER_PROGRAM_ID=<NEW_PLAYGROUND_ADAPTER_ID>
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

Keep `NEXT_PUBLIC_DEMO_MODE=true` while the external-protocol routes remain reference integrations. The live vault route still sends real transactions.
