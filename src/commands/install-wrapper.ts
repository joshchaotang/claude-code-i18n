import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { createSpinner } from '../ui/spinner.js';
import { isOurWrapper } from '../core/finder.js';

const PRIMARY_DIR = path.join(os.homedir(), '.local', 'bin');
const FALLBACK_DIR = path.join(os.homedir(), '.cc-i18n', 'bin');

/**
 * The launcher that replaces `claude` on PATH. Every start-up it checks
 * whether Claude Code was updated since the last patch (size/mtime first,
 * MD5 only when those differ) and re-applies the translation if needed.
 *
 * Portability notes: no python3 (macOS pops up a "install developer tools"
 * dialog), no GNU `timeout` (missing on macOS), works without `realpath`.
 */
export function getWrapperScript(): string {
  return `#!/bin/bash
# cc-i18n wrapper v3 — auto re-patch after Claude Code updates
# Installed by: cc-i18n install-wrapper
# Safe to remove: delete this file

STATE_FILE="$HOME/.cc-i18n/state.json"

resolve_path() {
  if command -v realpath >/dev/null 2>&1; then
    realpath "$1" 2>/dev/null && return 0
  fi
  readlink -f "$1" 2>/dev/null && return 0
  printf '%s\\n' "$1"
}

is_wrapper_copy() {
  # a small text file carrying our marker
  [ -f "$1" ] || return 1
  local size
  size=$(wc -c < "$1" 2>/dev/null | tr -d ' ')
  [ -n "$size" ] && [ "$size" -lt 65536 ] && grep -q "cc-i18n wrapper" "$1" 2>/dev/null
}

# Find the real claude (skip ourselves and any other copy of this wrapper)
SELF_REAL="$(resolve_path "$0")"
REAL_CLAUDE=""
while IFS= read -r candidate; do
  [ -z "$candidate" ] && continue
  [ "$candidate" = "$0" ] && continue
  [ "$(resolve_path "$candidate")" = "$SELF_REAL" ] && continue
  is_wrapper_copy "$candidate" && continue
  REAL_CLAUDE="$candidate"
  break
done < <(which -a claude 2>/dev/null)

if [ -z "$REAL_CLAUDE" ]; then
  echo "❌ cc-i18n wrapper: 找不到 Claude Code 本體（claude），請確認已安裝。" >&2
  exit 1
fi

# Nothing translated yet → just start Claude Code
[ -f "$STATE_FILE" ] || exec "$REAL_CLAUDE" "$@"
command -v node >/dev/null 2>&1 || exec "$REAL_CLAUDE" "$@"

# locale / patched file / md5 / size / mtime, tab separated
STATE_LINE="$(node -e '
try {
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  console.log([s.locale || "", s.cliPath || "", s.cliMd5 || "", s.cliSize || "", s.cliMtime || ""].join("\\t"));
} catch (e) {
  console.log("");
}
' "$STATE_FILE" 2>/dev/null)"
IFS=$'\\t' read -r LANG_CODE CLI_PATH SAVED_MD5 SAVED_SIZE SAVED_MTIME <<< "$STATE_LINE"

if [ -z "$LANG_CODE" ] || [ -z "$CLI_PATH" ] || [ ! -f "$CLI_PATH" ]; then
  exec "$REAL_CLAUDE" "$@"
fi

# Cheap check first: unchanged size + mtime → nothing to do
if [ "$(uname)" = "Darwin" ]; then
  CUR_STAT="$(stat -f '%z %m' "$CLI_PATH" 2>/dev/null)"
else
  CUR_STAT="$(stat -c '%s %Y' "$CLI_PATH" 2>/dev/null)"
fi
if [ -n "$SAVED_SIZE" ] && [ -n "$SAVED_MTIME" ] && [ "$CUR_STAT" = "$SAVED_SIZE $SAVED_MTIME" ]; then
  exec "$REAL_CLAUDE" "$@"
fi

# Something changed → confirm with MD5
CURRENT_MD5="$(md5 -q "$CLI_PATH" 2>/dev/null || md5sum "$CLI_PATH" 2>/dev/null | cut -d' ' -f1)"
if [ -n "$CURRENT_MD5" ] && [ "$CURRENT_MD5" = "$SAVED_MD5" ]; then
  exec "$REAL_CLAUDE" "$@"
fi

# Claude Code was updated → re-apply the translation
echo "🔄 偵測到 Claude Code 已更新，正在重新套用翻譯（約需 1 分鐘）..." >&2
if command -v cc-i18n >/dev/null 2>&1; then
  if CC_I18N_AUTO=1 cc-i18n patch --lang "$LANG_CODE" >&2; then
    echo "✅ 翻譯已恢復" >&2
  else
    echo "⚠️  自動重新翻譯失敗，先以英文介面啟動。稍後可手動執行：cc-i18n patch --lang $LANG_CODE" >&2
  fi
else
  echo "⚠️  找不到 cc-i18n 指令，略過自動翻譯" >&2
fi

exec "$REAL_CLAUDE" "$@"
`;
}

function sameDir(a: string, b: string): boolean {
  try {
    return fs.realpathSync(a) === fs.realpathSync(b);
  } catch {
    return a === b;
  }
}

function shellRcFile(): string {
  const shell = process.env.SHELL || '';
  if (shell.endsWith('zsh')) return '~/.zshrc';
  if (shell.endsWith('bash')) return process.platform === 'darwin' ? '~/.bash_profile' : '~/.bashrc';
  return process.platform === 'darwin' ? '~/.zshrc' : '~/.bashrc';
}

export async function installWrapperCommand(): Promise<void> {
  const spinner = createSpinner();

  try {
    // 1. Pick a location. Never overwrite a `claude` that is not ours
    //    (e.g. the native installer's own ~/.local/bin/claude symlink).
    let wrapperDir = PRIMARY_DIR;
    const primaryPath = path.join(PRIMARY_DIR, 'claude');
    if (await fs.pathExists(primaryPath) && !isOurWrapper(primaryPath)) {
      wrapperDir = FALLBACK_DIR;
      console.log();
      console.log(chalk.yellow(`  ${primaryPath} already exists and is not a cc-i18n wrapper`));
      console.log(chalk.yellow(`  (probably Claude Code's own launcher). Leaving it alone.`));
      console.log(chalk.yellow(`  Installing the wrapper to ${wrapperDir} instead.`));
    }
    const wrapperPath = path.join(wrapperDir, 'claude');

    // 2. Write wrapper
    spinner.start(`Installing wrapper to ${wrapperPath}...`);
    await fs.ensureDir(wrapperDir);
    await fs.writeFile(wrapperPath, getWrapperScript(), { mode: 0o755 });
    await fs.chmod(wrapperPath, 0o755);
    spinner.succeed(`Wrapper installed at ${wrapperPath}`);

    // 3. Check PATH
    const rc = shellRcFile();
    const pathDirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
    const inPath = pathDirs.some(d => sameDir(d, wrapperDir));

    if (!inPath) {
      console.log();
      console.log(chalk.yellow(`  ${wrapperDir} is not in your PATH. Add it (it must come first):`));
      console.log();
      console.log(chalk.cyan(`    echo 'export PATH="${wrapperDir.replace(os.homedir(), '$HOME')}:$PATH"' >> ${rc}`));
      console.log(chalk.cyan(`    source ${rc}`));
      console.log();
      return;
    }

    // 4. Verify that `claude` now resolves to the wrapper
    try {
      const which = execSync('which claude', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (which && sameDir(which, wrapperPath)) {
        console.log(chalk.green('\n  Wrapper is active. Claude Code will re-patch itself after updates.'));
      } else {
        console.log(chalk.yellow(`\n  Note: 'which claude' resolves to ${which || '(nothing)'}`));
        console.log(chalk.yellow(`  ${wrapperDir} needs to come BEFORE that directory in PATH, e.g.:`));
        console.log(chalk.cyan(`    echo 'export PATH="${wrapperDir.replace(os.homedir(), '$HOME')}:$PATH"' >> ${rc}`));
        console.log(chalk.cyan(`    source ${rc}`));
      }
    } catch {
      console.log(chalk.dim(`\n  Could not verify wrapper activation. Make sure ${wrapperDir} is first in PATH.`));
    }

    console.log();
    console.log(chalk.dim(`  To remove: rm ${wrapperPath}`));
  } catch (err) {
    spinner.fail(`Install failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
