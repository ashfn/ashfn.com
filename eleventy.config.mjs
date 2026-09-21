import { rm, rename } from 'node:fs/promises';

export default function (eleventy) {
  // Only replace the preview after every page has built successfully.
  eleventy.on('eleventy.after', async () => {
    await rm('.dist-previous', { recursive: true, force: true });
    try { await rename('dist', '.dist-previous'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await rename('.dist-build', 'dist');
    await rm('.dist-previous', { recursive: true, force: true });
  });
  return { dir: { input: 'src', output: '.dist-build' }, templateFormats: ['11ty.js'] };
}
