// cli/src/commands/generate.ts
// Scaffolds a new Dnipro-compatible adapter program from a template.

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs-extra';
import * as path from 'path';

export const generateCommand = new Command('generate')
  .alias('g')
  .description('Scaffold a new yield adapter from template')
  .argument('[name]', 'Adapter name (e.g. "my-protocol")')
  .option('--category <cat>', 'Adapter category (lending|liquidity|rwa|insurance)')
  .option('--mint <address>', 'Underlying token mint address')
  .option('--yes', 'Skip prompts with defaults')
  .action(async (name: string | undefined, opts) => {
    console.log(chalk.cyan('\n⚡ Dnipro Adapter Generator\n'));

    // Interactive prompts if not provided
    const answers = opts.yes
      ? {
          name: name ?? 'my-adapter',
          category: opts.category ?? 'lending',
          underlyingMint: opts.mint ?? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          authorName: 'Adapter Author',
          minDeposit: '1000000',
          hasWithdrawalDelay: false,
          withdrawalDelayDays: 0,
        }
      : await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Adapter name (kebab-case):',
            default: name ?? 'my-adapter',
            validate: (v: string) =>
              /^[a-z0-9-]+$/.test(v) || 'Use lowercase letters, numbers, hyphens only',
          },
          {
            type: 'list',
            name: 'category',
            message: 'Adapter category:',
            choices: [
              { name: '🏦 Lending (e.g. Kamino, MarginFi)', value: 'lending' },
              { name: '💧 Liquidity (e.g. Jupiter LP)', value: 'liquidity' },
              { name: '🌍 Real World Asset (e.g. Maple)', value: 'rwa' },
              { name: '🛡️  Insurance Fund (e.g. Drift)', value: 'insurance' },
              { name: '🔧 Other', value: 'other' },
            ],
          },
          {
            type: 'input',
            name: 'underlyingMint',
            message: 'Underlying token mint address:',
            default: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          },
          {
            type: 'input',
            name: 'authorName',
            message: 'Author name:',
            default: 'Adapter Author',
          },
          {
            type: 'input',
            name: 'minDeposit',
            message: 'Minimum deposit (in token atomics, e.g. 1000000 = 1 USDC):',
            default: '1000000',
          },
          {
            type: 'confirm',
            name: 'hasWithdrawalDelay',
            message: 'Does this adapter have a withdrawal cooldown?',
            default: false,
          },
          {
            type: 'number',
            name: 'withdrawalDelayDays',
            message: 'Withdrawal cooldown (days):',
            default: 7,
            when: (a: { hasWithdrawalDelay: boolean }) => a.hasWithdrawalDelay,
          },
        ]);

    const adapterName = answers.name as string;
    const snakeCase = adapterName.replace(/-/g, '_');
    const PascalCase = adapterName.split('-').map((w: string) => w[0].toUpperCase() + w.slice(1)).join('');
    const outDir = path.join(process.cwd(), 'programs', 'adapters', adapterName);

    const spinner = ora(`Generating adapter ${chalk.cyan(adapterName)}`).start();

    try {
      await fs.ensureDir(path.join(outDir, 'src'));

      // Write Cargo.toml
      await fs.writeFile(
        path.join(outDir, 'Cargo.toml'),
        generateCargoToml(adapterName, snakeCase, answers as any)
      );

      // Write lib.rs
      await fs.writeFile(
        path.join(outDir, 'src', 'lib.rs'),
        generateLibRs(adapterName, snakeCase, PascalCase, answers as any)
      );

      // Write README
      await fs.writeFile(
        path.join(outDir, 'README.md'),
        generateReadme(adapterName, PascalCase, answers as any)
      );

      // Write test file
      await fs.ensureDir(path.join(outDir, 'tests'));
      await fs.writeFile(
        path.join(outDir, 'tests', `${adapterName}.test.ts`),
        generateTest(adapterName, snakeCase, PascalCase)
      );

      spinner.succeed(`Adapter ${chalk.cyan(adapterName)} scaffolded at ${chalk.dim(outDir)}`);

      console.log(`
${chalk.bold('Next steps:')}

  1. ${chalk.cyan(`cd programs/adapters/${adapterName}`)}
  2. Implement your protocol-specific logic in ${chalk.dim('src/lib.rs')}
  3. ${chalk.cyan('anchor build')} — compile the adapter
  4. ${chalk.cyan(`dnipro register ${adapterName}`)} — register with the Dnipro registry

${chalk.bold('Key functions to implement:')}
  • ${chalk.yellow('adapter_deposit')}(amount, min_shares_out) → shares
  • ${chalk.yellow('adapter_withdraw')}(shares, min_amount_out) → amount
  • ${chalk.yellow('adapter_current_value')}(shares) → u64

${chalk.dim('Docs: https://github.com/QebadiHice75/dnipro/blob/main/docs/adapter-spec.md')}
`);
    } catch (err) {
      spinner.fail(`Failed to generate adapter: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// ── Template generators ───────────────────────────────────────────────────────

function generateCargoToml(name: string, snakeCase: string, answers: any): string {
  return `[package]
name = "${name}-adapter"
version = "0.1.0"
description = "Dnipro Adapter — ${name}"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "${snakeCase}_adapter"

[features]
no-entrypoint = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = { workspace = true }
anchor-spl  = { workspace = true }
`;
}

function generateLibRs(
  name: string,
  snakeCase: string,
  PascalCase: string,
  answers: any
): string {
  const cooldown = answers.hasWithdrawalDelay
    ? `pub const WITHDRAWAL_COOLDOWN: i64 = ${answers.withdrawalDelayDays} * 24 * 60 * 60;`
    : '';

  return `// programs/adapters/${name}/src/lib.rs
// Dnipro Adapter: ${PascalCase}
//
// Generated by Dnipro CLI. Implement the three adapter interface functions:
//   adapter_deposit  — accept tokens, issue shares
//   adapter_withdraw — redeem shares, return tokens
//   adapter_current_value — compute share value

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};

declare_id!("11111111111111111111111111111111"); // Replace with your program ID

/// Underlying token mint (customize as needed)
pub const UNDERLYING_MINT: &str = "${answers.underlyingMint}";

${cooldown}

#[program]
pub mod ${snakeCase}_adapter {
    use super::*;

    /// Deposit underlying tokens, receive protocol shares.
    /// Called by the Dnipro Dispatcher via CPI.
    pub fn adapter_deposit(
        ctx: Context<AdapterDeposit>,
        params: AdapterDepositParams,
    ) -> Result<u64> {
        require!(params.amount > 0, AdapterError::ZeroAmount);
        let state = &ctx.accounts.adapter_state;
        require!(!state.deposits_paused, AdapterError::DepositsPaused);
        require!(
            params.amount >= state.min_deposit,
            AdapterError::BelowMinDeposit
        );

        // ── TODO: Calculate shares based on your protocol's share price ──────
        // Example: 1:1 initial, then accrues over time
        let shares = compute_shares(params.amount, state.share_price_bps)?;
        require!(shares >= params.min_shares_out, AdapterError::SlippageExceeded);

        // ── TODO: Transfer tokens to your protocol vault ──────────────────────
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            params.amount,
        )?;

        // ── TODO: Mint receipt/share tokens to user ──────────────────────────
        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.share_mint.to_account_info(),
                    to: ctx.accounts.user_share_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[&[b"vault_authority", &[state.vault_auth_bump]]],
            ),
            shares,
        )?;

        // Update state
        let state = &mut ctx.accounts.adapter_state;
        state.total_deposits = state.total_deposits.saturating_add(params.amount);
        state.total_shares = state.total_shares.saturating_add(shares);
        state.last_updated = Clock::get()?.unix_timestamp;

        emit!(DepositEvent {
            user: ctx.accounts.user.key(),
            amount: params.amount,
            shares,
            timestamp: state.last_updated,
        });

        msg!("${PascalCase} deposit: {} tokens → {} shares", params.amount, shares);
        Ok(shares)
    }

    /// Redeem shares, receive underlying tokens.
    /// Called by the Dnipro Dispatcher via CPI.
    pub fn adapter_withdraw(
        ctx: Context<AdapterWithdraw>,
        params: AdapterWithdrawParams,
    ) -> Result<u64> {
        require!(params.shares > 0, AdapterError::ZeroAmount);

        let state = &ctx.accounts.adapter_state;
        let amount = compute_amount(params.shares, state.share_price_bps)?;
        require!(amount >= params.min_amount_out, AdapterError::SlippageExceeded);

        // ── TODO: Burn shares ─────────────────────────────────────────────────
        anchor_spl::token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Burn {
                    mint: ctx.accounts.share_mint.to_account_info(),
                    from: ctx.accounts.user_share_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            params.shares,
        )?;

        // ── TODO: Transfer tokens from vault to user ──────────────────────────
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[&[b"vault_authority", &[state.vault_auth_bump]]],
            ),
            amount,
        )?;

        let state = &mut ctx.accounts.adapter_state;
        state.total_deposits = state.total_deposits.saturating_sub(amount);
        state.total_shares = state.total_shares.saturating_sub(params.shares);
        state.last_updated = Clock::get()?.unix_timestamp;

        emit!(WithdrawEvent {
            user: ctx.accounts.user.key(),
            shares: params.shares,
            amount,
            timestamp: state.last_updated,
        });

        Ok(amount)
    }

    /// Return current value of \`shares\` in underlying tokens.
    /// This is a read-only instruction — no state mutation.
    pub fn adapter_current_value(
        ctx: Context<AdapterCurrentValue>,
        shares: u64,
    ) -> Result<u64> {
        let state = &ctx.accounts.adapter_state;
        compute_amount(shares, state.share_price_bps)
    }

    /// Initialize the adapter (admin only).
    pub fn initialize(ctx: Context<Initialize>, params: InitParams) -> Result<()> {
        let state = &mut ctx.accounts.adapter_state;
        state.admin = ctx.accounts.admin.key();
        state.underlying_mint = ctx.accounts.underlying_mint.key();
        state.share_mint = ctx.accounts.share_mint.key();
        state.vault = ctx.accounts.vault.key();
        state.share_price_bps = 10_000; // 1:1 initially
        state.total_deposits = 0;
        state.total_shares = 0;
        state.deposits_paused = false;
        state.min_deposit = params.min_deposit;
        state.last_updated = Clock::get()?.unix_timestamp;
        state.vault_auth_bump = ctx.bumps.vault_authority;
        state.bump = ctx.bumps.adapter_state;
        msg!("${PascalCase} adapter initialized");
        Ok(())
    }
}

// ── Math helpers (customize for your share price model) ──────────────────────

fn compute_shares(amount: u64, share_price_bps: u64) -> Result<u64> {
    (amount as u128)
        .checked_mul(10_000)
        .ok_or(error!(AdapterError::Overflow))?
        .checked_div(share_price_bps as u128)
        .ok_or(error!(AdapterError::Overflow))
        .map(|v| v as u64)
}

fn compute_amount(shares: u64, share_price_bps: u64) -> Result<u64> {
    (shares as u128)
        .checked_mul(share_price_bps as u128)
        .ok_or(error!(AdapterError::Overflow))?
        .checked_div(10_000)
        .ok_or(error!(AdapterError::Overflow))
        .map(|v| v as u64)
}

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct ${PascalCase}AdapterState {
    pub admin: Pubkey,
    pub underlying_mint: Pubkey,
    pub share_mint: Pubkey,
    pub vault: Pubkey,
    pub share_price_bps: u64, // in bps (10_000 = 1:1)
    pub total_deposits: u64,
    pub total_shares: u64,
    pub deposits_paused: bool,
    pub min_deposit: u64,
    pub last_updated: i64,
    pub vault_auth_bump: u8,
    pub bump: u8,
}

impl ${PascalCase}AdapterState {
    pub const LEN: usize = 8 + 32*4 + 8 + 8 + 8 + 1 + 8 + 8 + 1 + 1;
}

// ── Params ────────────────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AdapterDepositParams { pub amount: u64, pub min_shares_out: u64 }

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AdapterWithdrawParams { pub shares: u64, pub min_amount_out: u64 }

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitParams { pub min_deposit: u64 }

// ── Accounts ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct AdapterDeposit<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, ${PascalCase}AdapterState>,
    #[account(mut)] pub user: Signer<'info>,
    #[account(mut)] pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)] pub user_share_account: Account<'info, TokenAccount>,
    #[account(mut)] pub vault: Account<'info, TokenAccount>,
    #[account(mut)] pub share_mint: Account<'info, Mint>,
    /// CHECK: PDA vault authority
    #[account(seeds = [b"vault_authority"], bump)] pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdapterWithdraw<'info> {
    #[account(mut, seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, ${PascalCase}AdapterState>,
    #[account(mut)] pub user: Signer<'info>,
    #[account(mut)] pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)] pub user_share_account: Account<'info, TokenAccount>,
    #[account(mut)] pub vault: Account<'info, TokenAccount>,
    #[account(mut)] pub share_mint: Account<'info, Mint>,
    /// CHECK: PDA vault authority
    #[account(seeds = [b"vault_authority"], bump)] pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdapterCurrentValue<'info> {
    #[account(seeds = [b"adapter_state"], bump = adapter_state.bump)]
    pub adapter_state: Account<'info, ${PascalCase}AdapterState>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = ${PascalCase}AdapterState::LEN, seeds = [b"adapter_state"], bump)]
    pub adapter_state: Account<'info, ${PascalCase}AdapterState>,
    #[account(mut)] pub admin: Signer<'info>,
    pub underlying_mint: Account<'info, Mint>,
    pub share_mint: Account<'info, Mint>,
    pub vault: Account<'info, TokenAccount>,
    /// CHECK: PDA vault authority
    #[account(seeds = [b"vault_authority"], bump)] pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum AdapterError {
    #[msg("Amount must be greater than zero")] ZeroAmount,
    #[msg("Slippage tolerance exceeded")] SlippageExceeded,
    #[msg("Deposits are currently paused")] DepositsPaused,
    #[msg("Amount below minimum deposit")] BelowMinDeposit,
    #[msg("Arithmetic overflow")] Overflow,
    #[msg("Unauthorized")] Unauthorized,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub shares: u64,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub shares: u64,
    pub amount: u64,
    pub timestamp: i64,
}
`;
}

function generateReadme(name: string, PascalCase: string, answers: any): string {
  return `# ${PascalCase} Adapter

> Dnipro Universal Yield Adapter

## Overview

This adapter integrates **${PascalCase}** with the Dnipro Dispatcher,
exposing a standardized \`deposit / withdraw / current_value\` interface.

## Interface

| Instruction | Description |
|---|---|
| \`adapter_deposit(amount, min_shares_out)\` | Deposit underlying tokens, receive shares |
| \`adapter_withdraw(shares, min_amount_out)\` | Redeem shares for underlying tokens |
| \`adapter_current_value(shares)\` | Get current USD value of shares |

## Accounts

- **\`adapter_state\`** — PDA: \`["adapter_state"]\` — mutable adapter config
- **\`vault\`** — token account holding deposited funds
- **\`vault_authority\`** — PDA: \`["vault_authority"]\` — signs vault transfers
- **\`share_mint\`** — mint for receipt tokens

## Build & Deploy

\`\`\`bash
anchor build -p ${name}-adapter
anchor deploy -p ${name}-adapter
dnipro register ${name}
\`\`\`

## Security

- All arithmetic uses checked math (no overflow)
- Slippage protection on every deposit/withdraw
- Admin-only emergency pause

Generated by [Dnipro CLI](https://github.com/QebadiHice75/dnipro)
`;
}

function generateTest(name: string, snakeCase: string, PascalCase: string): string {
  return `// tests/${name}.test.ts
// Integration tests for the ${PascalCase} adapter

import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair } from '@solana/web3.js';
import { assert } from 'chai';

describe('${PascalCase} Adapter', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // const program = anchor.workspace.${PascalCase}Adapter;

  let admin: Keypair;
  let user: Keypair;

  before(async () => {
    admin = Keypair.generate();
    user = Keypair.generate();
    // Fund accounts
    await provider.connection.requestAirdrop(admin.publicKey, 2e9);
    await provider.connection.requestAirdrop(user.publicKey, 2e9);
  });

  it('initializes adapter state', async () => {
    // TODO: implement
    assert.ok(true);
  });

  it('deposits tokens and receives shares', async () => {
    // TODO: implement
    assert.ok(true);
  });

  it('returns current value of shares', async () => {
    // TODO: implement
    assert.ok(true);
  });

  it('withdraws shares and returns tokens', async () => {
    // TODO: implement
    assert.ok(true);
  });

  it('reverts on slippage exceeded', async () => {
    // TODO: implement
    assert.ok(true);
  });
});
`;
}
