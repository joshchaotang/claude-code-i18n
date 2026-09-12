import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

const CLI = path.join(__dirname, '..', 'dist', 'cli.js');

function run(args: string): string {
  return execSync(`node ${CLI} ${args}`, {
    encoding: 'utf-8',
    timeout: 30000,
    cwd: path.join(__dirname, '..'),
  }).trim();
}

describe('CLI integration', () => {
  it('should show version', () => {
    const output = run('--version');
    expect(output).toBe('1.2.0');
  });

  it('should show help with taiji branding', () => {
    const output = run('--help');
    expect(output).toContain('cc-i18n');
    expect(output).toContain('patch');
    expect(output).toContain('unpatch');
    expect(output).toContain('check-update');
  });

  it('should list available languages with groups', () => {
    const output = run('list');
    expect(output).toContain('zh-TW');
    expect(output).toContain('zh-CN');
    expect(output).toContain('recommended');
    expect(output).toContain('technical');
  });

  it('should show status when no patch applied', () => {
    const output = run('status');
    expect(output).toContain('No patch applied');
  });

  it('should print shell hook', () => {
    const output = run('check-update --hook');
    expect(output).toContain('cc-i18n-check');
  });

  it('should fail patch with invalid locale', () => {
    try {
      run('patch --lang nonexistent-locale');
      expect.unreachable('Should have thrown');
    } catch (err) {
      const stderr = (err as { stderr?: string }).stderr || '';
      expect(stderr).toContain('not found');
    }
  });
});
