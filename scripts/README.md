# Dnipro scripts

The Colosseum Devnet build uses **Solana Playground + the web dashboard** as the canonical deployment/setup flow.

The old local initialization, adapter-registration, and program-ID sync scripts were removed because they targeted the pre-v2 account layout and could configure the wrong PDAs/program IDs.

Use:

- `playground/registry-lib.rs` to upgrade the existing Registry Playground project.
- `playground/dispatcher-lib.rs` to upgrade the existing Dispatcher Playground project.
- `playground/devnet-vault-lib.rs` to deploy the live Devnet USDC Vault adapter.
- The dashboard's **Initialize live demo** action to initialize the v2 PDAs and register the live adapter.

Core Devnet program IDs are intentionally fixed:

```text
Dispatcher: BfSctTciPvzNL3KwkNsQnqUmr5tK9R5B7zz6MCT845rt
Registry:   JBSNe6wmCMiJXemkHm7qTRNFaPDd8sjJdwwjYGiAgkfe
```

Do not run `anchor keys sync` against those core programs unless you deliberately want to create new identities and update the entire deployment.
