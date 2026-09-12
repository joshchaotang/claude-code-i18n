import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'node:path';
import { findClaudeCodeCli } from '../core/finder.js';
import { getBackupPath } from '../core/backup.js';
import { readClaudeSource } from '../core/source.js';
import { createSpinner } from '../ui/spinner.js';

interface DumpSourceOptions {
  output?: string;
}

/**
 * Write Claude Code's JavaScript to a file so that translators can grep it.
 * Claude Code >= 2.1 keeps the source inside the native executable, so a plain
 * `grep` on the installation no longer works — this recreates the old
 * "cli.js" view. The pristine backup (original English) is preferred.
 */
export async function dumpSourceCommand(options: DumpSourceOptions): Promise<void> {
  const spinner = createSpinner();

  try {
    spinner.start('Looking for Claude Code...');
    const cc = await findClaudeCodeCli();
    spinner.succeed(`Found Claude Code v${cc.version}`);

    const backupPath = getBackupPath(cc.cliPath);
    const sourcePath = (await fs.pathExists(backupPath)) ? backupPath : cc.cliPath;
    const isBackup = sourcePath === backupPath;

    spinner.start('Reading JavaScript source...');
    const source = await readClaudeSource(sourcePath);
    const output = path.resolve(options.output ?? `claude-code-${cc.version}.js`);
    await fs.writeFile(output, source, 'utf-8');
    spinner.succeed(`Wrote ${(source.length / 1e6).toFixed(1)} M characters`);

    console.log();
    console.log(chalk.dim(`   Source: ${isBackup ? 'backup (original English)' : 'current install'}`));
    console.log(chalk.green(`   ✅ ${output}`));
    console.log(chalk.dim('   Use it to grep exact strings for translations and postPatch rules.'));
  } catch (err) {
    spinner.fail(`Dump failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
