import chalk from 'chalk';
import fs from 'fs-extra';
import { findClaudeCodeCli } from '../core/finder.js';
import { extractStringsFromSource, categorizeStrings } from '../core/extractor.js';
import { readClaudeSource } from '../core/source.js';
import { createSpinner } from '../ui/spinner.js';

interface ExtractOptions {
  output?: string;
}

export async function extractCommand(options: ExtractOptions): Promise<void> {
  const spinner = createSpinner();

  try {
    spinner.start('Looking for Claude Code...');
    const cc = await findClaudeCodeCli();
    spinner.succeed(`Found Claude Code v${cc.version}`);

    spinner.start('Extracting UI strings...');
    const strings = extractStringsFromSource(await readClaudeSource(cc.cliPath));
    const categories = categorizeStrings(strings);

    const highCount = strings.filter(s => s.confidence === 'high').length;
    const medCount = strings.filter(s => s.confidence === 'medium').length;

    spinner.succeed(`Found ${strings.length} strings (${highCount} high, ${medCount} medium)`);
    console.log();

    for (const [cat, items] of Object.entries(categories)) {
      console.log(chalk.dim(`   ${cat}: ${items.length} strings`));
    }

    if (options.output) {
      const output = strings.map(s => ({
        key: s.key,
        original: s.original,
        category: s.category,
        confidence: s.confidence,
      }));
      await fs.writeJson(options.output, output, { spaces: 2 });
      console.log(chalk.green(`\n✅ Saved to ${options.output}`));
    } else {
      console.log(chalk.dim('\n   Tip: Use --output <path> to save to file'));
    }
  } catch (err) {
    spinner.fail(`Extract failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
