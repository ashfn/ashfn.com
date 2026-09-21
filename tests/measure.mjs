import { readFileSync, writeFileSync } from 'node:fs';
import { load } from 'cheerio';
import { gzipSync, brotliCompressSync } from 'node:zlib';
const original = process.env.ORIGINAL_DIST || readFileSync('verification/baseline-path.txt', 'utf8').trim() + '/out';
function metrics(dir, route) {
  const html = readFileSync(dir + route + 'index.html', 'utf8');
  const $ = load(html);
  const scripts = [];
  let inline = '';
  $('script').each((_, el) => {
    const script = $(el), src = script.attr('src');
    if (script.is('[nomodule]')) return; // Legacy polyfills are not loaded by modern browsers.
    if (src?.startsWith('/')) {
      const body = readFileSync(dir + decodeURIComponent(src));
      scripts.push({ path: src, bytes: body.length, gzip: gzipSync(body).length, brotli: brotliCompressSync(body).length });
    } else if (!src && script.attr('type') !== 'application/ld+json') inline += script.text();
  });
  return { html: Buffer.byteLength(html), scripts: scripts.reduce((t, s) => t + s.bytes, 0),
    scriptsGzip: scripts.reduce((t, s) => t + s.gzip, 0), inline: Buffer.byteLength(inline), inlineGzip: gzipSync(inline).length,
    totalJs: scripts.reduce((t, s) => t + s.bytes, 0) + Buffer.byteLength(inline), scriptFiles: scripts };
}
const report = ['/', '/blog/', '/projects/', '/blog/posts/5/'].map(route => ({ route, original: metrics(original, route), optimized: metrics('dist', route) }));
writeFileSync('verification/performance-results.json', JSON.stringify(report, null, 2) + '\n');
console.table(report.map(({ route, original: before, optimized: after }) => ({ route, originalJS: before.totalJs, optimizedJS: after.totalJs,
  reduction: ((1 - after.totalJs / before.totalJs) * 100).toFixed(2) + '%', gzipBefore: before.scriptsGzip + before.inlineGzip,
  gzipAfter: after.scriptsGzip + after.inlineGzip, htmlBefore: before.html, htmlAfter: after.html })));
