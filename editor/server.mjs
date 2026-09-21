import { readFile, writeFile, readdir, mkdir, rename, lstat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import matter from 'gray-matter';
import { validateProjects } from '../src/lib/projects.ts';
import { readImageSize } from '../scripts/imageSize.mjs';

const token = randomBytes(24).toString('hex');
const revision = source => createHash('sha256').update(source).digest('hex');
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const exists = async file => lstat(file).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });
const postPath = file => {
  if (typeof file !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.mdx?$/.test(file)) throw fail('Use a lowercase, hyphen-separated .md or .mdx filename.');
  return path.join('content/posts', file);
};
async function plainFile(file) {
  if ((await lstat(file)).isSymbolicLink()) throw fail('The editor does not edit symbolic links.');
  return readFile(file, 'utf8');
}
function parse(source, file) {
  const { data, content } = matter(source);
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date || '');
  const slug = String(data.slug || file.replace(/\.mdx?$/, ''));
  if (!slugPattern.test(slug)) throw fail('The URL slug must contain lowercase letters, numbers and hyphens.');
  if (typeof data.title !== 'string' || !data.title.trim()) throw fail('Give the post a title.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw fail('Use a valid YYYY-MM-DD date.');
  return { title: data.title, date, slug, description: String(data.description || ''), hidden: data.hidden === true || data.draft === true, body: content.trim(), data };
}
async function posts() {
  const files = (await readdir('content/posts')).filter(file => /\.mdx?$/.test(file));
  return Promise.all(files.map(async file => {
    const source = await plainFile(postPath(file));
    try { return { file, revision: revision(source), ...parse(source, file) }; }
    catch (error) { return { file, revision: revision(source), title: file, error: error.message, source }; }
  }));
}
async function media(directory = 'public/media') {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.filter(entry => !entry.isSymbolicLink()).map(async entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return media(file);
    if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(file)) return [];
    return [{ src: '/' + file.slice('public/'.length), name: entry.name, bytes: (await lstat(file)).size }];
  }));
  return nested.flat();
}
async function readJson(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw fail('Expected JSON.', 415);
  const chunks = []; let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 18 * 1024 * 1024) throw fail('This upload is too large (12 MB maximum).', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw fail('Invalid JSON.'); }
}
async function save(file, source, expected) {
  const current = await exists(file) ? await plainFile(file) : null;
  if ((current === null ? null : revision(current)) !== expected) throw fail('This file changed outside the editor. Reload it before saving; your unsaved text is still here.', 409);
  const temp = file + '.' + randomBytes(6).toString('hex') + '.tmp';
  try { await writeFile(temp, source, { flag: 'wx' }); await rename(temp, file); }
  finally { await unlink(temp).catch(() => {}); }
  return revision(source);
}
const renderPreview = payload => new Promise((resolve, reject) => {
  const child = execFile(process.execPath, ['--import', 'tsx', 'editor/preview.tsx'], { timeout: 15000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) reject(fail(stderr.split('\n').find(line => /Error:|Unexpected|Could not parse|Expected/.test(line)) || 'Preview could not render. Check your MDX syntax.'));
    else resolve(stdout);
  });
  child.stdin.end(JSON.stringify(payload));
});
let mutation = Promise.resolve();
export async function handleEditor(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith('/editor')) return false;
  const send = (status, body, type = 'application/json; charset=utf-8') => {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' });
    res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
  };
  try {
    const hosts = ['localhost', '127.0.0.1', '[::1]'].map(host => `${host}:${req.socket.localPort}`);
    if (!hosts.includes(req.headers.host) || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) || req.headers['sec-fetch-site'] === 'cross-site') throw fail('The editor is available only from this local site.', 403);
    if (req.method === 'GET' && ['/editor', '/editor/'].includes(url.pathname)) {
      send(200, (await readFile('editor/index.html', 'utf8')).replace('__EDITOR_TOKEN__', token), 'text/html; charset=utf-8');
    } else if (req.method === 'GET' && ['/editor/app.js', '/editor/style.css'].includes(url.pathname)) {
      const file = url.pathname.slice('/editor/'.length);
      send(200, await readFile('editor/' + file, 'utf8'), file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8');
    } else {
      if (req.headers['x-editor-token'] !== token) throw fail('Reload the editor to reconnect.', 403);
      if (url.pathname === '/editor/api/state' && req.method === 'GET') {
        const source = await plainFile('content/projects.json');
        send(200, { posts: (await posts()).sort((a,b) => (b.date || '').localeCompare(a.date || '')), projects: { source, revision: revision(source) }, media: await media() });
      } else if (url.pathname === '/editor/api/preview' && req.method === 'POST') {
        const data = await readJson(req);
        if (typeof data.body !== 'string' || data.body.length > 1024 * 1024) throw fail('Post is too large.');
        send(200, { html: await renderPreview(data) });
      } else if (req.method === 'POST') {
        const data = await readJson(req);
        const operation = mutation.then(async () => {
          if (url.pathname === '/editor/api/post') {
            const file = postPath(data.file);
            let source;
            if (typeof data.source === 'string') source = data.source;
            else {
              // Preserve extra frontmatter fields when using the form.
              const previous = await exists(file) ? matter(await plainFile(file)).data : {};
              const frontmatter = { ...previous, title: data.title, description: data.description || '', date: data.date, slug: data.slug, hidden: !!data.hidden };
              delete frontmatter.draft;
              if (typeof data.body !== 'string') throw fail('Missing article body.');
              source = matter.stringify('\n' + data.body.trim() + '\n', frontmatter);
            }
            if (source.length > 1024 * 1024) throw fail('Post is too large.');
            const parsed = parse(source, data.file);
            if ((await posts()).some(post => post.file !== data.file && post.slug === parsed.slug)) throw fail('Another post already uses this URL slug.');
            // Catch invalid MDX or missing images before replacing a working post.
            await renderPreview({ ...parsed, format: data.file.endsWith('.mdx') ? 'mdx' : 'md' });
            return { revision: await save(file, source, data.revision), ...parsed };
          }
          if (url.pathname === '/editor/api/projects') {
            let value; try { value = JSON.parse(data.source); } catch { throw fail('Projects JSON is invalid. Your changes have not been saved.'); }
            validateProjects(value);
            for (const project of value) if (!await exists('public' + project.image)) throw fail(`Image not found: ${project.image}`);
            return { revision: await save('content/projects.json', JSON.stringify(value, null, 2) + '\n', data.revision) };
          }
          if (url.pathname === '/editor/api/upload') {
            if (typeof data.name !== 'string' || typeof data.base64 !== 'string') throw fail('Choose an image.');
            const name = data.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/^\.+/, '');
            if (!/\.(png|jpe?g|gif|webp|svg)$/.test(name)) throw fail('Use PNG, JPG, GIF, WebP or SVG.');
            const bytes = Buffer.from(data.base64, 'base64');
            if (!bytes.length || bytes.length > 12 * 1024 * 1024) throw fail('Images must be under 12 MB.');
            const folder = data.folder || 'uploads';
            if (!/^(uploads|projects|posts\/[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(folder)) throw fail('Invalid media folder.');
            // Refuse symlinks in every destination directory.
            let directory = 'public';
            for (const segment of ['media', ...folder.split('/')]) {
              directory = path.join(directory, segment);
              await mkdir(directory, { recursive: true });
              if ((await lstat(directory)).isSymbolicLink()) throw fail('Cannot upload to symbolic links.');
            }
            let file = path.join(directory, name), index = 1;
            while (await exists(file)) file = path.join(directory, path.parse(name).name + '-' + index++ + path.extname(name));
            await writeFile(file, bytes, { flag: 'wx' });
            try { readImageSize(file); } catch { await unlink(file); throw fail('This file is not a readable image.'); }
            return { src: '/' + file.slice('public/'.length) };
          }
          throw fail('Unknown editor action.', 404);
        });
        mutation = operation.catch(() => {});
        send(200, await operation);
      } else throw fail('Not found.', 404);
    }
  } catch (error) { send(error.status || 400, { error: error.message || 'Unable to complete this action.' }); }
  return true;
}
