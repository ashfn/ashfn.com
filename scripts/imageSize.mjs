import { readFileSync } from 'node:fs';

/**
 * Reads intrinsic pixel dimensions straight from an image header. Only the
 * formats this site actually uses are supported; anything else throws, which
 * surfaces at build time rather than shipping a broken page.
 */
/** @returns {{width: number, height: number}} */
export function readImageSize(path) {
  const buf = readFileSync(path);

  // PNG: IHDR width/height are big-endian at bytes 16 and 20
  if (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // GIF: little-endian width/height at bytes 6 and 8
  if (buf.length > 10 && buf.toString('ascii', 0, 3) === 'GIF') {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // JPEG: walk the segment markers to the frame header (SOFn)
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buf[offset + 1];
      const length = buf.readUInt16BE(offset + 2);
      // SOF0-SOF15, excluding the DHT/JPG/DAC markers that share the range
      const isFrame =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
    throw new Error(`No frame header found in JPEG: ${path}`);
  }

  // WebP: VP8 / VP8L / VP8X variants
  if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === 'VP8L') {
      const bits = buf.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') {
      const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { width, height };
    }
  }

  // SVG: fall back to the viewBox, which is all a vector file can offer
  const head = buf.toString('utf8', 0, Math.min(buf.length, 2000));
  if (head.includes('<svg')) {
    const viewBox = head.match(/viewBox\s*=\s*["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/);
    if (viewBox) return { width: Math.round(+viewBox[1]), height: Math.round(+viewBox[2]) };
  }

  throw new Error(`Unsupported image format: ${path}`);
}
