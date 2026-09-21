// Exercise real editor writes in a disposable copy, never the author's files.
import assert from 'node:assert/strict';
import { mkdtemp, cp, symlink, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const root = process.cwd();
const fixture = await mkdtemp(path.join(tmpdir(), 'ashfn-editor-test-'));
const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });
const url = `http://localhost:${port}`;
let server, browser;
try {
  for (const file of ['src','scripts','editor','content','public','package.json','tsconfig.json','eleventy.config.mjs']) await cp(path.join(root,file), path.join(fixture,file), { recursive: true });
  await symlink(path.join(root,'node_modules'), path.join(fixture,'node_modules'), 'dir');
  server = spawn(process.execPath, ['--import','tsx','scripts/serve.mjs','--watch','--port',String(port)], { cwd:fixture, stdio:['ignore','pipe','pipe'] });
  let logs = ''; server.stdout.on('data', data => logs += data); server.stderr.on('data', data => logs += data);
  await new Promise((resolve, reject) => {
    const timer = setInterval(() => { if (logs.includes('Static site:')) { clearInterval(timer); clearTimeout(timeout); resolve(); } }, 100);
    const timeout = setTimeout(() => { clearInterval(timer); reject(new Error('Editor failed to start:\n' + logs)); }, 30000);
  });
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined), headless:true });
  const page = await browser.newPage({ viewport:{width:1440,height:1000} }); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url + '/editor/'); await page.locator('#post-title').waitFor({ state:'visible' });
  assert.equal(await page.locator('#post-list button').count(), (await readdir(path.join(fixture,'content/posts'))).filter(file => /\.mdx?$/.test(file)).length);
  const token = await page.locator('meta[name=editor-token]').getAttribute('content');
  const api = (route, data, extra = {}) => page.request.fetch(url + '/editor/api/' + route, { method: data === undefined ? 'GET' : 'POST', headers:{ 'X-Editor-Token':token, ...extra }, ...(data === undefined ? {} : { data }) });
  assert.equal((await page.request.get(url + '/editor/api/state')).status(),403);
  assert.equal((await api('state',undefined,{Origin:'https://example.org'})).status(),403);
  assert.equal((await api('post',{file:'../escape.mdx'})).status(),400);
  console.log('✓ Editor blocks unauthenticated, cross-origin and traversal requests.');

  page.once('dialog', dialog => dialog.accept('Editor verification article'));
  await page.locator('#new-post').click();
  assert.equal(await page.locator('#post-slug').inputValue(), 'editor-verification-article');
  assert.equal(await page.locator('#post-hidden').isChecked(), true);
  await page.locator('#post-body').fill('## A working preview\n\nSome **bold text**, a formula $x^2$, and a link [home](/).');
  await page.locator('[data-view=preview]').click();
  await page.waitForFunction(() => document.querySelector('#post-preview').srcdoc.includes('A working preview'));
  assert.equal(await page.frameLocator('#post-preview').locator('strong').textContent(),'bold text');
  await page.locator('#save').click();
  await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Saved to disk');
  let source = await readFile(path.join(fixture,'content/posts/editor-verification-article.mdx'),'utf8');
  assert.match(source,/hidden: true/); assert.match(source,/A working preview/);
  await page.waitForFunction(async url => (await (await fetch(url)).text()).includes('A working preview'),url+'/blog/posts/editor-verification-article/');
  console.log('✓ New posts save as readable MDX and Eleventy builds their page.');

  await page.locator('[data-view=write]').click();
  await page.locator('#insert-image').click();
  await page.locator('#image-upload').setInputFiles(path.join(root,'public/media/projects/deckcrypt.png'));
  await page.waitForFunction(() => document.querySelector('#post-body').value.includes('/media/posts/editor-verification-article/deckcrypt.png'));
  await page.locator('#save').click(); await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Saved to disk');
  assert.ok((await readFile(path.join(fixture,'public/media/posts/editor-verification-article/deckcrypt.png'))).length > 0);
  const badUpload = await api('upload',{name:'bad.png',base64:Buffer.from('not an image').toString('base64'),folder:'uploads'});
  assert.equal(badUpload.status(),400);
  console.log('✓ Image uploads enter the media folder and insert Markdown; invalid images are rejected.');

  source = await readFile(path.join(fixture,'content/posts/editor-verification-article.mdx'),'utf8');
  await writeFile(path.join(fixture,'content/posts/editor-verification-article.mdx'),source+'\nExternal edit.\n');
  await page.locator('#post-title').fill('Unsaved browser title'); await page.locator('#save').click();
  await page.waitForFunction(() => document.querySelector('#message').textContent.includes('changed outside'));
  assert.equal(await page.locator('#post-title').inputValue(),'Unsaved browser title');
  assert.match(await readFile(path.join(fixture,'content/posts/editor-verification-article.mdx'),'utf8'),/External edit/);
  page.once('dialog', dialog => dialog.accept()); await page.locator('#reload').click();
  await page.waitForFunction(() => document.querySelector('#post-body').value.includes('External edit.'));
  await page.locator('#post-body').fill('<BrokenComponent'); await page.locator('#save').click();
  await page.waitForFunction(() => !document.querySelector('#message').hidden && !document.querySelector('#message').classList.contains('success') && !document.querySelector('#save').disabled);
  assert.doesNotMatch(await readFile(path.join(fixture,'content/posts/editor-verification-article.mdx'),'utf8'),/BrokenComponent/);
  console.log('✓ Outside edits and invalid MDX cannot overwrite the saved article.');

  page.once('dialog', dialog => dialog.accept()); await page.locator('#projects-nav').click();
  await page.locator('[data-project="0"] [data-key=title]').fill('Verified project');
  await page.locator('[data-project="0"] [data-action=down]').click();
  await page.locator('#save').click(); await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Saved to disk');
  const projects = JSON.parse(await readFile(path.join(fixture,'content/projects.json'),'utf8'));
  assert.equal(projects[1].title,'Verified project');
  await page.waitForFunction(async () => (await (await fetch('/projects/')).text()).includes('Verified project'));
  await page.locator('#project-mode').click(); await page.locator('#projects-source').fill('[broken');
  await page.locator('#save').click(); await page.waitForFunction(() => document.querySelector('#message').textContent.includes('JSON is invalid'));
  assert.equal(JSON.parse(await readFile(path.join(fixture,'content/projects.json'),'utf8'))[1].title,'Verified project');
  console.log('✓ Project fields, ordering and JSON editing save to the one projects file.');

  page.once('dialog', dialog => dialog.accept()); await page.locator('#media-nav').click();
  assert.ok(await page.locator('#media-grid img').count() >= 17);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  assert.deepEqual(errors,[]);
  console.log('✓ Media library, responsive editor and browser error checks pass.');
} finally {
  await browser?.close(); server?.kill('SIGTERM');
  if (server) await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit',resolve); });
  await rm(fixture,{recursive:true,force:true});
}
