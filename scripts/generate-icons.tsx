// Optional authoring utility: node --import tsx scripts/generate-icons.tsx
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { SiGithub, SiLinkedin, SiGit, SiYoutube } from 'react-icons/si';
import { Mail, Sun, Moon, Copy, Check, Rss, ExternalLink, Pen } from 'lucide-react';
import { iconNames } from '../src/lib/icons';
const icons = { github: SiGithub, linkedin: SiLinkedin, mail: Mail, sun: Sun, moon: Moon, copy: Copy, check: Check, rss: Rss, external: ExternalLink, pen: Pen, git: SiGit, youtube: SiYoutube };
const frame = 64;
const cells = iconNames.map((name, i) => {
  const svg = name === 'chevron'
    ? '<svg width="64" height="64" viewBox="0 0 16 16"><path d="M12.473 5.806a.666.666 0 0 0-.946 0L8.473 8.86a.667.667 0 0 1-.946 0L4.473 5.806a.667.667 0 1 0-.946.94l3.06 3.06a2 2 0 0 0 2.826 0l3.06-3.06a.667.667 0 0 0 0-.94Z" fill="black" /></svg>'
    : renderToStaticMarkup(createElement(icons[name], { size: frame, color: 'black' }));
  return `<g transform="translate(${i * frame} 0)">${svg}</g>`;
});
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined), headless: true });
try {
  const page = await browser.newPage({ viewport: { width: frame * iconNames.length, height: frame } });
  await page.setContent(`<style>body{margin:0}svg{display:block}</style><svg xmlns="http://www.w3.org/2000/svg" width="${frame * iconNames.length}" height="${frame}">${cells.join('')}</svg>`);
  mkdirSync('public/icons', { recursive: true });
  await page.screenshot({ path: 'public/icons/ui.png', omitBackground: true });
} finally { await browser.close(); }
