#!/usr/bin/env node
// cli/src/index.ts
// Dnipro CLI — adapter generator, registry manager, and dev tooling

import { Command } from 'commander';
import chalk from 'chalk';

import { generateCommand } from './commands/generate';
import { listCommand } from './commands/list';
import { registerCommand } from './commands/register';
import { inspectCommand } from './commands/inspect';
import { portfolioCommand } from './commands/portfolio';
import { depositCommand } from './commands/deposit';
import { withdrawCommand } from './commands/withdraw';

const program = new Command();

program
  .name('dnipro')
  .description(
    chalk.cyan('⚡ Dnipro') +
    ' — Universal Yield Adapter Standard for Solana'
  )
  .version('0.1.0');

// Sub-commands
program.addCommand(generateCommand);
program.addCommand(listCommand);
program.addCommand(registerCommand);
program.addCommand(inspectCommand);
program.addCommand(portfolioCommand);
program.addCommand(depositCommand);
program.addCommand(withdrawCommand);

// Help footer
program.addHelpText('after', `
${chalk.dim('Examples:')}
  ${chalk.cyan('dnipro generate my-protocol')}    Scaffold a new adapter
  ${chalk.cyan('dnipro list')}                    List all registered adapters
  ${chalk.cyan('dnipro inspect kamino')}          Show adapter details & APY
  ${chalk.cyan('dnipro deposit kamino 100')}      Deposit 100 USDC into Kamino
  ${chalk.cyan('dnipro withdraw kamino all')}     Withdraw all from Kamino
  ${chalk.cyan('dnipro portfolio')}               Show your yield positions

${chalk.dim('Docs:')} https://github.com/QebadiHice75/dnipro/tree/main/docs
`);

program.parse(process.argv);
