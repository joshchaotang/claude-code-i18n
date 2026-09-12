import { Command } from 'commander';
import { patchCommand } from './commands/patch.js';
import { unpatchCommand } from './commands/unpatch.js';
import { statusCommand } from './commands/status.js';
import { listCommand } from './commands/list.js';
import { extractCommand } from './commands/extract.js';
import { contributeCommand } from './commands/contribute.js';
import { checkUpdateCommand } from './commands/check-update.js';
import { scanCommand } from './commands/scan.js';
import { installWrapperCommand } from './commands/install-wrapper.js';
import { dumpSourceCommand } from './commands/dump-source.js';

const program = new Command();

program
  .name('cc-i18n')
  .description('☯ Internationalize Claude Code — Make the entire CLI available in any language')
  .version('1.2.0')
  .option('--verbose', 'Enable verbose output');

program
  .command('patch')
  .description('Apply translation patch to Claude Code CLI')
  .option('--lang <locale>', 'Target language locale (e.g. zh-TW, zh-CN, en)')
  .option('--technical', 'Use technical/professional translation variant')
  .option('--reset', 'Re-select language (ignore saved preference)')
  .action(patchCommand);

program
  .command('unpatch')
  .description('Restore Claude Code CLI to original English')
  .action(unpatchCommand);

program
  .command('status')
  .description('Show current patch status')
  .action(statusCommand);

program
  .command('list')
  .description('List all available translation locales')
  .action(listCommand);

program
  .command('extract')
  .description('Extract UI strings from Claude Code CLI for translation')
  .option('--output <path>', 'Output file path')
  .action(extractCommand);

program
  .command('contribute')
  .description('Generate a translation template for a new language')
  .requiredOption('--lang <locale>', 'Target language locale to create template for')
  .action(contributeCommand);

program
  .command('check-update')
  .description('Check if Claude Code was updated and re-apply patch if needed')
  .option('--quiet', 'Suppress output (for shell hook)')
  .option('--repatch', 'Automatically re-apply patch if CC was updated')
  .option('--hook', 'Print shell hook snippet for auto-update')
  .action(checkUpdateCommand);

program
  .command('scan')
  .description('Scan Claude Code for untranslated user-visible strings')
  .action(scanCommand);

program
  .command('dump-source')
  .description('Write the JavaScript embedded in Claude Code to a file (for grepping strings)')
  .option('--output <path>', 'Output file path (default: ./claude-code-<version>.js)')
  .action(dumpSourceCommand);

program
  .command('install-wrapper')
  .description('Install auto-repatch wrapper so translations survive CC updates')
  .action(installWrapperCommand);

program.parse();
