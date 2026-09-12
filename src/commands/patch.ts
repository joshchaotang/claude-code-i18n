import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import { execSync } from 'node:child_process';
import { findClaudeCodeCli } from '../core/finder.js';
import { applyPatch } from '../core/patcher.js';
import { loadState } from '../core/patcher.js';
import { resolveLocaleKey, loadTranslationMap, listLocaleGroups } from '../core/translations.js';
import { installPlugin } from './plugin-installer.js';
import { patchHud, findHudDir } from '../core/hud-patcher.js';
import { patchSkillDescriptions } from '../core/skill-patcher.js';
import { detectSystemLanguage } from '../core/detector.js';
import { createSpinner } from '../ui/spinner.js';

const REPO = 'joshchaotang/claude-code-i18n';
const REPO_URL = `https://github.com/${REPO}`;

/**
 * Ask the user to star the repo right after a successful patch.
 * This is the moment of highest gratitude — the knife follows the force.
 *
 * Path 1: gh CLI available → star directly from terminal (one keystroke)
 * Path 2: no gh → open browser to repo page
 */
async function askStar(): Promise<void> {
  console.log();
  console.log(chalk.cyan('  ─────────────────────────────────────────'));
  console.log(chalk.cyan.bold('  🙏 感謝使用 cc-i18n！這是免費開源專案'));
  console.log(chalk.cyan('  ─────────────────────────────────────────'));
  console.log();

  try {
    const answer = await select({
      message: '覺得好用嗎？給個 ⭐ 讓更多人看到！',
      choices: [
        { name: '⭐ 好，點星星支持！', value: 'star' },
        { name: '🙂 下次再說', value: 'skip' },
      ],
      default: 'star',
    });

    if (answer === 'star') {
      let starred = false;

      // Try gh CLI first (instant, no browser switch)
      try {
        execSync(`gh api -X PUT /user/starred/${REPO} 2>/dev/null`, {
          stdio: 'ignore',
          timeout: 5000,
        });
        starred = true;
      } catch {
        // gh not available
      }

      if (starred) {
        console.log(chalk.green.bold('\n  ⭐ 已幫你點了星星，感謝支持！'));
      } else {
        // Open browser as fallback
        console.log(chalk.dim('\n  正在打開 GitHub 頁面，請點右上角的 ⭐ Star 按鈕...'));
        try {
          const cmd = process.platform === 'darwin'
            ? `open "${REPO_URL}"`
            : process.platform === 'win32'
              ? `start "${REPO_URL}"`
              : `xdg-open "${REPO_URL}"`;
          execSync(cmd, { stdio: 'ignore', timeout: 3000 });
        } catch {
          console.log(chalk.dim(`  或手動前往：${REPO_URL}`));
        }
      }
    }
  } catch {
    // User pressed Ctrl+C or prompt failed — no problem
  }
}

interface PatchOptions {
  lang?: string;
  technical?: boolean;
  reset?: boolean;
}

export async function patchCommand(options: PatchOptions): Promise<void> {
  const spinner = createSpinner();

  try {
    // 1. Find Claude Code
    spinner.start('Looking for Claude Code...');
    const cc = await findClaudeCodeCli();
    spinner.succeed(
      `Found Claude Code v${cc.version} ${chalk.dim(`(${cc.kind === 'binary' ? 'native binary' : 'cli.js'})`)}`,
    );

    // 2. Determine locale
    let localeKey: string;

    if (options.lang) {
      // Explicit --lang
      localeKey = resolveLocaleKey(options.lang, options.technical);
    } else {
      // Check saved preference (unless --reset)
      const savedState = options.reset ? null : await loadState();
      if (savedState && !options.reset) {
        const savedKey = savedState.variant
          ? `${savedState.locale}-${savedState.variant}`
          : savedState.locale;
        localeKey = savedKey;
        console.log(chalk.dim(`   Using saved preference: ${savedKey}`));
      } else {
        // Auto-detect + interactive selection
        localeKey = await interactiveLocaleSelect();
      }
    }

    // 3. Load translations
    spinner.start(`Loading ${localeKey} translations...`);
    const { map, meta } = await loadTranslationMap(localeKey);
    const nativeName = (meta as Record<string, string>).nativeName || localeKey;
    spinner.succeed(`${nativeName} — ${map.size} translations loaded`);

    // 4. Apply patch with progress
    const startTime = Date.now();
    spinner.start('Patching...');

    const baseLocale = localeKey.replace(/-technical$/, '');
    const variant = localeKey.endsWith('-technical') ? 'technical' : 'recommended';

    const result = await applyPatch(
      cc.cliPath,
      map,
      cc.version,
      baseLocale,
      variant === 'technical' ? 'technical' : null,
    );

    const elapsed = (Date.now() - startTime) / 1000;
    spinner.succeedPatch(nativeName, result.applied, result.total, elapsed);

    if (result.skipped.length > 0) {
      console.log(chalk.dim(`   🛡 ${result.skipped.length} unsafe strings excluded (protocol safety)`));
    }
    if (result.contextSkipped > 0) {
      console.log(chalk.dim(`   🎯 ${result.contextSkipped} non-UI occurrences preserved by context filter`));
    }
    if (result.missed.length > 0) {
      console.log(chalk.yellow(`   ⚠ ${result.missed.length} strings not found in this CC version`));
    }
    if (cc.kind === 'binary') {
      console.log(chalk.dim('   📦 Native binary rewritten in place; startup is ~0.4 s slower (bytecode cache off)'));
      if (process.platform === 'darwin') {
        console.log(chalk.dim('   🔏 macOS code signature replaced with an ad-hoc one'));
      }
    }

    // 5. Patch HUD
    if (findHudDir()) {
      spinner.start('Patching claude-hud...');
      const hudResult = await patchHud(localeKey);
      if (hudResult.applied > 0) {
        spinner.succeed(`HUD: ${hudResult.applied} strings replaced`);
      } else {
        spinner.succeed('HUD: no translations for this locale');
      }
    }

    // 6. Patch skill & command descriptions
    spinner.start('Patching skill descriptions...');
    const skillResult = await patchSkillDescriptions(localeKey);
    if (skillResult.patched > 0) {
      spinner.succeed(`Skills: ${skillResult.patched} descriptions translated`);
    } else {
      spinner.succeed('Skills: no translations for this locale');
    }
    if (skillResult.errors.length > 0) {
      console.log(chalk.yellow(`   ⚠ ${skillResult.errors.length} skill patch errors`));
    }

    // 7. Install plugin
    spinner.start('Installing language plugin...');
    await installPlugin(baseLocale, variant === 'technical' ? 'technical' : undefined);
    spinner.succeed('Language plugin installed');

    // 8. Done
    console.log();
    console.log(chalk.green.bold(`☯ Claude Code is now in ${nativeName}`));
    console.log();
    console.log(chalk.dim('   cc-i18n status        — check patch status'));
    console.log(chalk.dim('   cc-i18n unpatch        — restore English'));
    console.log(chalk.dim('   cc-i18n patch --reset  — choose a different language'));

    // 9. Ask for star (gratitude moment) — skip in non-interactive/auto-repatch mode
    if (!process.env.CC_I18N_AUTO) {
      await askStar();
    }
  } catch (err) {
    spinner.fail(`Patch failed: ${(err as Error).message}`);
    process.exit(1);
  }
}

async function interactiveLocaleSelect(): Promise<string> {
  const detection = detectSystemLanguage();
  const groups = await listLocaleGroups();

  if (detection.locale) {
    const group = groups.find(g => g.baseLocale === detection.locale);
    if (group && group.variants.length > 0) {
      const sourceHint = detection.source === 'env'
        ? `LANG=${detection.raw}`
        : `timezone=${detection.raw}`;

      console.log();
      console.log(chalk.cyan(`☯ Detected: ${group.nativeName} (${group.baseLocale})`) + chalk.dim(` — ${sourceHint}`));
      console.log();

      const choices = [
        ...group.variants
          .sort((a, b) => (a.variant === 'recommended' ? -1 : 1) - (b.variant === 'recommended' ? -1 : 1))
          .map(v => ({
            name: v.variant === 'recommended'
              ? `✅ Recommended — simple & friendly`
              : `🔧 Technical — professional terms`,
            value: v.key,
          })),
        { name: '🌐 Choose a different language...', value: '__other__' },
      ];

      const selected = await select({
        message: 'Which style?',
        choices,
        default: choices[0].value,
      });

      if (selected !== '__other__') return selected;
    }
  }

  // Full language selection
  console.log();
  const allChoices = groups
    .filter(g => g.variants.some(v => v.variant === 'recommended'))
    .map(g => ({
      name: `${g.nativeName} (${g.baseLocale})`,
      value: g.baseLocale,
    }));

  if (allChoices.length === 0) {
    throw new Error('No translation files found. Run "cc-i18n list" to check.');
  }

  const selectedLocale = await select({
    message: 'Choose a language:',
    choices: allChoices,
  });

  // Then ask variant
  const group = groups.find(g => g.baseLocale === selectedLocale);
  if (group && group.variants.length > 1) {
    const variantChoices = group.variants
      .sort((a, b) => (a.variant === 'recommended' ? -1 : 1) - (b.variant === 'recommended' ? -1 : 1))
      .map(v => ({
        name: v.variant === 'recommended'
          ? `✅ Recommended — simple & friendly`
          : `🔧 Technical — professional terms`,
        value: v.key,
      }));

    return select({
      message: 'Which style?',
      choices: variantChoices,
      default: variantChoices[0].value,
    });
  }

  return selectedLocale;
}
