import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { PNG } from 'pngjs';
import { getAllPosts, getPublishedPosts } from '../src/lib/posts';
import { mailHref } from '../src/lib/mail';
import { cellsOf, createGame, hardDrop, move, rotate, softDrop, collides } from '../src/client/tetris-rules';

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
const htmlFiles = walk('dist').filter(file => file.endsWith('.html'));
test('every local link, image, script and stylesheet resolves in the static export', () => {
  for (const file of htmlFiles) {
    const $ = load(readFileSync(file, 'utf8'));
    $('[href], [src]').each((_, el) => {
      const value = $(el).attr('href') || $(el).attr('src')!;
      if (!value.startsWith('/') || value.startsWith('//')) return;
      const pathname = decodeURIComponent(new URL(value, 'https://ashfn.com').pathname);
      const target = path.join('dist', pathname);
      assert.ok(existsSync(target) || existsSync(path.join(target, 'index.html')), `${file}: missing ${value}`);
    });
  }
});
test('the static export ships no framework, hydration payload or MDX source', () => {
  assert.ok(!existsSync('dist/editor'), 'the local editor must never be published');
  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    assert.doesNotMatch(html, /_next\/|self\.__next|react-dom|framer-motion|next-mdx-remote/);
    const $ = load(html);
    // Articles can describe the local editor, but public pages must not link to or load it.
    $('[href], [src]').each((_, el) => {
      for (const attr of ['href', 'src']) {
        const value = $(el).attr(attr);
        if (value) assert.doesNotMatch(new URL(value, 'https://ashfn.com').pathname, /^\/editor(?:\/|$)/);
      }
    });
    assert.equal($('html').length, 1);
    assert.equal($('head > title').length, 1);
  }
});
test('published posts, hidden posts, structured metadata and old URLs survive', () => {
  const index = readFileSync('dist/blog/index.html', 'utf8');
  const rss = readFileSync('dist/rss.xml', 'utf8');
  const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
  for (const post of getAllPosts()) {
    const $ = load(readFileSync(`dist/blog/posts/${post.slug}/index.html`, 'utf8'));
    assert.equal($('h1').text(), post.title);
    assert.equal($('link[rel="canonical"]').attr('href'), `https://ashfn.com/blog/posts/${post.slug}/`);
    assert.ok($('script[type="application/ld+json"]').toArray().some(el => JSON.parse($(el).text())['@type'] === 'BlogPosting'));
    if (post.hidden) {
      assert.match($('meta[name="robots"]').attr('content')!, /noindex/);
      for (const text of [index, rss, sitemap]) assert.ok(!text.includes(`/blog/posts/${post.slug}`));
    } else for (const text of [index, rss, sitemap]) assert.ok(text.includes(`/blog/posts/${post.slug}`));
    if (/^\d+$/.test(post.slug)) {
      const redirect = load(readFileSync(`dist/blog/${post.slug}/index.html`, 'utf8'));
      assert.equal(redirect('meta[http-equiv="refresh"]').attr('content'), `0; url=/blog/posts/${post.slug}/`);
    }
  }
  assert.equal(getPublishedPosts().length, getAllPosts().filter(p => !p.hidden).length);
});
test('TOC anchors and code are already readable without JavaScript', () => {
  for (const post of getAllPosts()) {
    const $ = load(readFileSync(`dist/blog/posts/${post.slug}/index.html`, 'utf8'));
    const headings = $('article h2[id]').toArray().map(el => $(el).attr('id'));
    const links = $('[data-toc] a').toArray().map(el => $(el).attr('href')?.slice(1));
    assert.deepEqual(links, headings);
    $('pre').each((_, el) => assert.ok($(el).text().length > 0));
    $('img[src^="/media/"]').each((_, el) => {
      assert.ok(Number($(el).attr('width')) > 0);
      assert.ok(Number($(el).attr('height')) > 0);
    });
  }
});
test('home uses under 3 KB of first-party JS and does not preload either game', () => {
  const $ = load(readFileSync('dist/index.html', 'utf8'));
  let bytes = 0;
  $('script').each((_, el) => {
    if ($(el).attr('type') === 'application/ld+json') return;
    const src = $(el).attr('src');
    if (src?.startsWith('/')) bytes += readFileSync(path.join('dist', src)).length;
    else if (!src) bytes += Buffer.byteLength($(el).text());
  });
  assert.ok(bytes < 3000, `${bytes} JS bytes`);
  assert.equal($('link[rel="modulepreload"]').length, 0);
  for (const el of $('script[src]').toArray()) assert.doesNotMatch($(el).attr('src')!, /snake|tetris|article/);
});
test('tetris handles walls, rotation, hard drops and line clears', () => {
  const game = createGame(8, 8);
  game.piece = { type: 'T', rotation: 0, x: 0, y: 0 };
  assert.equal(move(game, -1), false);
  assert.equal(rotate(game), true);
  assert.equal(collides(game.board, game.piece), false);
  assert.equal(cellsOf(game.piece).length, 4);
  game.board[7] = Array(8).fill('D');
  game.board[7][0] = null;
  game.piece = { type: 'D', rotation: 0, x: 0, y: 0 };
  hardDrop(game);
  assert.equal(game.lines, 1);
  assert.equal(game.score, 114);
  assert.ok(game.board.every(row => row.every(cell => cell === null)));
  game.over = true;
  assert.equal(softDrop(game), false);
});

test('email works as a native link without exposing a plain address in HTML', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  const $ = load(html);
  assert.equal($('[data-mail]').attr('href'), mailHref);
  assert.ok(!$('[data-mail]').attr('onclick'));
  assert.ok(html.includes('href="&#109;&#97;&#105;&#108;&#116;&#111;&#58;'));
  assert.ok(!html.includes(mailHref.slice(7)));
  assert.ok(!html.includes('mailto:'));
});

test('optimized PNGs preserve every pixel and metadata chunk; GIFs are unchanged', () => {
  function nonImageData(buffer: Buffer) {
    const chunks: Buffer[] = [];
    for (let offset = 8; offset < buffer.length;) {
      const end = offset + buffer.readUInt32BE(offset) + 12;
      if (buffer.toString('ascii', offset + 4, offset + 8) !== 'IDAT') chunks.push(buffer.subarray(offset, end));
      offset = end;
    }
    return Buffer.concat(chunks);
  }
  for (const file of walk('public/media')) {
    const before = readFileSync(file);
    const after = readFileSync(file.replace(/^public/, 'dist'));
    if (file.endsWith('.png')) {
      assert.deepEqual(PNG.sync.read(after).data, PNG.sync.read(before).data, file);
      assert.deepEqual(nonImageData(after), nonImageData(before), file);
      assert.ok(after.length <= before.length, file);
    } else if (file.endsWith('.gif')) assert.deepEqual(after, before, file);
  }
});
