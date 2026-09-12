import { describe, it, expect } from 'vitest';
import {
  BUN_TRAILER,
  BunFormatError,
  ENCODING_BINARY,
  ENCODING_LATIN1,
  ENCODING_UTF16,
  LOADER_JS,
  decodeModuleText,
  encodeModuleText,
  extractJsSources,
  isBunStandalone,
  isJsModule,
  parseBunModuleGraph,
  readModuleBytes,
  rewriteBunModuleGraph,
} from '../src/core/bun-binary.js';

const LOADER_FILE = 5;
const LOADER_TEXT = 13;
const ENTRY_SIZE = 52;

interface SynthModule {
  name: string;
  text?: string;
  bytes?: Buffer;
  encoding: number;
  loader: number;
  /** size of fake pre-compiled bytecode */
  bytecode?: number;
  /** leave the second name field empty (Bun does this for some modules) */
  noName2?: boolean;
}

function writePtr(buf: Buffer, at: number, off: number, len: number): void {
  buf.writeUInt32LE(off, at);
  buf.writeUInt32LE(len, at + 4);
}

/**
 * Build a file that mimics a Bun standalone executable:
 *   [prefix][blob: 120 zero bytes | bytecode | contents | names | table | slack | 0][Offsets][trailer][suffix]
 */
function buildImage(
  mods: SynthModule[],
  opts: { slack?: number; prefix?: Buffer; suffix?: Buffer; reserved?: Buffer } = {},
) {
  const prefix = opts.prefix ?? Buffer.from('\x7fELF fake machine code that never changes ');
  const suffix = opts.suffix ?? Buffer.from(' .strtab .shstrtab section headers live after the trailer');
  const slack = opts.slack ?? 64;
  // Data that no module entry points at (Bun's second bytecode index uses such chunks)
  const reserved = opts.reserved ?? Buffer.alloc(0);

  const entries = mods.map(m => ({
    ...m,
    namePtr: { off: 0, len: 0 },
    name2Ptr: { off: 0, len: 0 },
    contentsPtr: { off: 0, len: 0 },
    bytecodePtr: { off: 0, len: 0 },
    bytecodeEndPtr: { off: 0, len: 0 },
  }));
  const chunks: { off: number; data: Buffer }[] = [];
  let cursor = 120;

  for (const e of entries) {
    if (!e.bytecode) continue;
    while (cursor % 128 !== 120) cursor++;
    const data = Buffer.alloc(e.bytecode, 0xbc);
    chunks.push({ off: cursor, data });
    e.bytecodePtr = { off: cursor, len: data.length };
    cursor += data.length;
    e.bytecodeEndPtr = { off: cursor, len: 0 };
  }
  let reservedOff = -1;
  if (reserved.length > 0) {
    cursor += 512; // a gap far larger than alignment padding
    reservedOff = cursor;
    chunks.push({ off: cursor, data: reserved });
    cursor += reserved.length + 512;
  }
  const contentsStart = cursor;
  for (const e of entries) {
    const data = e.bytes ?? Buffer.from(e.text!, e.encoding === ENCODING_UTF16 ? 'utf16le' : 'latin1');
    if (e.encoding === ENCODING_UTF16 && cursor % 2 !== 0) cursor++; // Bun keeps UTF-16 on even offsets
    chunks.push({ off: cursor, data });
    e.contentsPtr = { off: cursor, len: data.length };
    cursor += data.length + 1;
  }
  const namesStart = cursor;
  for (const e of entries) {
    const n = Buffer.from(e.name, 'latin1');
    chunks.push({ off: cursor, data: n });
    e.namePtr = { off: cursor, len: n.length };
    cursor += n.length + 1;
    if (e.noName2) {
      e.name2Ptr = { off: 0, len: 0 };
    } else {
      chunks.push({ off: cursor, data: Buffer.from(n) });
      e.name2Ptr = { off: cursor, len: n.length };
      cursor += n.length + 1;
    }
  }
  const tableOff = cursor;
  const table = Buffer.alloc(entries.length * ENTRY_SIZE);
  entries.forEach((e, k) => {
    const at = k * ENTRY_SIZE;
    writePtr(table, at, e.namePtr.off, e.namePtr.len);
    writePtr(table, at + 8, e.contentsPtr.off, e.contentsPtr.len);
    writePtr(table, at + 16, 0, 0);
    writePtr(table, at + 24, e.bytecodePtr.off, e.bytecodePtr.len);
    writePtr(table, at + 32, e.bytecodeEndPtr.off, e.bytecodeEndPtr.len);
    writePtr(table, at + 40, e.name2Ptr.off, e.name2Ptr.len);
    table.writeUInt32LE((e.encoding | (e.loader << 8) | (1 << 16)) >>> 0, at + 48);
  });
  chunks.push({ off: tableOff, data: table });
  cursor += table.length;
  const slackData = Buffer.alloc(slack, 0x5a);
  chunks.push({ off: cursor, data: slackData });
  cursor += slack;
  const byteCount = cursor + 1; // trailing empty argv string

  const blob = Buffer.alloc(byteCount);
  for (const c of chunks) c.data.copy(blob, c.off);

  const offsets = Buffer.alloc(32);
  offsets.writeBigUInt64LE(BigInt(byteCount), 0);
  writePtr(offsets, 8, tableOff, table.length);
  offsets.writeUInt32LE(0, 16);
  writePtr(offsets, 20, byteCount - 1, 0);
  offsets.writeUInt32LE(0x1bff, 28);

  return {
    buf: Buffer.concat([prefix, blob, offsets, BUN_TRAILER, suffix]),
    prefix,
    suffix,
    contentsStart,
    namesStart,
    tableOff,
    tableLen: table.length,
    byteCount,
    reservedOff,
  };
}

const MODULES: SynthModule[] = [
  {
    name: '/$bunfs/root/cli',
    text: '// @bun @bytecode\nconsole.log("Hello", "Accept edits");',
    encoding: ENCODING_LATIN1,
    loader: LOADER_JS,
    bytecode: 300,
  },
  {
    name: '/$bunfs/root/chunk-abc123.js',
    text: '// @bun @bytecode\nexport const mode = "Plan Mode";',
    encoding: ENCODING_LATIN1,
    loader: LOADER_JS,
    bytecode: 200,
  },
  {
    name: '/$bunfs/root/notes.md',
    text: 'Résumé → 中文 notes',
    encoding: ENCODING_UTF16,
    loader: LOADER_TEXT,
  },
  {
    name: '/$bunfs/root/skill.md.zst',
    bytes: Buffer.from([0x28, 0xb5, 0x2f, 0xfd, 0x00, 0x01, 0x02, 0x03, 0xff]),
    encoding: ENCODING_BINARY,
    loader: LOADER_FILE,
  },
  {
    name: '/$bunfs/root/audio-capture.js',
    text: 'module.exports = require("./audio-capture.node");',
    encoding: ENCODING_LATIN1,
    loader: LOADER_JS,
    noName2: true,
  },
];

describe('bun-binary', () => {
  describe('parseBunModuleGraph', () => {
    it('reads the module table of a synthetic executable', () => {
      const img = buildImage(MODULES);
      expect(isBunStandalone(img.buf)).toBe(true);

      const graph = parseBunModuleGraph(img.buf);
      expect(graph.blobStart).toBe(img.prefix.length);
      expect(graph.byteCount).toBe(img.byteCount);
      expect(graph.entryPointId).toBe(0);
      expect(graph.flags).toBe(0x1bff);
      expect(graph.modules.map(m => m.name)).toEqual(MODULES.map(m => m.name));
      expect(graph.modules.map(m => m.encoding)).toEqual(MODULES.map(m => m.encoding));
      expect(graph.modules.map(m => m.loader)).toEqual(MODULES.map(m => m.loader));
      expect(graph.modules[0].bytecodePtr.len).toBe(300);
      expect(graph.modules[2].bytecodePtr.len).toBe(0);
    });

    it('decodes latin1 and UTF-16 text and leaves assets alone', () => {
      const img = buildImage(MODULES);
      const graph = parseBunModuleGraph(img.buf);

      expect(decodeModuleText(img.buf, graph, graph.modules[0])).toBe(MODULES[0].text);
      expect(decodeModuleText(img.buf, graph, graph.modules[2])).toBe(MODULES[2].text);
      expect(readModuleBytes(img.buf, graph, graph.modules[3]).equals(MODULES[3].bytes!)).toBe(true);
      expect(() => decodeModuleText(img.buf, graph, graph.modules[3])).toThrow(BunFormatError);

      expect(graph.modules.filter(isJsModule).map(m => m.index)).toEqual([0, 1, 4]);
      expect(extractJsSources(img.buf, graph).map(s => s.name)).toEqual([MODULES[0].name, MODULES[1].name, MODULES[4].name]);
      expect(graph.modules[4].name2Ptr).toEqual({ off: 0, len: 0 });
    });

    it('rejects files that are not Bun executables', () => {
      expect(isBunStandalone(Buffer.from('just some bytes'))).toBe(false);
      expect(() => parseBunModuleGraph(Buffer.from('just some bytes'))).toThrow(BunFormatError);
    });

    it('rejects a corrupted module table', () => {
      const img = buildImage(MODULES);
      const graph = parseBunModuleGraph(img.buf);
      const broken = Buffer.from(img.buf);
      // point the first module's name past the end of the blob
      broken.writeUInt32LE(graph.byteCount + 10, graph.blobStart + graph.modulesPtr.off);
      expect(() => parseBunModuleGraph(broken)).toThrow(BunFormatError);
    });
  });

  describe('encodeModuleText', () => {
    it('keeps latin1 text 8-bit and switches to UTF-16 for wider characters', () => {
      expect(encodeModuleText('plain ascii').encoding).toBe(ENCODING_LATIN1);
      expect(encodeModuleText('café').encoding).toBe(ENCODING_LATIN1);
      const wide = encodeModuleText('接受編輯 👍');
      expect(wide.encoding).toBe(ENCODING_UTF16);
      expect(wide.bytes.toString('utf16le')).toBe('接受編輯 👍');
    });
  });

  describe('rewriteBunModuleGraph', () => {
    it('replaces module text in place without changing the file size', () => {
      const img = buildImage(MODULES);
      const graph = parseBunModuleGraph(img.buf);
      const newText = '// @bun @bytecode\nconsole.log("哈囉", "接受編輯");';

      const result = rewriteBunModuleGraph(img.buf, graph, new Map([[0, newText]]));
      const out = result.buffer;

      expect(result.modified).toBe(1);
      expect(out.length).toBe(img.buf.length);
      expect(out.subarray(0, img.prefix.length).equals(img.prefix)).toBe(true);
      expect(out.subarray(out.length - img.suffix.length).equals(img.suffix)).toBe(true);

      // names, lookup data, Offsets and trailer are byte-identical
      const namesAbs = graph.blobStart + img.namesStart;
      const tableAbs = graph.blobStart + img.tableOff;
      expect(out.subarray(namesAbs, tableAbs).equals(img.buf.subarray(namesAbs, tableAbs))).toBe(true);
      expect(out.subarray(tableAbs + img.tableLen).equals(img.buf.subarray(tableAbs + img.tableLen))).toBe(true);

      const graph2 = parseBunModuleGraph(out);
      expect(graph2.modulesPtr).toEqual(graph.modulesPtr);
      expect(graph2.byteCount).toBe(graph.byteCount);
      expect(graph2.modules.map(m => m.name)).toEqual(MODULES.map(m => m.name));

      // translated module is now UTF-16 (on an even offset), everything else unchanged
      expect(graph2.modules[0].encoding).toBe(ENCODING_UTF16);
      expect(graph2.modules[0].contentsPtr.off % 2).toBe(0);
      expect(graph2.modules[2].contentsPtr.off % 2).toBe(0);
      expect(decodeModuleText(out, graph2, graph2.modules[0])).toBe(newText);
      expect(graph2.modules[1].encoding).toBe(ENCODING_LATIN1);
      expect(decodeModuleText(out, graph2, graph2.modules[1])).toBe(MODULES[1].text);
      expect(decodeModuleText(out, graph2, graph2.modules[2])).toBe(MODULES[2].text);
      expect(readModuleBytes(out, graph2, graph2.modules[3]).equals(MODULES[3].bytes!)).toBe(true);
      expect(decodeModuleText(out, graph2, graph2.modules[4])).toBe(MODULES[4].text);
      expect(graph2.modules[4].name2Ptr).toEqual({ off: 0, len: 0 });
      for (const m of graph2.modules) {
        expect(m.loader).toBe(MODULES[m.index].loader);
        expect(m.namePtr).toEqual(graph.modules[m.index].namePtr);
        // bytecode is dropped: it would not match the new source
        expect(m.bytecodePtr).toEqual({ off: 0, len: 0 });
        expect(m.bytecodeEndPtr).toEqual({ off: 0, len: 0 });
      }
      expect(result.freeBytes).toBeGreaterThan(0);
    });

    it('round-trips when nothing changes', () => {
      const img = buildImage(MODULES);
      const graph = parseBunModuleGraph(img.buf);
      const result = rewriteBunModuleGraph(img.buf, graph, new Map());
      expect(result.modified).toBe(0);
      const graph2 = parseBunModuleGraph(result.buffer);
      expect(extractJsSources(result.buffer, graph2)).toEqual(extractJsSources(img.buf, graph));
      expect(readModuleBytes(result.buffer, graph2, graph2.modules[3]).equals(MODULES[3].bytes!)).toBe(true);
    });

    it('refuses to rewrite a non-JS module', () => {
      const img = buildImage(MODULES);
      const graph = parseBunModuleGraph(img.buf);
      expect(() => rewriteBunModuleGraph(img.buf, graph, new Map([[3, 'text']]))).toThrow(BunFormatError);
    });

    it('never touches data the module table does not own', () => {
      const reserved = Buffer.alloc(4096, 0xee);
      // module 1 starts out large so that the contents region has room once it shrinks
      const mods: SynthModule[] = MODULES.map((m, i) =>
        i === 1 ? { ...m, text: '// @bun @bytecode\nexport const big = "' + 'x'.repeat(3000) + '";' } : m,
      );
      const img = buildImage(mods, { reserved });
      const graph = parseBunModuleGraph(img.buf);
      // Module 0 grows past the small bytecode area that precedes the reserved
      // chunk, so it has to spill into the (old contents) segment behind it.
      const grown = '// @bun @bytecode\nconsole.log("' + '接受編輯'.repeat(200) + '");';
      const shrunk = '// @bun @bytecode\nexport const big = "y";';

      const result = rewriteBunModuleGraph(img.buf, graph, new Map([[0, grown], [1, shrunk]]));
      const out = result.buffer;
      expect(result.segments.length).toBe(2);

      const resAbs = graph.blobStart + img.reservedOff;
      expect(out.subarray(resAbs, resAbs + reserved.length).equals(reserved)).toBe(true);

      const graph2 = parseBunModuleGraph(out);
      for (const m of graph2.modules) {
        const end = m.contentsPtr.off + m.contentsPtr.len;
        const overlaps = m.contentsPtr.off < img.reservedOff + reserved.length && end > img.reservedOff;
        expect(overlaps, `module ${m.name} overlaps reserved data`).toBe(false);
      }
      expect(graph2.modules[0].contentsPtr.off).toBeGreaterThan(img.reservedOff + reserved.length);
      expect(decodeModuleText(out, graph2, graph2.modules[0])).toBe(grown);
      expect(decodeModuleText(out, graph2, graph2.modules[1])).toBe(shrunk);
      expect(decodeModuleText(out, graph2, graph2.modules[2])).toBe(MODULES[2].text);
      expect(readModuleBytes(out, graph2, graph2.modules[3]).equals(MODULES[3].bytes!)).toBe(true);
      expect(decodeModuleText(out, graph2, graph2.modules[4])).toBe(MODULES[4].text);
    });

    it('fails cleanly when the translated code does not fit', () => {
      const tight: SynthModule[] = [
        { name: '/$bunfs/root/cli', text: 'var a = "x";', encoding: ENCODING_LATIN1, loader: LOADER_JS },
      ];
      const img = buildImage(tight, { slack: 0 });
      const graph = parseBunModuleGraph(img.buf);
      const huge = 'var a = "' + '接受'.repeat(500) + '";';
      expect(() => rewriteBunModuleGraph(img.buf, graph, new Map([[0, huge]]))).toThrow(/does not fit/);
      // and the input buffer was not modified along the way
      expect(parseBunModuleGraph(img.buf).modules[0].contentsPtr).toEqual(graph.modules[0].contentsPtr);
    });
  });
});
