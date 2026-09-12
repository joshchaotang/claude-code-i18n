import { execFileSync } from 'node:child_process';

/**
 * macOS refuses to launch a signed executable whose contents changed after
 * signing (Claude Code ships with a hardened-runtime Developer ID signature).
 * After rewriting the binary we therefore replace the signature with an ad-hoc
 * one. `codesign` is part of every macOS installation.
 */
export function needsCodesign(platform: NodeJS.Platform = process.platform): boolean {
  return platform === 'darwin';
}

export function adhocCodesign(binaryPath: string): void {
  try {
    execFileSync('codesign', ['--force', '--sign', '-', binaryPath], {
      stdio: 'pipe',
      timeout: 180_000,
    });
  } catch (err) {
    const e = err as { stderr?: Buffer | string; message: string };
    const detail = e.stderr ? String(e.stderr).trim() : e.message;
    throw new Error(`codesign failed: ${detail}`);
  }
}
