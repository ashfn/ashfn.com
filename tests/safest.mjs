import { firefox } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { PNG } from 'pngjs';
const base = process.env.SITE_URL || 'http://localhost:4000';
const browser = await firefox.launch({ headless: true, firefoxUserPrefs: {
  'svg.disabled': true, 'javascript.enabled': false, 'gfx.downloadable_fonts.enabled': false,
} });
mkdirSync('verification', { recursive: true });
async function painted(icon) {
  assert.ok(await icon.isVisible());
  const png = PNG.sync.read(await icon.screenshot());
  const colors = new Set();
  for (let i = 0; i < png.data.length; i += 4) colors.add(png.data.subarray(i, i + 4).toString('hex'));
  assert.ok(colors.size > 2, 'Icon contains a painted shape, not just an empty box');
}
try {
  for (const width of [1440, 390]) for (const colorScheme of ['light', 'dark']) {
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width, height: 900 }, colorScheme, reducedMotion: 'reduce' });
    const scripts = [], errors = [];
    page.on('request', r => { if (r.resourceType() === 'script') scripts.push(r.url()); });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    for (const name of ['github', 'linkedin', 'mail', 'tor']) await painted(page.locator(`[data-icon="${name}"]`).first());
    await painted(page.locator(`[data-theme-icon="${colorScheme === 'dark' ? 'moon' : 'sun'}"] [data-icon]`));
    await page.getByRole('checkbox', { name: 'Use alternate color theme' }).click();
    await painted(page.locator(`[data-theme-icon="${colorScheme === 'dark' ? 'sun' : 'moon'}"] [data-icon]`));
    assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), colorScheme === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(15, 17, 19)');
    await page.getByRole('checkbox', { name: 'Use alternate color theme' }).click();
    await page.screenshot({ path: `verification/safest-home-${width}-${colorScheme}.png` });
    await page.goto(base + '/blog/posts/finding-ashfncomabc/', { waitUntil: 'networkidle' });
    await painted(page.locator('article [data-icon="github"]').first());
    await painted(page.locator('article [data-icon="tor"]').first());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (width >= 1024) {
      const link = page.getByRole('navigation', { name: 'Table of contents' }).getByRole('link', { name: 'Getting past a billion', exact: true });
      await link.click();
      assert.ok(page.url().endsWith('#getting-past-a-billion'));
      assert.ok(await page.locator('#getting-past-a-billion').evaluate(el => Math.abs(el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop)) < 2));
      assert.equal(await link.evaluate(el => getComputedStyle(el).opacity), '1');
      assert.equal(await link.evaluate(el => getComputedStyle(el, '::before').width), '1px');
      await page.screenshot({ path: `verification/safest-toc-${colorScheme}.png` });
      await page.setViewportSize({ width, height: 220 });
      const toc = page.locator('[data-toc]');
      assert.ok(await toc.evaluate(el => el.scrollHeight > el.clientHeight));
      await toc.getByRole('link', { name: 'The address', exact: true }).click();
      const box = await toc.boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height <= 220);
      await page.setViewportSize({ width, height: 900 });
    }
    await page.goto(base + '/blog/', { waitUntil: 'networkidle' });
    await painted(page.locator('[data-icon="rss"]'));
    await page.goto(base + '/projects/', { waitUntil: 'networkidle' });
    await painted(page.locator('[data-icon]').filter({ visible: true }).first());
    await page.goto(base + '/blog/posts/5/', { waitUntil: 'networkidle' });
    await painted(page.locator('[data-icon="chevron"]').first());
    await page.goto(base + '/blog/posts/1/', { waitUntil: 'networkidle' });
    await painted(page.locator('[data-icon="copy"]').first());
    assert.deepEqual(scripts, []);
    assert.deepEqual(errors, []);
    console.log(`Safest passed: ${width}px / ${colorScheme}, raster icons, themes, native TOC; zero scripts.`);
    await page.close();
  }
} finally { await browser.close(); }
