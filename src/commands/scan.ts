import chalk from 'chalk';
import fs from 'fs-extra';
import { findClaudeCodeCli } from '../core/finder.js';
import { KNOWN_STRINGS } from '../core/extractor.js';
import { getBackupPath } from '../core/backup.js';
import { readClaudeSource } from '../core/source.js';

/**
 * Scan cli.js for user-visible strings not yet in the translation list.
 * Uses pattern matching to find createElement text, labels, titles, etc.
 */
export async function scanCommand(options: { fix?: boolean }): Promise<void> {
  let cc;
  try {
    cc = await findClaudeCodeCli();
  } catch {
    console.error(chalk.red('Could not find Claude Code installation.'));
    process.exit(1);
  }

  // Use backup if available (original English), otherwise use the current file
  const backupPath = getBackupPath(cc.cliPath);
  const scanPath = (await fs.pathExists(backupPath)) ? backupPath : cc.cliPath;
  const source = await readClaudeSource(scanPath);

  const isBackup = scanPath === backupPath;
  console.log();
  console.log(chalk.bold('☯ cc-i18n scan'));
  console.log(chalk.dim(`   Scanning: ${scanPath}`));
  console.log(chalk.dim(`   Source: ${isBackup ? 'backup (original English)' : `current ${cc.kind === 'binary' ? 'native binary' : 'cli.js'}`}`));
  console.log();

  // Build set of all known originals
  const knownOriginals = new Set<string>();
  for (const strings of Object.values(KNOWN_STRINGS)) {
    for (const value of Object.values(strings)) {
      knownOriginals.add(value);
    }
  }

  // Verify existing strings still exist in cli.js
  let existingFound = 0;
  let existingMissing = 0;
  const missingStrings: string[] = [];

  for (const [category, strings] of Object.entries(KNOWN_STRINGS)) {
    for (const [key, value] of Object.entries(strings)) {
      if (source.includes(value)) {
        existingFound++;
      } else {
        existingMissing++;
        missingStrings.push(`${category}.${key} = ${JSON.stringify(value)}`);
      }
    }
  }

  // Pattern-match for new UI strings
  const newStrings: { text: string; context: string; count: number }[] = [];
  const seen = new Set<string>();

  // Pattern 1: createElement text content — createElement(tag, props, "Text")
  const createElPattern = /createElement\([^,]+,(?:\{[^}]*\}|null),\s*"([^"]{3,80})"\s*\)/g;
  findMatches(source, createElPattern, 'createElement', knownOriginals, seen, newStrings);

  // Pattern 2: createElement with named text — createElement(v, null, "Text")
  const simpleTextPattern = /createElement\(v,\s*(?:null|\{[^}]*\}),\s*"([^"]{3,80})"\s*\)/g;
  findMatches(source, simpleTextPattern, 'createElement-v', knownOriginals, seen, newStrings);

  // Pattern 3: label:"..." / title:"..." / placeholder:"..." / message:"..."
  for (const prop of ['label', 'title', 'placeholder', 'message']) {
    const propPattern = new RegExp(`${prop}:"([^"]{3,80})"`, 'g');
    findMatches(source, propPattern, prop, knownOriginals, seen, newStrings);
  }

  // Pattern 4: Standalone quoted UI-like strings
  const standalonePattern = /"([A-Z][a-z][a-zA-Z ,'\.!?…·↑]{2,60})"/g;
  findMatches(source, standalonePattern, 'standalone', knownOriginals, seen, newStrings);

  // Filter to likely UI strings
  const filtered = newStrings.filter(s => isLikelyUI(s.text));

  // Sort by likely importance (longer = more likely UI, higher count = more visible)
  filtered.sort((a, b) => b.text.length - a.text.length);

  // Output results
  console.log(chalk.bold('📊 Scan Results'));
  console.log();
  console.log(`   ${chalk.green('✅')} ${existingFound} strings translated (in KNOWN_STRINGS)`);
  if (existingMissing > 0) {
    console.log(`   ${chalk.red('❌')} ${existingMissing} strings missing from cli.js (CC may have updated)`);
    for (const s of missingStrings.slice(0, 10)) {
      console.log(chalk.red(`      ${s}`));
    }
    if (missingStrings.length > 10) {
      console.log(chalk.dim(`      ... and ${missingStrings.length - 10} more`));
    }
  }
  console.log(`   ${chalk.yellow('🔍')} ${filtered.length} potential new strings found`);
  console.log();

  if (filtered.length > 0) {
    console.log(chalk.bold('   New strings (not in translation list):'));
    console.log();
    for (const s of filtered.slice(0, 40)) {
      const countStr = s.count > 1 ? chalk.dim(` (×${s.count})`) : '';
      console.log(`   ${chalk.yellow('❌')} ${chalk.white(JSON.stringify(s.text))}${countStr}`);
      console.log(chalk.dim(`      via: ${s.context}`));
    }
    if (filtered.length > 40) {
      console.log(chalk.dim(`   ... and ${filtered.length - 40} more`));
    }
    console.log();
    console.log(chalk.dim('   Add these to src/core/extractor.ts KNOWN_STRINGS'));
    console.log(chalk.dim('   and corresponding translation JSON files.'));
  } else {
    console.log(chalk.green('   🎉 No new untranslated strings found!'));
  }
  console.log();
}

function findMatches(
  source: string,
  pattern: RegExp,
  context: string,
  knownOriginals: Set<string>,
  seen: Set<string>,
  results: { text: string; context: string; count: number }[],
): void {
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const text = match[1];
    if (knownOriginals.has(text) || seen.has(text)) continue;
    seen.add(text);

    // Count occurrences
    let count = 0;
    let idx = source.indexOf(text);
    while (idx !== -1) {
      count++;
      idx = source.indexOf(text, idx + text.length);
    }

    results.push({ text, context, count });
  }
}

function isLikelyUI(s: string): boolean {
  // Must contain a space (phrases, not identifiers)
  if (!s.includes(' ')) return false;
  // Short UI strings only (long strings are usually system prompts / docs)
  if (s.length > 80) return false;
  // Exclude URLs, paths, code
  if (/^https?:\/\//.test(s)) return false;
  if (s.includes('/') && s.split('/').length > 2) return false;
  if (/^[A-Z_]+$/.test(s)) return false;
  if (s.includes('=') && s.includes('(')) return false;
  if (s.includes('${') || s.includes('`')) return false;
  if (/\.[a-z]{2,4}$/.test(s) && !s.endsWith('...') && !s.endsWith('\u2026')) return false;
  // Exclude things that look like code/config/internal
  if (s.includes('::') || s.includes('->') || s.includes('=>')) return false;
  if (s.includes('\\n') || s.includes('\\t')) return false;
  // Exclude error/security messages (internal, not user-facing labels)
  if (/^(Command contains|Failed to |Error |Cannot |Could not |Unable to |Invalid |Missing )/.test(s)) return false;
  // Exclude SDK/API descriptions
  if (/^(AWS |Amazon |Microsoft |Google |The |This |Either |Must be |Files with |Note: )/.test(s)) return false;
  // Exclude long explanatory sentences (not concise UI labels)
  if (s.split(' ').length > 12) return false;
  return true;
}
