// web/src/app/docs/build-adapter/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Build an Adapter — Dnipro',
  description: 'Step-by-step guide to building a Dnipro yield adapter',
};

export default function BuildAdapterPage() {
  return (
    <div className="min-h-screen py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link href="/docs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Docs
        </Link>

        <h1 className="heading-serif text-4xl mb-3">Build Your Own Adapter</h1>
        <p className="text-muted-foreground text-lg mb-10">
          Any Solana program can become a Dnipro-compatible yield adapter by implementing three instructions.
        </p>

        {/* Checklist */}
        <div className="surface rounded-lg p-6 mb-10">
          <h2 className="font-semibold mb-4">Checklist</h2>
          <div className="space-y-2">
            {[
              'Implement adapter_deposit(amount, min_shares_out) → u64',
              'Implement adapter_withdraw(shares, min_amount_out) → u64',
              'Implement adapter_current_value(shares) → u64',
              'Maintain adapter_state PDA at seeds ["adapter_state"]',
              'Maintain vault_authority PDA at seeds ["vault_authority"]',
              'Use checked arithmetic throughout',
              'Add slippage checks on deposit and withdraw',
              'Write integration tests',
              'Submit governance proposal to register',
            ].map(item => (
              <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-8">
          {[
            {
              step: '1',
              title: 'Generate the scaffold',
              code: `$ npm install -g @dnipro/cli
$ dnipro generate my-protocol

✔ Adapter name: my-protocol
✔ Category: Lending
✔ Underlying mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
✔ Author: My Team
✔ Has withdrawal delay: No

⚡ Generated: programs/adapters/my-protocol/
  ├── Cargo.toml
  ├── src/lib.rs        ← implement here
  ├── README.md
  └── tests/my-protocol.test.ts`,
              desc: 'The CLI generates a complete Anchor program with all boilerplate pre-wired. Only the protocol-specific business logic needs to be filled in.',
            },
            {
              step: '2',
              title: 'Implement adapter_deposit',
              code: `pub fn adapter_deposit(
    ctx: Context<AdapterDeposit>,
    params: AdapterDepositParams,
) -> Result<u64> {
    require!(params.amount > 0, AdapterError::ZeroAmount);
    require!(!ctx.accounts.adapter_state.deposits_paused, AdapterError::DepositsPaused);

    // 1. Calculate how many shares to mint
    //    This is protocol-specific: Kamino uses exchange rate,
    //    Jupiter uses pool NAV, etc.
    let shares = your_compute_shares(
        params.amount,
        ctx.accounts.adapter_state.share_price
    )?;
    require!(shares >= params.min_shares_out, AdapterError::SlippageExceeded);

    // 2. Transfer underlying tokens to your vault
    anchor_spl::token::transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to:   ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        }),
        params.amount,
    )?;

    // 3. Mint receipt/share tokens to user
    anchor_spl::token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint:      ctx.accounts.share_mint.to_account_info(),
                to:        ctx.accounts.user_share_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            &[&[b"vault_authority", &[state.vault_auth_bump]]],
        ),
        shares,
    )?;

    // 4. Update adapter state
    let state = &mut ctx.accounts.adapter_state;
    state.total_deposits = state.total_deposits.saturating_add(params.amount);
    state.last_updated = Clock::get()?.unix_timestamp;

    // 5. Return shares minted (used by Dispatcher for DepositEvent)
    Ok(shares)
}`,
              desc: 'Transfer tokens in, mint shares out. The Dispatcher calls this via CPI after deducting its protocol fee.',
            },
            {
              step: '3',
              title: 'Implement adapter_withdraw',
              code: `pub fn adapter_withdraw(
    ctx: Context<AdapterWithdraw>,
    params: AdapterWithdrawParams,
) -> Result<u64> {
    require!(params.shares > 0, AdapterError::ZeroAmount);

    let state = &ctx.accounts.adapter_state;
    let amount = your_compute_amount(params.shares, state.share_price)?;
    require!(amount >= params.min_amount_out, AdapterError::SlippageExceeded);

    // 1. Burn shares from user
    anchor_spl::token::burn(/* ... */, params.shares)?;

    // 2. Transfer tokens from vault to user
    anchor_spl::token::transfer(
        CpiContext::new_with_signer(/* vault_authority signs */, Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to:   ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        }, &[&[b"vault_authority", &[state.vault_auth_bump]]]),
        amount,
    )?;

    let state = &mut ctx.accounts.adapter_state;
    state.total_deposits = state.total_deposits.saturating_sub(amount);

    Ok(amount)  // Dispatcher uses this for WithdrawEvent
}`,
              desc: 'Burn shares, return tokens. For adapters with withdrawal delays (Maple, Drift), queue the request and return 0 — the user claims later.',
            },
            {
              step: '4',
              title: 'Implement adapter_current_value',
              code: `/// Read-only instruction — NO state mutation.
/// Returns the current underlying token value of \`shares\`.
pub fn adapter_current_value(
    ctx: Context<AdapterCurrentValue>,
    shares: u64,
) -> Result<u64> {
    let state = &ctx.accounts.adapter_state;
    
    // For lending adapters: shares * exchange_rate / 10_000
    let value = (shares as u128)
        .checked_mul(state.exchange_rate_bps as u128)
        .ok_or(error!(AdapterError::Overflow))?
        .checked_div(10_000)
        .ok_or(error!(AdapterError::Overflow))? as u64;
    
    Ok(value)
}`,
              desc: 'This is a view function. The Dispatcher calls it to populate the position value in the dashboard. Return the current USDC-equivalent value of the shares.',
            },
            {
              step: '5',
              title: 'Build, deploy, and register',
              code: `# Build
anchor build -p my-protocol-adapter

# Deploy to devnet first
anchor deploy -p my-protocol-adapter --provider.cluster devnet

# Note your program ID from target/deploy/my_protocol_adapter-keypair.json
solana address -k target/deploy/my_protocol_adapter-keypair.json

# Update declare_id! in src/lib.rs with your program ID
# Then rebuild and deploy to mainnet

# Register with Dnipro governance
dnipro register my-protocol
# → Submits governance proposal
# → After timelock (48h on mainnet), adapter is live`,
              desc: 'Deploy to devnet first, run your tests, then mainnet. The registration creates an AdapterRecord PDA in the Dnipro Registry that the Dispatcher validates.',
            },
          ].map(({ step, title, code, desc }) => (
            <div key={step} className="flex gap-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-wheat-400/40 bg-wheat-900/30 text-wheat-300 font-mono font-medium">
                {step}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg mb-3">{title}</h3>
                <pre className="surface rounded-xl p-4 text-xs font-mono text-dnipro-200 overflow-x-auto mb-3 leading-relaxed">
                  <code>{code}</code>
                </pre>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Security checklist */}
        <div className="surface rounded-lg p-6 mt-10 border border-yellow-400/20">
          <h2 className="font-semibold mb-4 text-yellow-400">Security Checklist</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            {[
              'Use checked_mul / checked_div for all arithmetic — never allow overflow',
              'Enforce min_shares_out / min_amount_out on every trade',
              'Validate that vault and share_mint match adapter_state before any transfer',
              'Use vault_authority PDA (not a keypair) to sign vault transfers',
              'Test edge cases: zero amounts, maximum amounts, rounding errors',
              'Consider what happens if the underlying protocol is paused or has a bug',
              'Document withdrawal delays clearly in metadata_uri',
            ].map(item => (
              <div key={item} className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">⚠</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
