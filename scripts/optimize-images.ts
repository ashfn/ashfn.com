import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';

type Chunk = { type: string; bytes: Buffer };
function chunks(png: Buffer): Chunk[] {
  const result: Chunk[] = [];
  for (let offset = 8; offset < png.length;) {
    const end = offset + png.readUInt32BE(offset) + 12;
    result.push({ type: png.toString('ascii', offset + 4, offset + 8), bytes: png.subarray(offset, end) });
    offset = end;
  }
  return result;
}

// Keep the PNG container, exact RGBA values, dimensions, and every metadata
// chunk (especially ICC/gamma). Only replace the compressed image-data chunks.
// Cache by source hash so content-only edits do not recompress all the images.
export async function optimizeImages(dist: string) {
  const report: { file: string; original: number; optimized: number }[] = [];
  const cache = path.resolve('.cache/images');
  await mkdir(cache, { recursive: true });
  async function walk(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    return (await Promise.all(entries.map(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))).flat();
  }
  for (const file of (await walk('public/media')).filter(file => file.endsWith('.png'))) {
    const original = await readFile(file);
    const sourceChunks = chunks(original);
    const colorType = original[25];
    // Preserve less common pixel formats and APNGs untouched.
    if (original[24] !== 8 || ![2, 6].includes(colorType) || sourceChunks.some(c => c.type === 'acTL')) continue;
    const name = createHash('sha256').update(original).update('png-lossless-v1').digest('hex') + '.png';
    let output: Buffer;
    try { output = await readFile(path.join(cache, name)); }
    catch {
      const decoded = PNG.sync.read(original);
      output = original;
      for (const deflateStrategy of [0, 1, 3]) {
        const encoded = PNG.sync.write(decoded, { colorType: colorType as 2 | 6, inputColorType: 6, bitDepth: 8, deflateLevel: 9, deflateStrategy });
        const dataChunks = chunks(encoded).filter(c => c.type === 'IDAT').map(c => c.bytes);
        const replaced: Buffer[] = [original.subarray(0, 8)];
        let inserted = false;
        for (const chunk of sourceChunks) {
          if (chunk.type === 'IDAT') {
            if (!inserted) replaced.push(...dataChunks);
            inserted = true;
          } else replaced.push(chunk.bytes);
        }
        const candidate = Buffer.concat(replaced);
        if (candidate.length < output.length && PNG.sync.read(candidate).data.equals(decoded.data)) output = candidate;
      }
      await writeFile(path.join(cache, name), output);
    }
    if (output.length >= original.length) continue;
    const relative = path.relative('public', file);
    await writeFile(path.join(dist, relative), output);
    report.push({ file: '/' + relative.split(path.sep).join('/'), original: original.length, optimized: output.length });
  }
  await mkdir('verification', { recursive: true });
  await writeFile('verification/image-sizes.json', JSON.stringify(report, null, 2) + '\n');
}
