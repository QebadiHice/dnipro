# Solana Playground paste-ready files

Use these files for the browser deployment flow:

1. Existing `dnipro-registry` project → paste `registry-lib.rs` into `src/lib.rs`, Build, Deploy.
2. Existing `dnipro-dispatcher` project → paste `dispatcher-lib.rs` into `src/lib.rs`, Build, Deploy.
3. New Anchor project `dnipro-devnet-vault` → paste `devnet-vault-lib.rs` into `src/lib.rs`, Build, copy the generated public program ID, Deploy.
4. Put the new adapter ID in Vercel as `NEXT_PUBLIC_LIVE_ADAPTER_PROGRAM_ID`.
5. Redeploy the web app and click **Initialize live demo** once from the Dashboard.

Full instructions: `docs/live-devnet-demo.md`.
