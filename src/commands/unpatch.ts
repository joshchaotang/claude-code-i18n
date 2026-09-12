import chalk from 'chalk';
import { findClaudeCodeCli } from '../core/finder.js';
import { restoreBackup, removeBackup, hasValidBackup } from '../core/backup.js';
import { clearState } from '../core/patcher.js';
import { uninstallPlugin } from './plugin-installer.js';
import { unpatchHud } from '../core/hud-patcher.js';
import { createSpinner } from '../ui/spinner.js';

export async function unpatchCommand(): Promise<void> {
  const spinner = createSpinner();

  try {
    spinner.start('Looking for Claude Code...');
    const cc = await findClaudeCodeCli();
    spinner.succeed(`Found: ${cc.cliPath}`);

    if (!await hasValidBackup(cc.cliPath)) {
      console.log(chalk.yellow('\n⚠ No backup found. Claude Code may already be in original state.'));
      return;
    }

    spinner.start(`Restoring original ${cc.kind === 'binary' ? 'Claude Code binary' : 'cli.js'}...`);
    const restored = await restoreBackup(cc.cliPath);
    if (!restored) {
      spinner.fail('Failed to restore backup.');
      process.exit(1);
    }

    await removeBackup(cc.cliPath);
    await clearState();
    spinner.succeed('Original English restored');

    const hudRestored = await unpatchHud();
    if (hudRestored) {
      console.log(chalk.green('   ✓ HUD plugin restored'));
    }

    spinner.start('Removing language plugin...');
    await uninstallPlugin();
    spinner.succeed('Plugin removed');

    console.log();
    console.log(chalk.green.bold('☯ Claude Code is back to English.'));
  } catch (err) {
    spinner.fail(`Unpatch failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
