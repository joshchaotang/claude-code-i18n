import { execSync, execFileSync } from 'node:child_process';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

export type ClaudeCodeKind = 'js' | 'binary';

export interface ClaudeCodeInfo {
  /** The file that gets patched: `cli.js` (Claude Code <= 2.0) or the native executable (>= 2.1). */
  cliPath: string;
  packageDir: string;
  version: string;
  kind: ClaudeCodeKind;
}

const WRAPPER_MARKER = 'cc-i18n wrapper';
const CC_PACKAGE = path.join('@anthropic-ai', 'claude-code');

/**
 * True when `filePath` is the small shell script installed by
 * `cc-i18n install-wrapper` (it must never be mistaken for Claude Code).
 */
export function isOurWrapper(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > 64 * 1024) return false;
    return fs.readFileSync(filePath, 'utf-8').includes(WRAPPER_MARKER);
  } catch {
    return false;
  }
}

function readHead(filePath: string, length: number): Buffer | null {
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(length);
    const n = fs.readSync(fd, buf, 0, length, 0);
    return buf.subarray(0, n);
  } catch {
    return null;
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch { /* ignore */ }
    }
  }
}

/**
 * True for a real executable (ELF / Mach-O / PE) that is large enough to be
 * Claude Code itself — as opposed to a shell shim or npm's 500-byte stub.
 */
export function looksLikeNativeBinary(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size < 1024 * 1024) return false;
  } catch {
    return false;
  }
  const head = readHead(filePath, 4);
  if (!head || head.length < 4) return false;
  const magic = head.readUInt32BE(0);
  return (
    magic === 0x7f454c46 ||                          // ELF
    magic === 0xcffaedfe || magic === 0xfeedfacf ||  // Mach-O 64-bit
    magic === 0xcafebabe ||                          // Mach-O universal
    head.readUInt16BE(0) === 0x4d5a                  // PE ("MZ")
  );
}

function readVersionFromPackage(packageDir: string): string | null {
  try {
    const pkg = fs.readJsonSync(path.join(packageDir, 'package.json'));
    return typeof pkg.version === 'string' ? pkg.version : null;
  } catch {
    return null;
  }
}

/** Native installer keeps binaries as ~/.local/share/claude/versions/<version>. */
function versionFromPath(filePath: string): string | null {
  const match = filePath.match(/[\\/]versions[\\/](\d+\.\d+\.\d+[^\\/]*)/);
  return match ? match[1] : null;
}

function versionFromBinary(binaryPath: string): string | null {
  try {
    const out = execFileSync(binaryPath, ['--version'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 20_000,
    });
    const match = out.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function jsInfo(cliPath: string): ClaudeCodeInfo {
  const packageDir = path.dirname(cliPath);
  return {
    cliPath,
    packageDir,
    version: readVersionFromPackage(packageDir) ?? 'unknown',
    kind: 'js',
  };
}

function binaryInfo(binaryPath: string): ClaudeCodeInfo {
  const dir = path.dirname(binaryPath);
  let packageDir = dir;
  let version: string | null = null;

  // npm layout: <package>/bin/claude.exe  or  <platform package>/claude
  for (const candidate of [dir, path.dirname(dir)]) {
    const v = readVersionFromPackage(candidate);
    if (v) {
      packageDir = candidate;
      version = v;
      break;
    }
  }
  version ??= versionFromPath(binaryPath);
  version ??= versionFromBinary(binaryPath);

  return { cliPath: binaryPath, packageDir, version: version ?? 'unknown', kind: 'binary' };
}

/**
 * npm installs the real executable as an optional dependency
 * (@anthropic-ai/claude-code-<platform>-<arch>) and its postinstall copies it
 * over bin/claude.exe. When that step did not run, use the platform package.
 */
function findPlatformPackageBinary(packageDir: string): string | null {
  const wanted = `claude-code-${process.platform}-${process.arch}`;
  const binName = process.platform === 'win32' ? 'claude.exe' : 'claude';
  const scopes = [
    path.join(packageDir, 'node_modules', '@anthropic-ai'),
    path.dirname(packageDir),
  ];

  for (const scope of scopes) {
    const exact = path.join(scope, wanted, binName);
    if (looksLikeNativeBinary(exact)) return exact;
    try {
      for (const entry of fs.readdirSync(scope)) {
        if (entry.startsWith(wanted)) {
          const candidate = path.join(scope, entry, binName);
          if (looksLikeNativeBinary(candidate)) return candidate;
        }
      }
    } catch {
      // scope does not exist
    }
  }
  return null;
}

/** Inspect an @anthropic-ai/claude-code package directory. */
function inspectPackageDir(packageDir: string): ClaudeCodeInfo | null {
  const cliJs = path.join(packageDir, 'cli.js');
  if (fs.existsSync(cliJs)) return jsInfo(cliJs);

  const exe = path.join(packageDir, 'bin', 'claude.exe');
  if (looksLikeNativeBinary(exe)) return binaryInfo(exe);

  const platformBinary = findPlatformPackageBinary(packageDir);
  if (platformBinary) return binaryInfo(platformBinary);

  return null;
}

/** Resolve one `claude` command found on PATH. */
function classifyCommand(commandPath: string): ClaudeCodeInfo | null {
  let real: string;
  try {
    real = fs.realpathSync(commandPath);
  } catch {
    return null;
  }

  if (isOurWrapper(real)) return null;

  // Claude Code <= 2.0: the command is (or sits next to) cli.js
  if (real.endsWith('cli.js')) return jsInfo(real);
  const dir = path.dirname(real);
  const sibling = path.join(dir, 'cli.js');
  if (fs.existsSync(sibling)) return jsInfo(sibling);

  // Claude Code >= 2.1: native installer binary, or npm's bin/claude.exe
  if (looksLikeNativeBinary(real)) return binaryInfo(real);

  // npm stub / shim: walk up to the package directory
  let current = dir;
  while (current !== path.dirname(current)) {
    if (
      path.basename(current) === 'claude-code' &&
      path.basename(path.dirname(current)) === '@anthropic-ai'
    ) {
      return inspectPackageDir(current);
    }
    const nested = path.join(current, 'node_modules', CC_PACKAGE);
    if (fs.existsSync(nested)) {
      const info = inspectPackageDir(nested);
      if (info) return info;
    }
    current = path.dirname(current);
  }

  return null;
}

function whichAll(command: string): string[] {
  try {
    const out = execSync(
      process.platform === 'win32' ? `where ${command}` : `which -a ${command}`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return [...new Set(out.split(/\r?\n/).map(s => s.trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

/** 1. Every `claude` on PATH (skipping our own wrapper). */
function findViaPath(): ClaudeCodeInfo | null {
  for (const candidate of whichAll('claude')) {
    const info = classifyCommand(candidate);
    if (info) return info;
  }
  return null;
}

function compareVersionsDesc(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return (pb[i] ?? 0) - (pa[i] ?? 0);
  }
  return 0;
}

/** 2. Native installer (`curl -fsSL https://claude.ai/install.sh | bash`) and legacy ~/.claude layouts. */
function findViaNativeInstaller(): ClaudeCodeInfo | null {
  const home = os.homedir();

  const versionsDir = path.join(home, '.local', 'share', 'claude', 'versions');
  try {
    const versions = fs.readdirSync(versionsDir)
      .filter(entry => /^\d+\.\d+\.\d+/.test(entry))
      .sort(compareVersionsDesc);
    for (const version of versions) {
      const candidate = path.join(versionsDir, version);
      if (looksLikeNativeBinary(candidate)) return binaryInfo(candidate);
    }
  } catch {
    // no native install
  }

  const legacy = [
    path.join(home, '.claude', 'local', 'cli.js'),
    path.join(home, '.claude', 'local', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
    path.join(home, '.claude', 'bin', 'cli.js'),
    path.join(home, '.claude', 'lib', 'cli.js'),
    '/Applications/Claude Code.app/Contents/Resources/cli.js',
    path.join(home, 'Library', 'Application Support', 'claude-code', 'cli.js'),
    path.join(home, '.local', 'share', 'claude-code', 'cli.js'),
    '/opt/claude-code/cli.js',
  ];
  for (const candidate of legacy) {
    if (fs.existsSync(candidate)) return jsInfo(candidate);
  }

  return null;
}

/** 3. `npm root -g` */
function findViaNpmGlobal(): ClaudeCodeInfo | null {
  try {
    const npmRoot = execSync('npm root -g', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!npmRoot) return null;
    return inspectPackageDir(path.join(npmRoot, CC_PACKAGE));
  } catch {
    return null;
  }
}

/** 4. Volta */
function findViaVolta(): ClaudeCodeInfo | null {
  const voltaHome = process.env.VOLTA_HOME || path.join(os.homedir(), '.volta');
  const nodeImagesDir = path.join(voltaHome, 'tools', 'image', 'node');

  try {
    const versions = fs.readdirSync(nodeImagesDir);
    for (const version of versions.reverse()) {
      const info = inspectPackageDir(
        path.join(nodeImagesDir, version, 'lib', 'node_modules', CC_PACKAGE),
      );
      if (info) return info;
    }
  } catch {
    // volta not installed
  }
  return null;
}

/** 5. Common global node_modules locations. */
function findViaCommonPaths(): ClaudeCodeInfo | null {
  const home = os.homedir();
  const roots: string[] = [
    '/usr/local/lib/node_modules',
    '/usr/lib/node_modules',
    '/opt/homebrew/lib/node_modules',
  ];

  const nvmDir = process.env.NVM_DIR || path.join(home, '.nvm');
  try {
    const versionsDir = path.join(nvmDir, 'versions', 'node');
    for (const version of fs.readdirSync(versionsDir).reverse()) {
      roots.push(path.join(versionsDir, version, 'lib', 'node_modules'));
    }
  } catch {
    // nvm not installed
  }

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    roots.push(path.join(appData, 'npm', 'node_modules'));
  }

  for (const root of roots) {
    const info = inspectPackageDir(path.join(root, CC_PACKAGE));
    if (info) return info;
  }
  return null;
}

/**
 * Find the Claude Code installation to patch.
 *
 * Search order:
 * 1. every `claude` on PATH (our own wrapper is skipped)
 * 2. native installer (~/.local/share/claude/versions/) and legacy ~/.claude paths
 * 3. `npm root -g`
 * 4. Volta
 * 5. common global node_modules paths (incl. nvm)
 *
 * @throws Error with installation instructions if not found
 */
export async function findClaudeCodeCli(): Promise<ClaudeCodeInfo> {
  const strategies = [
    findViaPath,
    findViaNativeInstaller,
    findViaNpmGlobal,
    findViaVolta,
    findViaCommonPaths,
  ];

  for (const strategy of strategies) {
    const info = strategy();
    if (info) return info;
  }

  throw new Error(
    'Could not find Claude Code installation.\n\n' +
    'Make sure Claude Code is installed:\n' +
    '  npm install -g @anthropic-ai/claude-code\n' +
    '  or: curl -fsSL https://claude.ai/install.sh | bash\n\n' +
    'Then try again: cc-i18n patch --lang zh-TW'
  );
}

/**
 * Get all possible Claude Code installation paths for the current platform.
 */
export function getSearchPaths(): string[] {
  const paths: string[] = [];
  const home = os.homedir();

  paths.push(...whichAll('claude'));

  try {
    const npmRoot = execSync('npm root -g', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    paths.push(path.join(npmRoot, CC_PACKAGE, 'cli.js'));
    paths.push(path.join(npmRoot, CC_PACKAGE, 'bin', 'claude.exe'));
  } catch { /* npm not available */ }

  paths.push(
    // Native installer
    path.join(home, '.local', 'share', 'claude', 'versions'),
    path.join(home, '.local', 'bin', 'claude'),
    // Legacy native paths
    path.join(home, '.claude', 'local', 'cli.js'),
    path.join(home, '.claude', 'bin', 'cli.js'),
    path.join(home, '.claude', 'lib', 'cli.js'),
    // npm global paths
    '/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js',
    '/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js',
    '/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/bin/claude.exe',
    path.join(home, '.volta', 'tools', 'image', 'node'),
  );

  return paths;
}
