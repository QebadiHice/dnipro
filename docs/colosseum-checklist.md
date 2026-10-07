# Dnipro — Colosseum / Build for Breakpoint checklist

This checklist separates what exists in the repository from what still needs on-chain proof before submission.

## Product story

- [x] Clear target: Solana apps, wallets, and treasury products that would otherwise integrate yield venues one by one.
- [x] One-sentence value proposition visible in the hero.
- [x] Architecture explains Dispatcher, Registry, adapters, SDK, and reference app.
- [x] Reference protocol routes are clearly separated from live on-chain behavior.

## On-chain proof

- [x] Core Devnet program identities created: Dispatcher + Registry.
- [ ] Upgrade the existing Playground Registry with `playground/registry-lib.rs` and deploy it under the same Registry ID.
- [ ] Upgrade the existing Playground Dispatcher with `playground/dispatcher-lib.rs` and deploy it under the same Dispatcher ID.
- [ ] Create/deploy the `dnipro-devnet-vault` Playground program from `playground/devnet-vault-lib.rs`.
- [ ] Put the new adapter public ID in `NEXT_PUBLIC_LIVE_ADAPTER_PROGRAM_ID` locally and in Vercel.
- [ ] Use **Initialize live demo** once from the dashboard to create the v2 PDAs and register the adapter.
- [ ] Execute a real test-USDC deposit through Dispatcher → Registry-gated adapter → SPL vault.
- [ ] Execute a real withdrawal and confirm the wallet balance returns.
- [ ] Save real Solscan transaction links for the pitch/demo.
- [ ] Record a backup demo video in case the RPC or wallet fails during Demo Day.
- [ ] After the routing proof is stable, replace the vault proof with the first verified external-protocol CPI adapter.

## PMF evidence

Use real evidence only.

- [ ] Record at least 5–10 conversations with the target user segment.
- [ ] Capture the exact repeated pain: duplicated protocol integration work, treasury fragmentation, or another validated problem.
- [ ] Put the build in front of at least 3 real testers/users.
- [ ] Track who comes back and what they use twice.
- [ ] Save short permissioned quotes and screenshots.
- [ ] Quantify time/cost saved compared with integrating venues separately.

## Feasibility

- [ ] Document RPC/indexing cost.
- [ ] Document Solana transaction fees and any Dnipro fee assumptions.
- [ ] Separate protocol risk from Dnipro smart-contract risk.
- [ ] State who controls registry governance and the planned multisig/timelock.
- [ ] Do not describe the contracts as audited unless an audit exists.

## Growth engine

- [ ] Choose one initial wedge (for example: wallet/treasury developers).
- [ ] Define the acquisition path: direct integrations, developer partnerships, ecosystem bounties, or another tested path.
- [ ] Define a compounding metric such as integrated apps → routed users → protocol demand → more adapters.
- [ ] Track the metric instead of using vanity waitlist numbers.

## Submission package

- [ ] Colosseum project page completed before the published deadline.
- [ ] Superteam Earn submission completed when eligible.
- [ ] Build for Breakpoint Key requirement confirmed.
- [ ] Country information on Colosseum is accurate for the founder/team's eligibility.
- [ ] GitHub repository public and README current.
- [ ] Live URL deployed.
- [ ] 5-minute demo script rehearsed.
- [ ] One-page traction / evidence sheet ready for Demo Day.

## Suggested 5-minute demo

**0:00–0:35 — Problem**  
A Solana product that wants multiple yield venues has to repeatedly integrate different accounts, instructions, receipts, and withdrawal rules.

**0:35–1:15 — Dnipro**  
Show the adapter interface, Dispatcher, and Registry. Explain why one integration is the wedge.

**1:15–3:10 — Live proof**  
Connect wallet → choose **Dnipro USDC Devnet Vault** → deposit → approve in Phantom → show confirmation → show on-chain position/vault → withdraw → open Solscan.

**3:10–4:10 — Developer proof**  
Show the TypeScript SDK and common route interface. Explain how an external protocol adapter plugs into the same Dispatcher path.

**4:10–5:00 — PMF + growth**  
Show real user conversations, repeat usage, cost model, and the acquisition loop. End with the next measurable milestone.
