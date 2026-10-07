# Contributing to Dnipro

Dnipro is an open-source Solana adapter layer. Contributions are welcome across protocol adapters, SDK/CLI tooling, tests, documentation, and the reference dashboard.

## Development setup

```bash
git clone https://github.com/QebadiHice75/dnipro.git
cd dnipro
yarn install
cp web/.env.example web/.env.local
yarn build:sdk
yarn build:web
```

For the Colosseum Devnet deployment, Solana Playground is the canonical path. The Dispatcher and Registry already have fixed public program IDs, so **do not run `anchor keys sync` on them** unless you intentionally want new program identities.

See `docs/live-devnet-demo.md` and `playground/README.md` for the exact deployment flow.

## Adapter contributions

```bash
dnipro generate your-protocol
```

Implement the protocol-specific CPI in `programs/adapters/<protocol>/`, add integration tests, document all accounts and risk assumptions, then submit a PR.

A new adapter must not be marked `live` until the underlying protocol integration has been tested against the intended Solana cluster. The included `devnet-vault` adapter is a live routing proof, not an external yield venue.

## Pull requests

1. Fork and create a focused branch.
2. Run formatting, TypeScript checks, and relevant Anchor tests.
3. Explain security assumptions and any protocol-specific accounts.
4. Include transaction signatures for deployed integration tests when applicable.
5. Open a PR with a concise test plan.

## Security

Please use GitHub's private security-advisory flow for vulnerabilities. Do not publish exploitable details in a public issue.
