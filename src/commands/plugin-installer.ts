import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const PLUGIN_DIR = path.join(CLAUDE_DIR, 'plugins', 'cc-i18n');

/**
 * Install the cc-i18n Claude Code plugin that controls AI response language.
 * Writes a CLAUDE.md rule to ~/.claude/ that instructs Claude to respond
 * in the target language.
 */
export async function installPlugin(locale: string, variant?: string): Promise<void> {
  await fs.ensureDir(PLUGIN_DIR);

  const langInstruction = buildLanguageInstruction(locale, variant);

  // Write the i18n rule as a CLAUDE.md in the plugin directory
  const rulePath = path.join(PLUGIN_DIR, 'CLAUDE.md');
  await fs.writeFile(rulePath, langInstruction, 'utf-8');
}

/**
 * Remove the cc-i18n plugin.
 */
export async function uninstallPlugin(): Promise<void> {
  if (await fs.pathExists(PLUGIN_DIR)) {
    await fs.remove(PLUGIN_DIR);
  }
}

function buildLanguageInstruction(locale: string, variant?: string): string {
  const langMap: Record<string, { lang: string; terms: string }> = {
    'zh-TW': {
      lang: '繁體中文',
      terms: 'Use Taiwan terminology (程式、資料、檔案、回傳、物件、外掛)',
    },
    'zh-CN': {
      lang: '简体中文',
      terms: 'Use Mainland China terminology (程序、数据、文件、返回、对象、插件)',
    },
    'ja': { lang: '日本語', terms: '' },
    'ko': { lang: '한국어', terms: '' },
    'es': { lang: 'Español', terms: '' },
    'fr': { lang: 'Français', terms: '' },
    'de': { lang: 'Deutsch', terms: '' },
    'pt': { lang: 'Português', terms: '' },
    'ru': { lang: 'Русский', terms: '' },
  };

  const info = langMap[locale] || { lang: locale, terms: '' };
  const styleNote = variant === 'technical'
    ? '\n- Use professional/technical terminology\n- Keep responses precise and formal'
    : '\n- Use simple, friendly vocabulary\n- Be concise and approachable';

  return `# cc-i18n Language Rule

You MUST respond in ${info.lang}.
${info.terms ? `${info.terms}\n` : ''}${styleNote}

All responses, explanations, error messages, and suggestions should be in ${info.lang}.
Code comments may remain in English, but all human-facing text must be in ${info.lang}.
`;
}
