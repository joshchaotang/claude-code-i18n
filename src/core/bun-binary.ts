/**
 * Reader / writer for the module graph embedded in a Bun standalone executable.
 *
 * Since v2.1.x Claude Code no longer ships `cli.js`: the whole bundle is
 * compiled into a single Bun executable (Mach-O on macOS, ELF on Linux, PE on
 * Windows). The JavaScript is still inside the binary as plain text, stored in
 * a blob that Bun locates through a fixed trailer:
 *
 *   [ blob (byte_count bytes) ][ Offsets (32 bytes) ][ "\n---- Bun! ----\n" ]
 *
 *   Offsets (little-endian)
 *     u64 byte_count        size of the blob
 *     u32 modules.off/len   pointer (relative to blob start) to the module table
 *     u32 entry_point_id    index of the entry module
 *     u32 argv.off/len      compile-time exec argv (usually empty)
 *     u32 flags
 *
 *   Module table entry - 52 bytes = 13 x u32
 *     name{off,len} contents{off,len} sourcemap{off,len} bytecode{off,len}
 *     bytecodeEnd{off,len=0} name2{off,len}   (name2: copy of name, or empty)
 *     packed: encoding u8 | loader u8 | module_format u8 | side u8
 *
 *   encoding: 0 = raw bytes, 1 = latin1 (8-bit JS string), 2 = UTF-16LE
 *   loader:   1 = JavaScript module
 *
 * Layout inside the blob (as produced by Bun 1.4): [ bytecode... ][ contents... ]
 * [ names... ][ module table ][ lookup tables ]. Besides the module table Bun
 * keeps a second bytecode index (in the lookup tables) that points at chunks
 * living between the module bytecode blobs; those chunks are used without
 * consulting the module table, so they must stay in place. We therefore only
 * ever reuse space the module table itself owns: every JS module is laid out
 * again with its translated text inside the old bytecode + contents ranges,
 * all pre-compiled bytecode is dropped (it would no longer match the source),
 * and everything else stays exactly where it was. The file keeps its size and
 * every section header remains valid.
 */

export const BUN_TRAILER = Buffer.from('\n---- Bun! ----\n', 'latin1');
const OFFSETS_SIZE = 32;
const ENTRY_SIZE = 52;

export const ENCODING_BINARY = 0;
export const ENCODING_LATIN1 = 1;
export const ENCODING_UTF16 = 2;
export const LOADER_JS = 1;

export interface BlobPointer {
  off: number;
  len: number;
}

export interface BunModule {
  index: number;
  name: string;
  namePtr: BlobPointer;
  contentsPtr: BlobPointer;
  sourcemapPtr: BlobPointer;
  bytecodePtr: BlobPointer;
  bytecodeEndPtr: BlobPointer;
  name2Ptr: BlobPointer;
  encoding: number;
  loader: number;
  moduleFormat: number;
  side: number;
}

export interface BunModuleGraph {
  /** File offset of the trailer string. */
  trailerOffset: number;
  /** File offset of the Offsets struct. */
  offsetsOffset: number;
  /** File offset where the blob begins. */
  blobStart: number;
  byteCount: number;
  modulesPtr: BlobPointer;
  entryPointId: number;
  argvPtr: BlobPointer;
  flags: number;
  modules: BunModule[];
}

export class BunFormatError extends Error {
  constructor(message: string) {
    super(`Unsupported Claude Code binary layout: ${message}`);
    this.name = 'BunFormatError';
  }
}

function readPtr(buf: Buffer, at: number): BlobPointer {
  return { off: buf.readUInt32LE(at), len: buf.readUInt32LE(at + 4) };
}

function writePtr(buf: Buffer, at: number, ptr: BlobPointer): void {
  buf.writeUInt32LE(ptr.off, at);
  buf.writeUInt32LE(ptr.len, at + 4);
}

function fitsBlob(ptr: BlobPointer, byteCount: number): boolean {
  return ptr.off <= byteCount && ptr.off + ptr.len <= byteCount;
}

/** Offset of the Bun trailer, or -1 when the buffer is not a Bun executable. */
export function findBunTrailer(buf: Buffer): number {
  return buf.lastIndexOf(BUN_TRAILER);
}

export function isBunStandalone(buf: Buffer): boolean {
  return findBunTrailer(buf) >= OFFSETS_SIZE;
}

/**
 * Parse the embedded module graph. Throws BunFormatError when anything about
 * the layout does not match what we know how to rewrite - the caller must then
 * leave the binary untouched.
 */
export function parseBunModuleGraph(buf: Buffer): BunModuleGraph {
  const trailerOffset = findBunTrailer(buf);
  if (trailerOffset < OFFSETS_SIZE) {
    throw new BunFormatError('Bun trailer not found (not a Bun standalone executable)');
  }

  const offsetsOffset = trailerOffset - OFFSETS_SIZE;
  const byteCountBig = buf.readBigUInt64LE(offsetsOffset);
  if (byteCountBig > BigInt(offsetsOffset)) {
    throw new BunFormatError('blob size exceeds file size');
  }
  const byteCount = Number(byteCountBig);
  const blobStart = offsetsOffset - byteCount;
  const modulesPtr = readPtr(buf, offsetsOffset + 8);
  const entryPointId = buf.readUInt32LE(offsetsOffset + 16);
  const argvPtr = readPtr(buf, offsetsOffset + 20);
  const flags = buf.readUInt32LE(offsetsOffset + 28);

  if (modulesPtr.len === 0 || modulesPtr.len % ENTRY_SIZE !== 0 || !fitsBlob(modulesPtr, byteCount)) {
    throw new BunFormatError(`module table pointer is invalid (${modulesPtr.off}+${modulesPtr.len})`);
  }
  const count = modulesPtr.len / ENTRY_SIZE;
  if (entryPointId >= count) {
    throw new BunFormatError('entry point index out of range');
  }

  const modules: BunModule[] = [];
  for (let k = 0; k < count; k++) {
    const at = blobStart + modulesPtr.off + k * ENTRY_SIZE;
    const namePtr = readPtr(buf, at);
    const contentsPtr = readPtr(buf, at + 8);
    const sourcemapPtr = readPtr(buf, at + 16);
    const bytecodePtr = readPtr(buf, at + 24);
    const bytecodeEndPtr = readPtr(buf, at + 32);
    const name2Ptr = readPtr(buf, at + 40);
    const packed = buf.readUInt32LE(at + 48);

    for (const ptr of [namePtr, contentsPtr, sourcemapPtr, bytecodePtr, bytecodeEndPtr, name2Ptr]) {
      if (!fitsBlob(ptr, byteCount)) {
        throw new BunFormatError(`module ${k} has a pointer outside the blob`);
      }
    }
    if (namePtr.len === 0 || bytecodeEndPtr.len !== 0) {
      throw new BunFormatError(`module ${k} table entry has an unexpected shape`);
    }

    const name = buf.toString('latin1', blobStart + namePtr.off, blobStart + namePtr.off + namePtr.len);
    // The second name field is either empty or a copy of the first one.
    if (name2Ptr.len !== 0) {
      const name2 = buf.toString('latin1', blobStart + name2Ptr.off, blobStart + name2Ptr.off + name2Ptr.len);
      if (name2 !== name) {
        throw new BunFormatError(`module ${k} name fields disagree ("${name}" vs "${name2}")`);
      }
    }

    modules.push({
      index: k,
      name,
      namePtr,
      contentsPtr,
      sourcemapPtr,
      bytecodePtr,
      bytecodeEndPtr,
      name2Ptr,
      encoding: packed & 0xff,
      loader: (packed >>> 8) & 0xff,
      moduleFormat: (packed >>> 16) & 0xff,
      side: (packed >>> 24) & 0xff,
    });
  }

  if (!modules[entryPointId].name.startsWith('/$bunfs/')) {
    throw new BunFormatError(`entry module has an unexpected name "${modules[entryPointId].name}"`);
  }

  return {
    trailerOffset,
    offsetsOffset,
    blobStart,
    byteCount,
    modulesPtr,
    entryPointId,
    argvPtr,
    flags,
    modules,
  };
}

/** True for modules that Bun executes as JavaScript (as opposed to embedded assets). */
export function isJsModule(mod: BunModule): boolean {
  return mod.loader === LOADER_JS && mod.encoding !== ENCODING_BINARY;
}

export function readModuleBytes(buf: Buffer, graph: BunModuleGraph, mod: BunModule): Buffer {
  const start = graph.blobStart + mod.contentsPtr.off;
  return buf.subarray(start, start + mod.contentsPtr.len);
}

export function decodeModuleText(buf: Buffer, graph: BunModuleGraph, mod: BunModule): string {
  const bytes = readModuleBytes(buf, graph, mod);
  if (mod.encoding === ENCODING_UTF16) return bytes.toString('utf16le');
  if (mod.encoding === ENCODING_LATIN1) return bytes.toString('latin1');
  throw new BunFormatError(`module "${mod.name}" is not text`);
}

// Any character above U+00FF forces the 16-bit representation.
const NON_LATIN1 = /[^\x00-\xff]/;

/**
 * Encode JS source the way Bun stores it: 8-bit when every character fits in
 * latin1, UTF-16LE otherwise (this is what the encoding byte selects).
 */
export function encodeModuleText(text: string): { bytes: Buffer; encoding: number } {
  if (NON_LATIN1.test(text)) {
    return { bytes: Buffer.from(text, 'utf16le'), encoding: ENCODING_UTF16 };
  }
  return { bytes: Buffer.from(text, 'latin1'), encoding: ENCODING_LATIN1 };
}

export interface JsSource {
  index: number;
  name: string;
  text: string;
}

/** Decode every JavaScript module of the graph. */
export function extractJsSources(buf: Buffer, graph: BunModuleGraph): JsSource[] {
  return graph.modules
    .filter(isJsModule)
    .map(mod => ({ index: mod.index, name: mod.name, text: decodeModuleText(buf, graph, mod) }));
}

export interface RewriteResult {
  buffer: Buffer;
  /** Number of modules whose text was replaced. */
  modified: number;
  /** Bytes left unused in the reusable space after re-layout. */
  freeBytes: number;
  /** Blob ranges [start, end) that were reused (former module data). */
  segments: { start: number; end: number }[];
}

/**
 * Alignment padding Bun leaves between consecutive bytecode blobs is < 128
 * bytes; anything larger that no module entry points at is treated as
 * reserved data (Bun keeps a second bytecode index there whose chunks it
 * uses without going through the module table).
 */
const MAX_PADDING_GAP = 128;

/**
 * Produce a copy of `buf` in which the given JS modules carry new source text.
 *
 * Only space that the module table itself owns is reused: the contents,
 * source maps and pre-compiled bytecode of the modules. Pre-compiled bytecode
 * is dropped for every module (it would no longer match the translated
 * source) and its space, together with the old contents region, receives the
 * new module contents. Everything else - names, module table, Bun's lookup
 * tables, any data the table does not point at, Offsets and trailer - keeps
 * its position and value, so the output has the same size as the input.
 */
export function rewriteBunModuleGraph(
  buf: Buffer,
  graph: BunModuleGraph,
  newTexts: Map<number, string>,
): RewriteResult {
  const { blobStart, byteCount, modules } = graph;

  // Nothing may be written at or after the first name / the module table.
  let limit = Math.min(graph.modulesPtr.off, byteCount);
  for (const mod of modules) {
    limit = Math.min(limit, mod.namePtr.off);
    if (mod.name2Ptr.len > 0) limit = Math.min(limit, mod.name2Ptr.off);
  }

  // Space owned by module entries, merged across alignment padding.
  const owned: { start: number; end: number }[] = [];
  for (const mod of modules) {
    for (const ptr of [mod.contentsPtr, mod.sourcemapPtr, mod.bytecodePtr]) {
      if (ptr.len === 0) continue;
      if (ptr.off + ptr.len > limit) {
        throw new BunFormatError(`module "${mod.name}" data overlaps the module names`);
      }
      owned.push({ start: ptr.off, end: ptr.off + ptr.len + 1 }); // +1: Bun's NUL terminator
    }
  }
  owned.sort((a, b) => a.start - b.start);
  const segments: { start: number; end: number }[] = [];
  for (const range of owned) {
    const last = segments[segments.length - 1];
    if (last && range.start - last.end <= MAX_PADDING_GAP) {
      last.end = Math.max(last.end, range.end);
    } else {
      segments.push({ ...range });
    }
  }
  for (const seg of segments) seg.end = Math.min(seg.end, limit);
  if (segments.length === 0) {
    throw new BunFormatError('module table owns no data');
  }

  // New payload for every module, in the original on-disk order.
  const order = modules.slice().sort((a, b) => a.contentsPtr.off - b.contentsPtr.off);
  const payloads = new Map<number, { contents: Buffer; sourcemap: Buffer; encoding: number }>();
  let modified = 0;
  for (const mod of order) {
    let contents = readModuleBytes(buf, graph, mod);
    let encoding = mod.encoding;
    const text = newTexts.get(mod.index);
    if (text !== undefined) {
      if (!isJsModule(mod)) {
        throw new BunFormatError(`refusing to rewrite non-JS module "${mod.name}"`);
      }
      const encoded = encodeModuleText(text);
      contents = encoded.bytes;
      encoding = encoded.encoding;
      modified++;
    }
    const sm = mod.sourcemapPtr;
    const sourcemap = sm.len > 0
      ? Buffer.from(buf.subarray(blobStart + sm.off, blobStart + sm.off + sm.len))
      : Buffer.alloc(0);
    payloads.set(mod.index, { contents: Buffer.from(contents), sourcemap, encoding });
  }

  // First-fit placement into the reusable segments, in order.
  const out = Buffer.from(buf);
  for (const seg of segments) out.fill(0, blobStart + seg.start, blobStart + seg.end);

  let segIndex = 0;
  let cursor = segments[0].start;
  const place = (bytes: Buffer, align: number): number => {
    for (;;) {
      const seg = segments[segIndex];
      if (!seg) {
        const needed = order.reduce((sum, m) => {
          const p = payloads.get(m.index)!;
          return sum + p.contents.length + 2 + (p.sourcemap.length ? p.sourcemap.length + 1 : 0);
        }, 0);
        const available = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
        throw new BunFormatError(
          `translated code does not fit in the binary (${needed} bytes needed, ${available} reusable)`,
        );
      }
      let at = Math.max(cursor, seg.start);
      if (align > 1 && at % align !== 0) at += align - (at % align);
      if (at + bytes.length + 1 <= seg.end) { // +1: NUL terminator
        bytes.copy(out, blobStart + at);
        cursor = at + bytes.length + 1;
        return at;
      }
      segIndex++;
      cursor = seg ? (segments[segIndex]?.start ?? 0) : 0;
    }
  };

  for (const mod of order) {
    const payload = payloads.get(mod.index)!;

    // Bun maps UTF-16 contents directly as 16-bit code units: they must start
    // on an even offset (the original layout pads them the same way).
    const contentsOff = place(payload.contents, payload.encoding === ENCODING_UTF16 ? 2 : 1);
    const contentsPtr: BlobPointer = { off: contentsOff, len: payload.contents.length };

    let sourcemapPtr: BlobPointer = mod.sourcemapPtr.len > 0 ? { off: 0, len: 0 } : mod.sourcemapPtr;
    if (payload.sourcemap.length > 0) {
      sourcemapPtr = { off: place(payload.sourcemap, 1), len: payload.sourcemap.length };
    }

    const at = blobStart + graph.modulesPtr.off + mod.index * ENTRY_SIZE;
    writePtr(out, at, mod.namePtr);
    writePtr(out, at + 8, contentsPtr);
    writePtr(out, at + 16, sourcemapPtr);
    writePtr(out, at + 24, { off: 0, len: 0 }); // bytecode dropped
    writePtr(out, at + 32, { off: 0, len: 0 });
    writePtr(out, at + 40, mod.name2Ptr);
    const packed =
      (payload.encoding & 0xff) |
      ((mod.loader & 0xff) << 8) |
      ((mod.moduleFormat & 0xff) << 16) |
      ((mod.side & 0xff) << 24);
    out.writeUInt32LE(packed >>> 0, at + 48);
  }

  let freeBytes = 0;
  segments.forEach((seg, i) => {
    if (i < segIndex) return;
    freeBytes += i === segIndex ? Math.max(0, seg.end - cursor) : seg.end - seg.start;
  });

  return { buffer: out, modified, freeBytes, segments };
}
