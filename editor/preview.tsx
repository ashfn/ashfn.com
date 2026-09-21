import { readFileSync, readdirSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { renderMdx } from '../src/components/MdxPost';
import Markdown from '../src/components/Markdown';
import BlogPost from '../src/components/BlogPost';

const input = JSON.parse(readFileSync(0, 'utf8'));
const html = renderToString(input.format === 'md' ? <Markdown>{input.body}</Markdown> : await renderMdx(input.body));
const styles = readdirSync('dist/assets').filter(file => /^(site|json|math|chart)-.*\.css$/.test(file));
process.stdout.write('<!doctype html>' + renderToString(<html lang="en"><head>
  <meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta httpEquiv="Content-Security-Policy" content="script-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'" />
  {styles.map(file => <link key={file} rel="stylesheet" href={'/assets/' + file} />)}
  <style>{'.page-transition{animation:none} [data-toc]{display:none} a{pointer-events:none}'}</style>
</head><body className="antialiased"><BlogPost title={String(input.title || 'Untitled post')} date={String(input.date || '')} html={html} headings={[]} /></body></html>));
