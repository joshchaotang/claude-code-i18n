import { execSync, execFileSync } from 'node:child_process';
import fs from 'fs-extra';

/**
 * Validate that a JS file is syntactically valid using node --check.
 */
export async function validateSyntax(cliPath: string): Promise<boolean> {
  try {
    execSync(`node --check "${cliPath}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 30000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Launch a (patched) Claude Code executable with `--version` and make sure it
 * starts and prints a version. This is the last line of defence after
 * rewriting the binary: a broken module graph, a bad signature or a syntax
 * error in an eagerly loaded module all show up here.
 */
export function smokeTestBinary(binaryPath: string): { ok: boolean; output: string } {
  try {
    const out = execFileSync(binaryPath, ['--version'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
    });
    return { ok: /\d+\.\d+\.\d+/.test(out), output: out.trim() };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    const output = [e.stdout, e.stderr].filter(Boolean).join('\n').trim();
    return { ok: false, output: output || e.message };
  }
}

/**
 * Validate that a translation file has all required keys matching en.json.
 */
export async function validateTranslation(
  translationPath: string,
  enPath?: string,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!await fs.pathExists(translationPath)) {
    return { valid: false, errors: ['File not found'] };
  }

  let translation: Record<string, unknown>;
  try {
    translation = await fs.readJson(translationPath);
  } catch {
    return { valid: false, errors: ['Invalid JSON'] };
  }

  // Check _meta
  const meta = translation._meta as Record<string, unknown> | undefined;
  if (!meta) {
    errors.push('Missing _meta section');
  } else {
    if (!meta.locale) errors.push('Missing _meta.locale');
    if (!meta.version) errors.push('Missing _meta.version');
  }

  // If en.json path provided, check key completeness
  if (enPath && await fs.pathExists(enPath)) {
    const en = await fs.readJson(enPath);

    for (const [category, strings] of Object.entries(en)) {
      if (category === '_meta') continue;

      const translatedCategory = translation[category] as Record<string, string> | undefined;
      if (!translatedCategory) {
        errors.push(`Missing category: ${category}`);
        continue;
      }

      for (const key of Object.keys(strings as Record<string, string>)) {
        if (!(key in translatedCategory)) {
          errors.push(`Missing key: ${category}.${key}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
