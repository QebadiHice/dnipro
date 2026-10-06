// cli/src/commands/list.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import ora from 'ora';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { DniproClient } from '@dnipro/sdk';
import { ADAPTER_PROGRAM_IDS } from '@dnipro/sdk';

export const listCommand = new Command('list')
  .alias('ls')
  .description('List all registered adapters with APY and TVL')
  .option('--cluster <cluster>', 'Cluster (mainnet-beta|devnet|localnet)', 'devnet')
  .option('--active', 'Show only active adapters')
  .option('--sort <field>', 'Sort by field (apy|tvl|risk)', 'apy')
  .action(async (opts) => {
    const spinner = ora('Fetching adapters from registry...').start();

    try {
      const rpc = opts.cluster === 'localnet'
        ? 'http://localhost:8899'
        : clusterApiUrl(opts.cluster);
      const connection = new Connection(rpc, 'confirmed');
      const client = new DniproClient(connection);

      const adapters = opts.active
        ? await client.getActiveAdapters()
        : await client.getAllAdapters();

      spinner.stop();

      if (adapters.length === 0) {
        console.log(chalk.yellow('No adapters registered yet.'));
        return;
      }

      // Sort
      adapters.sort((a, b) => {
        if (opts.sort === 'tvl') return Number(b.tvl.sub(a.tvl).toString());
        if (opts.sort === 'risk') return a.riskScore - b.riskScore;
        return b.apyBps - a.apyBps; // default: sort by APY
      });

      const rows = adapters.map(a => [
        chalk.cyan(a.name),
        a.categoryLabel,
        chalk.green(a.apyPercent + ' APY'),
        a.tvlFormatted,
        riskColor(a.riskLabel)(a.riskLabel),
        a.isActive ? chalk.green('Active') : chalk.red('Inactive'),
        a.withdrawalDelay ?? chalk.dim('Instant'),
      ]);

      const output = table(
        [
          [
            chalk.bold('Adapter'),
            chalk.bold('Category'),
            chalk.bold('APY'),
            chalk.bold('TVL'),
            chalk.bold('Risk'),
            chalk.bold('Status'),
            chalk.bold('Unlock'),
          ],
          ...rows,
        ],
        { border: { topBody: '─', topLeft: '┌', topRight: '┐', topJoin: '┬',
            bottomBody: '─', bottomLeft: '└', bottomRight: '┘', bottomJoin: '┴',
            bodyLeft: '│', bodyRight: '│', bodyJoin: '│',
            joinBody: '─', joinLeft: '├', joinRight: '┤', joinJoin: '┼' } }
      );

      console.log(output);
      console.log(chalk.dim(`${adapters.length} adapters found • Sorted by ${opts.sort}`));
    } catch (err) {
      spinner.fail(`Failed: ${(err as Error).message}`);
    }
  });

function riskColor(label: string) {
  if (label === 'Low') return chalk.green;
  if (label === 'Medium') return chalk.yellow;
  return chalk.red;
}
