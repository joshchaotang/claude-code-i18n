import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const BACKUP_SUFFIX = '.cc-i18n-backup';
const BACKUP_DIR = path.join(os.homedir(), '.cc-i18n', 'backups');

export interface BackupInfo {
  path: string;
  date: Date;
  md5: string;
  size: number;
}

/**
 * Where the pristine copy of a Claude Code file is kept.
 *
 * - `cli.js` (Claude Code <= 2.0): next to the file, as before.
 * - native binaries (Claude Code >= 2.1): under ~/.cc-i18n/backups/, so that
 *   the installer's own directories (e.g. ~/.local/share/claude/versions/)
 *   never see a stray 200 MB file.
 */
export function getBackupPath(cliPath: string): string {
  if (cliPath.endsWith('.js')) {
    return cliPath + BACKUP_SUFFIX;
  }
  const hash = crypto.createHash('sha1').update(cliPath).digest('hex').slice(0, 10);
  return path.join(BACKUP_DIR, `${path.basename(cliPath)}.${hash}${BACKUP_SUFFIX}`);
}

function computeMd5(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Create a backup of the original file before patching.
 * If a backup already exists, it is preserved (we only back up the original).
 *
 * @returns Path to the backup file
 */
export async function createBackup(cliPath: string): Promise<string> {
  const backupPath = getBackupPath(cliPath);

  if (!await fs.pathExists(backupPath)) {
    await fs.ensureDir(path.dirname(backupPath));
    await fs.copy(cliPath, backupPath);
  }

  return backupPath;
}

/**
 * Restore the original file from its backup.
 *
 * @returns true if restore succeeded
 */
export async function restoreBackup(cliPath: string): Promise<boolean> {
  const backupPath = getBackupPath(cliPath);

  if (!await fs.pathExists(backupPath)) {
    return false;
  }

  await fs.copy(backupPath, cliPath, { overwrite: true });
  return true;
}

/**
 * Remove the backup file after a successful unpatch.
 */
export async function removeBackup(cliPath: string): Promise<void> {
  const backupPath = getBackupPath(cliPath);
  if (await fs.pathExists(backupPath)) {
    await fs.remove(backupPath);
  }
}

/**
 * Check if a backup exists.
 */
export async function hasValidBackup(cliPath: string): Promise<boolean> {
  return fs.pathExists(getBackupPath(cliPath));
}

/**
 * Get metadata about the backup file.
 */
export async function getBackupInfo(cliPath: string): Promise<BackupInfo | null> {
  const backupPath = getBackupPath(cliPath);

  if (!await fs.pathExists(backupPath)) {
    return null;
  }

  const stat = await fs.stat(backupPath);
  const md5 = computeMd5(backupPath);

  return {
    path: backupPath,
    date: stat.mtime,
    md5,
    size: stat.size,
  };
}

/**
 * Compute MD5 hash of the current Claude Code file (for detecting CC updates).
 */
export function getCliMd5(cliPath: string): string {
  return computeMd5(cliPath);
}
