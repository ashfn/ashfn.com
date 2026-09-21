import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { brotliCompressSync, gzipSync } from 'node:zlib';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const args = process.argv.slice(2);
const portIndex = args.findIndex(arg => arg === '--port' || arg === '-p');
const port = Number(portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || 4000);
const watching = args.includes('--watch');
const root = path.resolve('dist');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp', '.ico':'image/x-icon', '.woff2':'font/woff2', '.xml':'application/xml; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.csv':'text/csv; charset=utf-8', '.json':'application/json; charset=utf-8' };
function build() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Build failed (${code})`)));
  });
}
if (watching || !existsSync('dist/index.html')) await build();
const handleEditor = watching ? (await import('../editor/server.mjs')).handleEditor : null;
const cache = new Map();
const server = http.createServer(async (req, res) => {
  if (handleEditor && await handleEditor(req, res)) return;
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
  try {
    const url = new URL(req.url, 'http://localhost');
    const decoded = decodeURIComponent(url.pathname);
    let filename = path.resolve(root, '.' + decoded);
    if (!filename.startsWith(root + path.sep) && filename !== root) { res.writeHead(403); res.end(); return; }
    let code = 200;
    try {
      const info = await stat(filename);
      if (info.isDirectory()) {
        if (!url.pathname.endsWith('/')) { res.writeHead(308, { Location: url.pathname + '/' + url.search }); res.end(); return; }
        filename = path.join(filename, 'index.html');
      }
    } catch { filename = path.join(root, '404.html'); code = 404; }
    const ext = path.extname(filename);
    const accepts = req.headers['accept-encoding'] || '';
    const compressible = ['.html','.css','.js','.svg','.xml','.txt','.csv','.json'].includes(ext);
    const encoding = compressible && /\bbr\b/.test(accepts) ? 'br' : compressible && /\bgzip\b/.test(accepts) ? 'gzip' : '';
    const key = filename + ':' + (await stat(filename)).mtimeMs + ':' + encoding;
    let body = cache.get(key);
    if (!body) {
      body = await readFile(filename);
      if (encoding === 'br') body = brotliCompressSync(body);
      if (encoding === 'gzip') body = gzipSync(body);
      cache.set(key, body);
    }
    res.writeHead(code, {
      'Content-Type': mime[ext] || 'application/octet-stream', 'Content-Length': body.length,
      'Cache-Control': !watching && decoded.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff', Vary: 'Accept-Encoding', ...(encoding ? { 'Content-Encoding': encoding } : {}),
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) { res.writeHead(error instanceof URIError ? 400 : 500); res.end('Unable to serve this page'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Static site: http://localhost:${port}${watching ? ' (editor: /editor/; refresh site after a build)' : ''}`));
if (watching) {
  let timer, building = false, queued = false;
  async function rebuild() {
    if (building) { queued = true; return; }
    building = true;
    try { await build(); cache.clear(); } catch (error) { console.error(error.message); }
    building = false;
    if (queued) { queued = false; rebuild(); }
  }
  watch('.', (_event, file) => {
    if (['eleventy.config.mjs', 'tsconfig.json', 'package.json'].includes(file)) {
      clearTimeout(timer); timer = setTimeout(rebuild, 120);
    }
  });
  for (const directory of ['src', 'content', 'public', 'scripts']) watch(directory, { recursive: true }, (_event, file) => {
    if (file?.endsWith('.tmp')) return;
    clearTimeout(timer); timer = setTimeout(rebuild, 120);
  });
}
