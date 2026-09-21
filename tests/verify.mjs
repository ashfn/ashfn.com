import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
const original = process.env.ORIGINAL_URL || 'http://localhost:4001';
const optimized = process.env.SITE_URL || 'http://localhost:4000';
const output = path.resolve(process.env.OUTPUT_DIR || 'verification');
await mkdir(output, { recursive: true });
const executablePath = process.env.CHROME_PATH || (existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
const browser = await chromium.launch({ executablePath, headless: true });
const routes = process.env.ROUTES?.split(',') || ['/', '/blog/', '/projects/', '/404.html', ...['0','1','2','3','4','5','http-server'].map(id => `/blog/posts/${id}/`)];
const widths = process.env.WIDTHS?.split(',').map(Number) || [1440, 390];
const themes = process.env.THEMES?.split(',') || ['light', 'dark'];
const results = [];
const errors = [];
for (const width of widths) for (const colorScheme of themes) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  // Keep third-party embeds and icons deterministic. They are not owned by this site.
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
      if (url.hostname.includes('google.com')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#777"/></svg>' });
      return route.fulfill({ contentType: route.request().resourceType() === 'document' ? 'text/html' : 'application/javascript', body: '' });
    }
    return route.continue();
  });
  for (const route of routes) {
    const images = [], metrics = [];
    for (const [name, base] of [['original', original], ['optimized', optimized]]) {
      const page = await context.newPage();
      if (name === 'optimized') page.on('pageerror', error => errors.push({ route, error: error.message }));
      const response = await page.goto(base + route, { waitUntil: 'networkidle' });
      if (!response?.ok()) throw new Error(`${name} ${route}: HTTP ${response?.status()}`);
      await page.addStyleTag({ content: 'nextjs-portal{display:none!important} *,*::before,*::after{animation:none!important;transition:none!important} html{scroll-behavior:auto!important}' });
      await page.evaluate(async () => {
        document.querySelectorAll('img[loading="lazy"],iframe[loading="lazy"]').forEach(el => el.loading = 'eager');
        await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
        await document.fonts.ready;
      });
      await page.waitForTimeout(400);
      // GIF frame timing is nondeterministic, so compare its box, not the animation frame.
      const mask = page.locator('img[src$=".gif"]');
      const stem = `${route.replaceAll('/', '_') || 'home'}-${width}-${colorScheme}-${name}`;
      const screenshot = await page.screenshot({ path: path.join(output, stem + '.png'), fullPage: true, animations: 'disabled', mask: [mask], maskColor: '#808080' });
      images.push(PNG.sync.read(screenshot));
      metrics.push(await page.evaluate(() => ({
        width: document.documentElement.scrollWidth, height: document.body.scrollHeight,
        images: [...document.images].filter(img => img.getAttribute('src')?.startsWith('/')).map(img => {
          const { x, y, width, height } = img.getBoundingClientRect();
          return { src: img.getAttribute('src'), x, y, width, height };
        }),
        elements: [...document.querySelectorAll('h1, article h2, article p, article figure, pre, .json-view_vscode')].map(el => {
          const rect = el.getBoundingClientRect(); const style = getComputedStyle(el);
          return { text: el.textContent.slice(0, 65), x: rect.x, y: rect.y, width: rect.width, height: rect.height, color: style.color, font: style.font };
        }),
      })));
      await page.close();
    }
    const [a,b] = images;
    let changedPixels = null;
    let unexpectedPixels = null;
    if (a.width === b.width && a.height === b.height) {
      const diff = new PNG({ width: a.width, height: a.height });
      changedPixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0, includeAA: true });
      // Browser rasterization can round a color-managed image channel by up to 2/255.
      // Allow that only inside an unchanged image box. Text, controls, geometry,
      // and all larger color differences remain exact, zero-tolerance checks.
      const stableImages = metrics[0].images.filter(rect => metrics[1].images.some(other => JSON.stringify(rect) === JSON.stringify(other)));
      unexpectedPixels = 0;
      for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
        const offset = (y * a.width + x) * 4;
        let delta = 0;
        for (let c = 0; c < 4; c++) delta = Math.max(delta, Math.abs(a.data[offset + c] - b.data[offset + c]));
        if (!delta) continue;
        const imageRounding = delta <= 2 && stableImages.some(rect => x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height);
        if (!imageRounding) unexpectedPixels++;
      }
      if (changedPixels) await writeFile(path.join(output, `${route.replaceAll('/', '_')}-${width}-${colorScheme}-diff.png`), PNG.sync.write(diff));
    }
    const result = { route, width, colorScheme, changedPixels, unexpectedPixels, originalSize: [a.width,a.height], optimizedSize: [b.width,b.height] };
    results.push(result);
    if (changedPixels !== 0) await writeFile(path.join(output, `${route.replaceAll('/', '_')}-${width}-${colorScheme}-metrics.json`), JSON.stringify(metrics, null, 2));
    console.log(JSON.stringify(result));
  }
  await context.close();
}
await browser.close();
await writeFile(path.join(output, 'visual-results.json'), JSON.stringify({ results, errors, notes: 'Exact text/control/layout comparison. Raw changedPixels are always reported; unexpectedPixels allows at most 2/255 per channel inside unchanged local image boxes for browser rasterization rounding. GIF images masked; third-party favicons and iframes use deterministic responses. Next development UI excluded.' }, null, 2));
if (results.some(result => result.unexpectedPixels !== 0) || errors.length) process.exitCode = 1;
