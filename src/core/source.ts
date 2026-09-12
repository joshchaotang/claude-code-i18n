import fs from 'fs-extra';
import { parseBunModuleGraph, extractJsSources } from './bun-binary.js';

/** What kind of file we are patching. */
export type PatchTarget = 'js' | 'binary';

/**
 * Tell a legacy `cli.js` apart from a native Claude Code executable by
 * extension and file magic.
 */
export function detectPatchTarget(filePath: string): PatchTarget {
  if (/\.(?:m|c)?js$/.test(filePath)) return 'js';

  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, 'r');
    const head = Buffer.alloc(4);
    const n = fs.readSync(fd, head, 0, 4, 0);
    if (n === 4) {
      const magic = head.readUInt32BE(0);
      if (
        magic === 0x7f454c46 ||                          // ELF
        magic === 0xcffaedfe || magic === 0xfeedfacf ||  // Mach-O 64-bit
        magic === 0xcafebabe ||                          // Mach-O universal
        head.readUInt16BE(0) === 0x4d5a                  // PE
      ) {
        return 'binary';
      }
    }
  } catch {
    // fall through
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch { /* ignore */ }
    }
  }
  return 'js';
}

/**
 * Read the JavaScript that makes up Claude Code, whatever the packaging:
 * the text of `cli.js`, or every JS module embedded in the native binary
 * joined with newlines. Used by `scan`, `extract` and `verifyPatch`.
 */
export async function readClaudeSource(filePath: string): Promise<string> {
  if (detectPatchTarget(filePath) === 'js') {
    return fs.readFile(filePath, 'utf-8');
  }
  const buf = await fs.readFile(filePath);
  const graph = parseBunModuleGraph(buf);
  return extractJsSources(buf, graph).map(m => m.text).join('\n');
}
