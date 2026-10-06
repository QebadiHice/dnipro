# Dnipro — Colosseum / Build for Breakpoint checklist

This file is intentionally practical: it separates what is already in the repository from what must be proven before submission.

## Product story

- [x] Clear target: Solana apps, wallets, and treasury products that would otherwise integrate yield venues one by one.
- [x] One-sentence value proposition visible in the hero.
- [x] Architecture explains dispatcher, registry, adapters, SDK, and reference app.
- [x] Repository does not claim simulated activity is real activity.

## On-chain proof

- [ ] Run `anchor build && anchor keys sync && npm run sync:ids && anchor build` with deployment keypairs generated locally.
- [ ] Deploy dispatcher + registry to devnet.
- [ ] Complete one adapter's real CPI to its underlying protocol.
- [ ] Deploy that adapter and register it.
- [ ] Execute deposit + withdraw from a wallet through the dispatcher.
- [ ] Add real Solscan program/transaction links to the submission.
- [ ] Record a backup demo video in case the RPC or wallet fails during Demo Day.

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
Show the adapter interface, dispatcher, and registry. Explain why one integration is the wedge.

**1:15–3:10 — Live proof**  
Connect wallet → choose the live adapter → deposit → show confirmation → show position → withdraw or show the withdrawal path → open Solscan.

**3:10–4:10 — Developer proof**  
Show the TypeScript SDK and `dnipro generate` CLI. Explain how a second app/protocol integrates.

**4:10–5:00 — PMF + growth**  
Show real user conversations, repeat usage, cost model, and the acquisition loop. End with the next measurable milestone, not a generic roadmap.
