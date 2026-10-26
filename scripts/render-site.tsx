import { mkdir, readFile, writeFile, cp, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { renderToString } from 'react-dom/server';
import type { ReactNode } from 'react';
import { build, transform } from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { load } from 'cheerio';
import Home from '../src/pages/home';
import Blog from '../src/pages/blog';
import Projects from '../src/pages/projects';
import BlogPost from '../src/components/BlogPost';
import ThemeToggle from '../src/components/ThemeToggle';
import Markdown from '../src/components/Markdown';
import { renderMdx } from '../src/components/MdxPost';
import { getAllPosts, getPublishedPosts } from '../src/lib/posts';
import { optimizeImages } from './optimize-images';
import { codeFiles } from '../src/lib/codeFiles';
import { encodeMailAttributes } from '../src/lib/mail';
import { ONION_ORIGIN } from '../src/lib/onion.js';

export async function createSite() {
const documents: { file: string; html: string }[] = [];
const dist = path.resolve('.dist-build');
const site = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://ashfn.com').replace(/\/$/, '');
const analytics = process.env.ANALYTICS !== 'false';
const posts = getAllPosts();
const published = getPublishedPosts();
const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'}[c]!));
const hash = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 10);
async function emit(file: string, content: string) {
  if (file.endsWith('.html') || /\.(xml|txt)$/.test(file) || file.startsWith('_')) {
    documents.push({ file, html: file.endsWith('.html') ? encodeMailAttributes(content) : content });
    return;
  }
  const target = path.join(dist, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}
async function cssAsset(name: string, source: string) {
  const { code } = await transform(source, { loader: 'css', minify: true, target: 'es2022' });
  const file = `assets/${name}-${hash(code)}.css`;
  await emit(file, code);
  return '/' + file;
}
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp('public', dist, { recursive: true, filter: (src) => !src.endsWith('.DS_Store') });
await optimizeImages(dist);
const css = await postcss([tailwind({ optimize: true })]).process(await readFile('src/styles.css', 'utf8'), { from: 'src/styles.css' });
const stylesheet = await cssAsset('site', css.css);
const jsonStylesheet = await cssAsset('json', await readFile('src/json.css', 'utf8'));
let katex = await readFile('node_modules/katex/dist/katex.min.css', 'utf8');
// Every supported browser uses WOFF2. Do not copy unused TTF/WOFF alternatives.
katex = katex.replace(/,url\(fonts\/[^)]+\) format\("(?:woff|truetype)"\)/g, '');
const mathStylesheet = await cssAsset('math', katex);
await mkdir(path.join(dist, 'assets/fonts'), { recursive: true });
for (const font of await readdir('node_modules/katex/dist/fonts')) {
  if (font.endsWith('.woff2')) await cp(`node_modules/katex/dist/fonts/${font}`, path.join(dist, 'assets/fonts', font));
}
const browser = await build({
  entryPoints: { site: 'src/client/site.ts', article: 'src/client/article.ts' },
  bundle: true, splitting: true, format: 'esm', minify: true, target: 'es2022',
  outdir: path.join(dist, 'assets'), entryNames: '[name]-[hash]', chunkNames: '[name]-[hash]',
  metafile: true, legalComments: 'none',
});
const entry = (name: string) => '/' + path.relative(dist, Object.entries(browser.metafile!.outputs).find(([, info]) => info.entryPoint === `src/client/${name}.ts`)![0]).split(path.sep).join('/');
const themeInit = "document.documentElement.setAttribute('data-js','');try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}";
const person = { '@context': 'https://schema.org', '@type': 'Person', name: 'Asher Falcon', url: site,
  image: `${site}/og.png`, jobTitle: 'Software Engineer & Student', description: '18 year old student interested in programming and maths.',
  sameAs: ['https://github.com/ashfn', 'https://www.linkedin.com/in/ashfn/'] };
interface Options {
  route: string; title: string; description: string; page?: string; hidden?: boolean;
  content: ReactNode; article?: boolean; math?: boolean; jsonViewer?: boolean; date?: string;
}
function documentPage(options: Options) {
  const { route, title, description, page, hidden, content, article, math, jsonViewer, date } = options;
  const url = site + route;
  const titleText = title === 'Asher Falcon' ? title : `${title} | Asher Falcon`;
  const structured = date ? { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: title, description,
    datePublished: date, dateModified: date, image: `${site}/og.png`, author: { '@type': 'Person', name: 'Asher Falcon', url: site },
    url, mainEntityOfPage: url } : null;
  return '<!DOCTYPE html>' + renderToString(<html lang="en">
    <head>
      <meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{titleText}</title><meta name="description" content={description} />
      <meta name="author" content="Asher Falcon" /><meta name="creator" content="Asher Falcon" />
      <meta name="keywords" content="ashfn,Asher Falcon,Software Engineer,Student,Developer,Portfolio" />
      <meta name="robots" content={hidden ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1'} />
      <link rel="canonical" href={url} /><link rel="alternate" type="application/rss+xml" href="/rss.xml" />
      <meta property="og:type" content={date ? 'article' : 'website'} /><meta property="og:site_name" content="Asher Falcon" />
      <meta property="og:title" content={title} /><meta property="og:description" content={description} /><meta property="og:url" content={url} />
      <meta property="og:locale" content="en_US" /><meta property="og:image" content={`${site}/og.png`} />
      <meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" /><meta property="og:image:alt" content="Asher Falcon" />
      {date && <><meta property="article:published_time" content={date} /><meta property="article:author" content="Asher Falcon" /></>}
      <meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} /><meta name="twitter:image" content={`${site}/og.png`} />
      <meta httpEquiv="onion-location" content={ONION_ORIGIN + route} />
      <link rel="icon" href="/favicon.ico" sizes="48x48" /><link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
      <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      <link rel="stylesheet" href={stylesheet} />
      <noscript><style>{'[data-video] { display: none; }'}</style></noscript>
      {math && <link rel="stylesheet" href={mathStylesheet} />}
      {jsonViewer && <link rel="stylesheet" href={jsonStylesheet} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(person) }} />
      {structured && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(structured) }} />}
    </head>
    <body className="antialiased" data-page={page}>
      <div>{content}<ThemeToggle /></div>
      <script type="module" src={entry('site')} />
      {article && <script type="module" src={entry('article')} />}
      {analytics && <script defer src="https://cloud.umami.is/script.js" data-website-id="eaac838f-0bef-4455-a834-2e1455d78d8c" />}
    </body>
  </html>);
}
await emit('index.html', documentPage({ route: '/', title: 'Asher Falcon', description: 'Asher Falcon - software engineer & student', page: 'home', content: <Home /> }));
await emit('blog/index.html', documentPage({ route: '/blog/', title: 'Blog', description: "Asher Falcon's blog - software engineering, projects, and more", content: <Blog /> }));
await emit('projects/index.html', documentPage({ route: '/projects/', title: 'Projects', description: "A collection of projects I've worked on.", content: <Projects /> }));
for (const post of posts) {
  const body = renderToString(post.format === 'mdx' ? await renderMdx(post.body) : <Markdown>{post.body}</Markdown>);
  const $ = load(body, null, false);
  const headings = $('h2[id]').toArray().map(el => ({ id: $(el).attr('id')!, text: $(el).text() }));
  $('iframe').attr('loading', 'lazy').each((_, el) => {
    const src = $(el).attr('src') || '';
    const match = /^https:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]+)/.exec(src);
    if (match) {
      $(el).attr('data-video', '');
      $(el).after(`<noscript><p><a href="https://www.youtube.com/watch?v=${match[1]}" target="_blank" rel="noopener noreferrer">Watch this video on YouTube</a></p></noscript>`);
    }
  });
  const html = $.html();
  await emit(`blog/posts/${post.slug}/index.html`, documentPage({
    route: `/blog/posts/${post.slug}/`, title: post.title, description: post.description, hidden: post.hidden,
    date: post.date, article: true, math: html.includes('class="katex'), jsonViewer: html.includes('json-view'),
    content: <BlogPost title={post.title} date={post.date} headings={headings} html={html} />,
  }));
}
for (const [file, code] of codeFiles) await emit(file, code);
function redirect(target: string) {
  return '<!DOCTYPE html>' + renderToString(<html lang="en"><head>
    <meta charSet="utf-8" /><title>Moved | Asher Falcon</title><meta httpEquiv="refresh" content={`0; url=${target}`} />
    <link rel="canonical" href={site + target} /></head><body><p>This page has moved to <a href={target}>{target}</a>.</p></body></html>);
}
for (const post of posts.filter(p => /^\d+$/.test(p.slug))) await emit(`blog/${post.slug}/index.html`, redirect(`/blog/posts/${post.slug}/`));
await emit('contact/index.html', redirect('/'));
await emit('404.html', documentPage({ route: '/404/', title: '404: This page could not be found.', description: 'Page not found', hidden: true,
  content: <div style={{ fontFamily: 'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"', height: '100vh', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><div>
    <style>{'body{color:var(--error-foreground);background:var(--error-background)}.error-heading{border-right:1px solid var(--error-border)}'}</style>
    <h1 className="error-heading" style={{ display: 'inline-block', margin: '0 20px 0 0', padding: '0 23px 0 0', fontSize: 24, fontWeight: 500, verticalAlign: 'top', lineHeight: '49px' }}>404</h1>
    <div style={{ display: 'inline-block' }}><h2 style={{ fontSize: 14, fontWeight: 400, lineHeight: '49px', margin: 0 }}>This page could not be found.</h2></div>
  </div></div> }));
await emit('404/index.html', documents.find(doc => doc.file === '404.html')!.html);
await emit('robots.txt', `User-Agent: *\nAllow: /\n\nHost: ${site}\nSitemap: ${site}/sitemap.xml\n`);
const routes = ['/', '/blog/', '/projects/', '/contact/', ...published.map(p => `/blog/posts/${p.slug}/`)];
await emit('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route => `<url><loc>${escape(site + route)}</loc></url>`).join('')}</urlset>`);
await emit('rss.xml', `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Asher Falcon's blog</title><link>${escape(site)}</link><description>Software engineering, projects, and more</description><language>en</language><atom:link href="${escape(site)}/rss.xml" rel="self" type="application/rss+xml"/>${published.map(p => `<item><title>${escape(p.title)}</title><link>${escape(site)}/blog/posts/${p.slug}</link><description>${escape(p.description)}</description><pubDate>${new Date(p.date).toUTCString()}</pubDate><guid>${escape(site)}/blog/posts/${p.slug}</guid></item>`).join('')}</channel></rss>`);
await emit('_redirects', `/contact/ / 301\n${posts.filter(p => /^\d+$/.test(p.slug)).map(p => `/blog/${p.slug}/ /blog/posts/${p.slug}/ 301`).join('\n')}\n`);
const onionHeaders = documents.filter(doc => doc.file.endsWith('index.html')).map(doc => {
  const route = '/' + doc.file.slice(0, -'index.html'.length);
  return `${route}\n  Onion-Location: ${ONION_ORIGIN + route}\n`;
}).join('');
await emit('_headers', '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/*\n  X-Content-Type-Options: nosniff\n' + onionHeaders);
const files = await readdir(path.join(dist, 'assets'));
const scripts = await Promise.all(files.filter(f => f.endsWith('.js')).map(async file => {
  const content = await readFile(path.join(dist, 'assets', file));
  return { file, bytes: content.length, gzip: gzipSync(content).length, brotli: brotliCompressSync(content).length };
}));
await mkdir('verification', { recursive: true });
await writeFile('verification/bundle-sizes.json', JSON.stringify(scripts, null, 2) + '\n');
return documents;
}
