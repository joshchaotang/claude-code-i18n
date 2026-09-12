import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  execFileSync: vi.fn(),
}));

vi.mock('fs-extra', () => {
  const fns = {
    existsSync: vi.fn(),
    realpathSync: vi.fn(),
    readJsonSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    readFileSync: vi.fn(),
    openSync: vi.fn(),
    readSync: vi.fn(),
    closeSync: vi.fn(),
  };
  return { ...fns, default: fns };
});

import { execSync, execFileSync } from 'node:child_process';
import fs from 'fs-extra';
import { findClaudeCodeCli, getSearchPaths, isOurWrapper, looksLikeNativeBinary } from '../src/core/finder.js';

const mockExecSync = vi.mocked(execSync);
const mockExecFileSync = vi.mocked(execFileSync);
const mockExistsSync = vi.mocked(fs.existsSync);
const mockRealpathSync = vi.mocked(fs.realpathSync);
const mockReadJsonSync = vi.mocked(fs.readJsonSync);
const mockReaddirSync = vi.mocked(fs.readdirSync);
const mockStatSync = vi.mocked(fs.statSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockOpenSync = vi.mocked(fs.openSync);
const mockReadSync = vi.mocked(fs.readSync);

const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);
const MACHO_MAGIC = Buffer.from([0xcf, 0xfa, 0xed, 0xfe]);

const NPM_PKG = '/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code';
const NPM_EXE = path.join(NPM_PKG, 'bin', 'claude.exe');
const WRAPPER = path.join(os.homedir(), '.local', 'bin', 'claude');

/** Everything fails / does not exist unless a test says otherwise. */
function resetDefaults() {
  vi.resetAllMocks();
  mockExecSync.mockImplementation(() => { throw new Error('command failed'); });
  mockExecFileSync.mockImplementation(() => { throw new Error('command failed'); });
  mockExistsSync.mockReturnValue(false);
  mockRealpathSync.mockImplementation((p: unknown) => p as string);
  mockReadJsonSync.mockImplementation(() => { throw new Error('ENOENT'); });
  mockReaddirSync.mockImplementation(() => { throw new Error('ENOENT'); });
  mockStatSync.mockImplementation(() => { throw new Error('ENOENT'); });
  mockReadFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
  mockOpenSync.mockReturnValue(3);
  mockReadSync.mockReturnValue(0);
}

/** Make `files` look like large native executables with the given magic. */
function mockBinaries(files: Record<string, Buffer>, textFiles: Record<string, string> = {}) {
  mockStatSync.mockImplementation((p: unknown) => {
    const key = p as string;
    if (files[key]) return { isFile: () => true, size: 200 * 1024 * 1024 } as never;
    if (textFiles[key] !== undefined) return { isFile: () => true, size: textFiles[key].length } as never;
    throw new Error('ENOENT');
  });
  mockReadFileSync.mockImplementation((p: unknown) => {
    const key = p as string;
    if (textFiles[key] !== undefined) return textFiles[key] as never;
    throw new Error('ENOENT');
  });
  let current: string | null = null;
  mockOpenSync.mockImplementation((p: unknown) => {
    current = p as string;
    return 3 as never;
  });
  mockReadSync.mockImplementation(((_fd: number, buf: Buffer) => {
    const magic = current ? files[current] : undefined;
    if (!magic) return 0;
    magic.copy(buf);
    return magic.length;
  }) as never);
}

describe('finder', () => {
  beforeEach(() => {
    resetDefaults();
  });

  describe('findClaudeCodeCli', () => {
    it('finds legacy cli.js via `which -a claude` → symlink', async () => {
      const cliPath = path.join(NPM_PKG, 'cli.js');
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'which -a claude') return '/opt/homebrew/bin/claude\n';
        throw new Error('unexpected command');
      });
      mockRealpathSync.mockReturnValue(cliPath);
      mockExistsSync.mockImplementation((p: unknown) => p === cliPath);
      mockReadJsonSync.mockReturnValue({ version: '2.0.77' });

      const result = await findClaudeCodeCli();
      expect(result.kind).toBe('js');
      expect(result.cliPath).toBe(cliPath);
      expect(result.version).toBe('2.0.77');
      expect(result.packageDir).toBe(NPM_PKG);
    });

    it('finds the native binary that npm installs as bin/claude.exe', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'which -a claude') return '/opt/homebrew/bin/claude\n';
        throw new Error('unexpected command');
      });
      mockRealpathSync.mockReturnValue(NPM_EXE);
      mockBinaries({ [NPM_EXE]: MACHO_MAGIC });
      mockReadJsonSync.mockImplementation((p: unknown) => {
        if (p === path.join(NPM_PKG, 'package.json')) return { version: '2.1.269' };
        throw new Error('ENOENT');
      });

      const result = await findClaudeCodeCli();
      expect(result.kind).toBe('binary');
      expect(result.cliPath).toBe(NPM_EXE);
      expect(result.packageDir).toBe(NPM_PKG);
      expect(result.version).toBe('2.1.269');
    });

    it('skips the cc-i18n wrapper and uses the next `claude` on PATH', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'which -a claude') return `${WRAPPER}\n/opt/homebrew/bin/claude\n`;
        throw new Error('unexpected command');
      });
      mockRealpathSync.mockImplementation((p: unknown) =>
        p === '/opt/homebrew/bin/claude' ? NPM_EXE : (p as string),
      );
      mockBinaries(
        { [NPM_EXE]: ELF_MAGIC },
        { [WRAPPER]: '#!/bin/bash\n# cc-i18n wrapper v3 — auto re-patch\nexec claude "$@"\n' },
      );
      mockReadJsonSync.mockImplementation((p: unknown) => {
        if (p === path.join(NPM_PKG, 'package.json')) return { version: '2.1.269' };
        throw new Error('ENOENT');
      });

      const result = await findClaudeCodeCli();
      expect(result.cliPath).toBe(NPM_EXE);
      expect(result.kind).toBe('binary');
    });

    it('finds the native installer binary under ~/.local/share/claude/versions', async () => {
      const versionsDir = path.join(os.homedir(), '.local', 'share', 'claude', 'versions');
      const latest = path.join(versionsDir, '2.1.269');
      mockReaddirSync.mockImplementation((p: unknown) => {
        if (p === versionsDir) return ['2.1.100', '2.1.269', 'latest'] as never;
        throw new Error('ENOENT');
      });
      mockBinaries({ [latest]: MACHO_MAGIC });

      const result = await findClaudeCodeCli();
      expect(result.kind).toBe('binary');
      expect(result.cliPath).toBe(latest);
      expect(result.version).toBe('2.1.269');
    });

    it('finds cli.js via `npm root -g`', async () => {
      const cliPath = '/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js';
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'npm root -g') return '/usr/local/lib/node_modules\n';
        throw new Error('not found');
      });
      mockExistsSync.mockImplementation((p: unknown) => p === cliPath);
      mockReadJsonSync.mockReturnValue({ version: '2.0.0' });

      const result = await findClaudeCodeCli();
      expect(result.kind).toBe('js');
      expect(result.cliPath).toBe(cliPath);
      expect(result.version).toBe('2.0.0');
    });

    it('throws with a helpful message when nothing is found', async () => {
      await expect(findClaudeCodeCli()).rejects.toThrow('Could not find Claude Code installation');
      await expect(findClaudeCodeCli()).rejects.toThrow('npm install -g @anthropic-ai/claude-code');
    });
  });

  describe('helpers', () => {
    it('isOurWrapper recognises only small files with the marker', () => {
      mockBinaries({ [NPM_EXE]: ELF_MAGIC }, { [WRAPPER]: '# cc-i18n wrapper v3' });
      expect(isOurWrapper(WRAPPER)).toBe(true);
      expect(isOurWrapper(NPM_EXE)).toBe(false);
      expect(isOurWrapper('/nope')).toBe(false);
    });

    it('looksLikeNativeBinary needs a large file with an executable magic', () => {
      mockBinaries({ [NPM_EXE]: ELF_MAGIC }, { [WRAPPER]: '# cc-i18n wrapper v3' });
      expect(looksLikeNativeBinary(NPM_EXE)).toBe(true);
      expect(looksLikeNativeBinary(WRAPPER)).toBe(false);
      expect(looksLikeNativeBinary('/nope')).toBe(false);
    });
  });

  describe('getSearchPaths', () => {
    it('should return an array of paths', () => {
      const paths = getSearchPaths();
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBeGreaterThan(0);
    });
  });
});
