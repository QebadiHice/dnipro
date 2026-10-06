# Contributing to Dnipro

Dnipro is an open-source Solana yield adapter layer. Contributions are welcome across protocol adapters, SDK/CLI tooling, tests, documentation, and the reference dashboard.

## Development setup

```bash
git clone https://github.com/QebadiHice/dnipro.git
cd dnipro
yarn install
cp web/.env.example web/.env.local
anchor build
anchor keys sync
anchor build
anchor test
```

## Adapter contributions

```bash
dnipro generate your-protocol
```

Implement the protocol-specific CPI in `programs/adapters/<protocol>/`, add integration tests, document all accounts and risk assumptions, then submit a PR.

A new adapter should not be marked `live` until its underlying protocol integration has been tested against the intended Solana cluster.

## Pull requests

1. Fork and create a focused branch.
2. Run formatting, TypeScript checks, and relevant Anchor tests.
3. Explain security assumptions and any protocol-specific accounts.
4. Include transaction signatures for deployed integration tests when applicable.
5. Open a PR with a concise test plan.

## Security

Please use GitHub's private security-advisory flow for vulnerabilities. Do not publish exploitable details in a public issue.
