// cli/src/commands/inspect.ts
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { DniproClient, ADAPTER_PROGRAM_IDS, ADAPTER_METADATA, formatUsdc } from '@dnipro/sdk';

export const inspectCommand = new Command('inspect')
  .description('Inspect a specific adapter in detail')
  .argument('<adapter>', 'Adapter name or program ID (kamino|marginfi|jupiter|maple|drift)')
  .option('--cluster <cluster>', 'Cluster', 'devnet')
  .action(async (adapterArg: string, opts) => {
    const spinner = ora(`Fetching ${adapterArg} adapter...`).start();

    try {
      const rpc = opts.cluster === 'localnet' ? 'http://localhost:8899' : clusterApiUrl(opts.cluster);
      const connection = new Connection(rpc, 'confirmed');
      const client = new DniproClient(connection);

      // Resolve program ID
      const programId = ADAPTER_PROGRAM_IDS[adapterArg as keyof typeof ADAPTER_PROGRAM_IDS]
        ?? new PublicKey(adapterArg);

      const adapter = await client.getAdapter(programId);
      spinner.stop();

      if (!adapter) {
        console.log(chalk.red(`Adapter "${adapterArg}" not found in registry`));
        return;
      }

      const meta = ADAPTER_METADATA[adapter.protocol as keyof typeof ADAPTER_METADATA];

      console.log(`
${chalk.bold.cyan(adapter.name)}
${'─'.repeat(40)}
${chalk.bold('Protocol:')}       ${adapter.protocol}
${chalk.bold('Category:')}       ${adapter.categoryLabel}
${chalk.bold('Status:')}         ${adapter.isActive ? chalk.green('✓ Active') : chalk.red('✗ Inactive')}
${chalk.bold('APY:')}            ${chalk.green(adapter.apyPercent)}
${chalk.bold('TVL:')}            ${adapter.tvlFormatted}
${chalk.bold('Risk Score:')}     ${adapter.riskScore}/100 (${adapter.riskLabel})
${chalk.bold('Min Deposit:')}    ${formatUsdc(adapter.minDeposit)}
${chalk.bold('Max Deposit:')}    ${adapter.maxDeposit.eqn(0) ? 'Unlimited' : formatUsdc(adapter.maxDeposit)}
${chalk.bold('Withdrawal:')}     ${adapter.withdrawalDelay ?? 'Instant'}
${chalk.bold('Program ID:')}     ${chalk.dim(adapter.programId.toBase58())}
${chalk.bold('Underlying Mint:')} ${chalk.dim(adapter.underlyingMint.toBase58())}
${chalk.bold('Registered At:')} ${new Date(adapter.registeredAt * 1000).toLocaleDateString()}

${chalk.bold('Description:')}
  ${meta?.description ?? 'No description available.'}

${chalk.bold('Links:')}
  Website: ${chalk.cyan(meta?.website ?? 'N/A')}
  Docs:    ${chalk.cyan(meta?.docs ?? 'N/A')}
  Audit:   ${chalk.cyan(meta?.auditUrl ?? 'N/A')}

${chalk.dim(`Metadata URI: ${adapter.metadataUri || 'N/A'}`)}
`);
    } catch (err) {
      spinner.fail(`Failed: ${(err as Error).message}`);
    }
  });

// ── portfolio command ─────────────────────────────────────────────────────────

export const portfolioCommand = new Command('portfolio')
  .alias('pf')
  .description('Show your yield positions across all adapters')
  .argument('[wallet]', 'Wallet public key (defaults to local keypair)')
  .option('--cluster <cluster>', 'Cluster', 'devnet')
  .action(async (walletArg: string | undefined, opts) => {
    const spinner = ora('Loading portfolio...').start();

    try {
      const rpc = opts.cluster === 'localnet' ? 'http://localhost:8899' : clusterApiUrl(opts.cluster);
      const connection = new Connection(rpc, 'confirmed');
      const client = new DniproClient(connection);

      // Default: try to load local keypair
      const wallet = walletArg
        ? new PublicKey(walletArg)
        : (() => { throw new Error('Wallet required (pass public key as argument)'); })();

      const summary = await client.getPortfolioSummary(wallet);
      spinner.stop();

      if (summary.positions.length === 0) {
        console.log(chalk.yellow('\nNo active positions found.\n'));
        console.log(`Deposit using: ${chalk.cyan('dnipro deposit <adapter> <amount>')}`);
        return;
      }

      console.log(`\n${chalk.bold.cyan('Your Dnipro Portfolio')} — ${chalk.dim(wallet.toBase58().slice(0, 8) + '...')}\n`);

      for (const pos of summary.positions) {
        const adapter = pos.adapterInfo;
        console.log(`  ${chalk.bold(adapter?.name ?? pos.adapterProgramId.toBase58().slice(0, 8))}`);
        console.log(`    Deposited:  ${formatUsdc(pos.depositedAmount)}`);
        console.log(`    Value now:  ${formatUsdc(pos.currentValue)}`);
        console.log(`    PnL:        ${pos.pnl.gten(0) ? chalk.green('+' + formatUsdc(pos.pnl)) : chalk.red(formatUsdc(pos.pnl))}`);
        console.log(`    Shares:     ${pos.shares.toString()}`);
        console.log(`    Opened:     ${new Date(pos.openedAt * 1000).toLocaleDateString()}`);
        console.log();
      }

      console.log('─'.repeat(40));
      console.log(`  ${chalk.bold('Total Deposited:')}  ${summary.totalDepositedFormatted}`);
      console.log(`  ${chalk.bold('Total Value:')}      ${chalk.green(summary.totalValueFormatted)}`);
      console.log(`  ${chalk.bold('Total PnL:')}        ${summary.totalPnl.gten(0) ? chalk.green('+' + summary.totalPnlFormatted) : chalk.red(summary.totalPnlFormatted)}`);
      console.log(`  ${chalk.bold('Positions:')}        ${summary.positionCount}\n`);
    } catch (err) {
      spinner.fail(`Failed: ${(err as Error).message}`);
    }
  });

// ── deposit command ───────────────────────────────────────────────────────────

export const depositCommand = new Command('deposit')
  .description('Deposit USDC into a yield adapter')
  .argument('<adapter>', 'Adapter name (kamino|marginfi|jupiter|maple|drift)')
  .argument('<amount>', 'Amount in USDC (e.g. 100 or 100.50)')
  .option('--cluster <cluster>', 'Cluster', 'devnet')
  .option('--slippage <bps>', 'Slippage tolerance in bps', '50')
  .option('--dry-run', 'Simulate without sending')
  .action(async (adapterArg: string, amountArg: string, opts) => {
    const amountUsd = parseFloat(amountArg);
    if (isNaN(amountUsd) || amountUsd <= 0) {
      console.error(chalk.red('Invalid amount. Example: dnipro deposit kamino 100'));
      process.exit(1);
    }

    const spinner = ora(`Simulating deposit of $${amountUsd} into ${adapterArg}...`).start();

    try {
      const rpc = opts.cluster === 'localnet' ? 'http://localhost:8899' : clusterApiUrl(opts.cluster);
      const connection = new Connection(rpc, 'confirmed');
      const client = new DniproClient(connection);

      const programId = ADAPTER_PROGRAM_IDS[adapterArg as keyof typeof ADAPTER_PROGRAM_IDS];
      if (!programId) throw new Error(`Unknown adapter: ${adapterArg}`);

      const { usdcToAtomics } = await import('@dnipro/sdk');
      const amount = usdcToAtomics(amountUsd);
      const sim = await client.simulateDeposit(programId, amount);

      spinner.stop();

      console.log(`
${chalk.bold('Deposit Simulation')}
${'─'.repeat(30)}
Adapter:    ${chalk.cyan(adapterArg)}
Amount:     $${amountUsd} USDC
Fee:        ${formatUsdc(sim.estimatedFee)} (${opts.slippage} bps slippage budget)
Net amount: ${formatUsdc(sim.estimatedOutput)}
Min output: ${formatUsdc(sim.minOutput)}
`);

      if (sim.warnings.length > 0) {
        for (const w of sim.warnings) {
          console.log(chalk.yellow(`⚠ ${w}`));
        }
      }

      if (opts.dryRun) {
        console.log(chalk.dim('Dry run — no transaction sent.'));
        return;
      }

      console.log(chalk.yellow('\nTo execute, sign the transaction with your wallet adapter.'));
      console.log(chalk.dim('(In the web UI, connect your wallet and use the dashboard.)'));
    } catch (err) {
      spinner.fail(`Failed: ${(err as Error).message}`);
    }
  });

// ── withdraw command ──────────────────────────────────────────────────────────

export const withdrawCommand = new Command('withdraw')
  .description('Withdraw from a yield adapter')
  .argument('<adapter>', 'Adapter name')
  .argument('<shares>', 'Shares to redeem ("all" for full withdrawal)')
  .option('--cluster <cluster>', 'Cluster', 'devnet')
  .option('--dry-run', 'Simulate without sending')
  .action(async (adapterArg: string, sharesArg: string, opts) => {
    console.log(chalk.cyan('\nWithdraw simulation:'));
    console.log(`  Adapter: ${adapterArg}`);
    console.log(`  Shares:  ${sharesArg}`);
    console.log(chalk.dim('\nConnect your wallet in the Dnipro dashboard to execute.'));
    console.log(chalk.cyan('  https://github.com/QebadiHice75/dnipro#quick-start\n'));
  });

// ── register command ──────────────────────────────────────────────────────────

export const registerCommand = new Command('register')
  .description('Register an adapter with the Dnipro governance registry')
  .argument('<name>', 'Adapter name or path to built program')
  .option('--cluster <cluster>', 'Cluster', 'devnet')
  .option('--governance <key>', 'Governance keypair path')
  .action(async (name: string, opts) => {
    console.log(chalk.cyan('\nAdapter Registration\n'));
    console.log(`Prepare registration for "${name}" in the governance-controlled Registry.`);
    console.log(chalk.dim('\nEnsure you have:'));
    console.log('  1. Built and deployed the adapter program');
    console.log('  2. Governance authority keypair');
    console.log('  3. Set the correct program ID in Anchor.toml\n');
    console.log(chalk.yellow('Interactive registration is not implemented in the CLI yet.'));
    console.log(chalk.dim('For the current Devnet demo, use the governed setup flow documented in playground/README.md.'));
  });

function formatUsdc(amount: any): string {
  const n = Number(amount.toString()) / 1e6;
  return `$${n.toFixed(2)}`;
}
