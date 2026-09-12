import chalk from 'chalk';
import { loadState } from '../core/patcher.js';
import { hasValidBackup, getCliMd5 } from '../core/backup.js';

export async function statusCommand(): Promise<void> {
  const state = await loadState();

  if (!state) {
    console.log();
    console.log(chalk.dim('☯ cc-i18n — No patch applied'));
    console.log(chalk.dim('   Claude Code is in original English.'));
    console.log();
    console.log(chalk.dim('   Run "cc-i18n patch" to get started.'));
    console.log();
    return;
  }

  const currentMd5 = (() => {
    try { return getCliMd5(state.cliPath); } catch { return 'unknown'; }
  })();

  const md5Match = currentMd5 === state.cliMd5;
  const hasBackup = await hasValidBackup(state.cliPath);
  const variant = state.variant || 'recommended';

  console.log();
  console.log(chalk.bold('☯ cc-i18n status'));
  console.log();
  console.log(`   Language:     ${state.locale} (${variant})`);
  console.log(`   CC version:   ${state.ccVersion}`);
  console.log(`   Format:       ${state.kind === 'binary' ? 'native binary (Claude Code ≥ 2.1)' : 'cli.js'}`);
  console.log(`   CLI path:     ${state.cliPath}`);
  console.log(`   Patch date:   ${new Date(state.patchDate).toLocaleString()}`);
  console.log(`   Replacements: ${state.replacements}${state.missed > 0 ? chalk.yellow(` (${state.missed} missed)`) : ''}`);
  console.log(`   Patch status: ${md5Match ? chalk.green('✅ Active') : chalk.yellow('⚠️ CLI modified (CC may have updated)')}`);
  console.log(`   Backup:       ${hasBackup ? chalk.green('✅ Available') : chalk.red('❌ Missing')}`);

  if (!md5Match) {
    console.log();
    console.log(chalk.yellow(`   Run "cc-i18n patch --lang ${state.locale}" to re-apply.`));
  }
  console.log();
}
