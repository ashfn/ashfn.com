const $ = selector => document.querySelector(selector);
const token = $('meta[name="editor-token"]').content;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const slugify = value => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let state, current, mode = 'post', dirty = false, saving = false, view = 'write', projectJson = false, projectData = [], imageTarget = null, previewTimer, previewSequence = 0;

async function api(route, data) {
  const response = await fetch('/editor/api/' + route, { method: data === undefined ? 'GET' : 'POST', headers: { 'X-Editor-Token': token, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unable to connect to the local editor.');
  return result;
}
function message(text = '', success = false) {
  $('#message').hidden = !text; $('#message').textContent = text; $('#message').classList.toggle('success', success);
}
function setDirty(value = true) {
  dirty = value; $('#save').disabled = !dirty || saving || mode === 'media';
  $('#save-state').textContent = saving ? 'Saving…' : dirty ? 'Unsaved changes' : mode === 'media' ? '' : 'Saved to disk';
}
function canLeave() { return !dirty || confirm('Discard your unsaved changes?'); }
function navigation() {
  const query = $('#post-search').value.toLowerCase();
  $('#post-list').innerHTML = state.posts.filter(post => (post.title + ' ' + post.file).toLowerCase().includes(query)).map(post => `<button class="nav-item${mode === 'post' && current?.file === post.file ? ' active' : ''}" data-file="${esc(post.file)}" ${mode === 'post' && current?.file === post.file ? 'aria-current="page"' : ''}><span>${esc(post.title)}</span><small>${esc(post.file)}${post.hidden ? ' · hidden' : ''}${post.error ? ' · needs attention' : ''}</small></button>`).join('') || '<p class="empty">No posts found.</p>';
  $('#projects-nav').classList.toggle('active', mode === 'projects'); $('#media-nav').classList.toggle('active', mode === 'media');
}
function panels(next) {
  mode = next; message();
  for (const name of ['post', 'projects', 'media']) $('#' + name + '-panel').hidden = name !== mode;
  $('#save').hidden = mode === 'media'; $('#open-page').hidden = mode === 'media';
  $('#document-label').textContent = mode === 'post' ? 'BLOG POST' : mode === 'projects' ? 'PROJECT COLLECTION' : 'MEDIA LIBRARY';
  navigation();
}
function postValues() {
  return { file: current.file, revision: current.revision, title: $('#post-title').value, description: $('#post-description').value, date: $('#post-date').value, slug: $('#post-slug').value, hidden: $('#post-hidden').checked, body: $('#post-body').value, format: current.file.endsWith('.mdx') ? 'mdx' : 'md' };
}
function showPost(post) {
  if (post.error) { message(`${post.file}: ${post.error}\nFix the frontmatter in your text editor, then Reload.`); return; }
  current = structuredClone(post); panels('post');
  for (const field of ['title', 'description', 'date', 'slug', 'body']) $('#post-' + field).value = post[field] || '';
  $('#post-hidden').checked = !!post.hidden;
  $('#file-path').textContent = 'content/posts/' + post.file;
  $('#open-page').href = '/blog/posts/' + post.slug + '/';
  $('#open-page').hidden = !post.revision;
  history.replaceState(null, '', '/editor/#' + encodeURIComponent(post.file));
  setDirty(!post.revision); words(); updatePreview();
}
function words() {
  const text = $('#post-body').value.trim(); $('#word-count').textContent = (text ? text.split(/\s+/).length : 0).toLocaleString() + ' words';
}
async function updatePreview() {
  clearTimeout(previewTimer);
  if (view === 'write' || mode !== 'post') return;
  const sequence = ++previewSequence;
  $('#save-state').textContent = 'Rendering preview…';
  try {
    const result = await api('preview', postValues());
    if (sequence !== previewSequence || mode !== 'post') return;
    $('#post-preview').srcdoc = result.html;
    setDirty(dirty); message();
  } catch (error) { if (sequence === previewSequence) { message(error.message); setDirty(dirty); } }
}
function setView(next) {
  view = next; $('#writing-area').dataset.view = view;
  $('#post-body').hidden = view === 'preview'; $('#post-preview').hidden = view === 'write';
  document.querySelectorAll('[data-view]').forEach(button => { if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', button.dataset.view === view ? 'true' : 'false'); });
  updatePreview();
}
function showProjects() {
  panels('projects'); $('#file-path').textContent = 'content/projects.json'; $('#open-page').href = '/projects/';
  $('#projects-source').value = state.projects.source;
  try { projectData = JSON.parse(state.projects.source); if (!Array.isArray(projectData)) throw new Error(); projectJson = false; }
  catch { projectData = []; projectJson = true; message('Projects JSON needs attention. Fix it here, then save.'); }
  renderProjects(); setDirty(false); history.replaceState(null, '', '/editor/#projects');
}
function renderProjects() {
  $('#project-fields').hidden = projectJson; $('#projects-source').hidden = !projectJson; $('#add-project').hidden = projectJson;
  $('#project-mode').textContent = projectJson ? 'Edit fields' : 'Edit JSON';
  $('#project-fields').innerHTML = projectData.map((project, index) => `<section class="project-card" data-project="${index}">
    <header><h2>${String(index + 1).padStart(2, '0')} <span class="muted">/</span> ${esc(project.title || 'New project')}</h2><div><button class="icon-button" data-action="up" aria-label="Move project ${index + 1} up" ${index === 0 ? 'disabled' : ''}>↑</button><button class="icon-button" data-action="down" aria-label="Move project ${index + 1} down" ${index === projectData.length - 1 ? 'disabled' : ''}>↓</button><button class="quiet danger" data-action="remove">Remove</button></div></header>
    <div class="project-grid"><label>Title<input data-key="title" value="${esc(project.title)}" required></label><label>Image<div class="project-image-field"><input data-key="image" value="${esc(project.image)}" placeholder="/media/projects/example.png"><button data-action="image">Choose</button></div></label></div>
    <label>Description<textarea data-key="description" rows="2">${esc(project.description)}</textarea></label>
    <p class="project-links-label">Links</p><div>${(project.links || []).map((link, linkIndex) => `<div class="project-link" data-link="${linkIndex}"><label>Icon<select data-link-key="type">${['repository','blog','youtube','preview'].map(type => `<option ${type === link.type ? 'selected' : ''}>${type}</option>`).join('')}</select></label><label>Label<input data-link-key="label" value="${esc(link.label)}"></label><label class="link-url">URL<input data-link-key="href" value="${esc(link.href)}" placeholder="https://… or /blog/posts/…/"></label><button class="icon-button danger" data-action="remove-link" aria-label="Remove link ${linkIndex + 1}">×</button></div>`).join('')}</div><button class="quiet" data-action="add-link">＋ Link</button>
  </section>`).join('') || '<p class="empty">Add your first project.</p>';
}
function syncProjectSource() { $('#projects-source').value = JSON.stringify(projectData, null, 2) + '\n'; }
function showMedia() {
  panels('media'); $('#file-path').textContent = 'public/media/'; setDirty(false); renderMedia(); history.replaceState(null, '', '/editor/#images');
}
function renderMedia() {
  for (const [grid, search] of [['media-grid', 'media-search'], ['image-grid', 'image-search']]) {
    const query = $('#' + search).value.toLowerCase();
    $('#' + grid).innerHTML = state.media.filter(item => item.src.toLowerCase().includes(query)).map(item => `<button class="media-card" data-src="${esc(item.src)}" title="${esc(item.src)}"><img src="${esc(item.src)}" alt="${esc(item.name)}" loading="lazy"><span>${esc(item.name)}</span><small>${Math.ceil(item.bytes / 1024).toLocaleString()} KB · ${esc(item.src.split('/').slice(-2,-1)[0])}</small></button>`).join('') || '<p class="empty">No images found.</p>';
  }
}
function openImages(target) {
  imageTarget = target; $('#image-search').value = ''; renderMedia(); $('#image-dialog').showModal();
}
function insertImage(src) {
  if (typeof imageTarget === 'number') {
    projectData[imageTarget].image = src; renderProjects(); syncProjectSource(); setDirty();
  } else if (mode === 'post') {
    const textarea = $('#post-body'); const alt = src.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    textarea.setRangeText(`\n![${alt}](${src})\n`, textarea.selectionStart, textarea.selectionEnd, 'end');
    setDirty(); words(); updatePreview(); textarea.focus();
  }
  $('#image-dialog').close();
}
async function uploadFiles(files) {
  if (!files.length) return;
  const folder = typeof imageTarget === 'number' || mode === 'projects' ? 'projects' : mode === 'post' && slugify($('#post-slug').value) ? 'posts/' + slugify($('#post-slug').value) : 'uploads';
  try {
    $('#save-state').textContent = 'Uploading…';
    const uploaded = [];
    for (const file of files) {
      if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name} exceeds 12 MB.`);
      const base64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
      const result = await api('upload', { name: file.name, base64, folder }); uploaded.push(result.src);
    }
    state.media = (await api('state')).media; renderMedia();
    if (mode === 'post' || typeof imageTarget === 'number') for (const src of uploaded) insertImage(src);
    message(`${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded${mode === 'post' ? ' and inserted. Save your post when ready.' : '.'}`, true);
  } catch (error) { message(error.message); }
  finally { $('#image-upload').value = ''; setDirty(dirty); }
}
async function saveChanges() {
  if (!dirty || saving || mode === 'media') return;
  if (mode === 'post' && !$('#post-form').reportValidity()) return;
  // Snapshot the submitted version. Typing while saving remains unsaved.
  const payload = mode === 'post' ? postValues() : { source: projectJson ? $('#projects-source').value : JSON.stringify(projectData, null, 2) + '\n', revision: state.projects.revision };
  const savedMode = mode, savedFile = current?.file;
  saving = true; setDirty(dirty); message();
  try {
    const result = await api(mode === 'post' ? 'post' : 'projects', payload);
    const fresh = await api('state'); state = fresh;
    if (savedMode === 'post' && mode === 'post' && savedFile === current.file) {
      const latest = postValues(); current.revision = result.revision;
      setDirty(['title','description','date','slug','hidden','body'].some(key => latest[key] !== payload[key]));
      $('#open-page').href = '/blog/posts/' + payload.slug + '/'; $('#open-page').hidden = false;
    } else if (savedMode === 'projects' && mode === 'projects') {
      state.projects.revision = result.revision;
      const latest = projectJson ? $('#projects-source').value : JSON.stringify(projectData, null, 2) + '\n'; setDirty(latest !== payload.source);
    }
    navigation(); message('Saved to disk. The site is rebuilding; refresh its page in a moment.', true);
  } catch (error) { message(error.message); }
  finally { saving = false; setDirty(dirty); }
}
$('#post-list').addEventListener('click', event => { const button = event.target.closest('[data-file]'); if (button && !saving && canLeave()) showPost(state.posts.find(post => post.file === button.dataset.file)); });
$('#post-search').addEventListener('input', navigation);
$('#projects-nav').addEventListener('click', () => { if (!saving && canLeave()) showProjects(); });
$('#media-nav').addEventListener('click', () => { if (!saving && canLeave()) { imageTarget = null; showMedia(); } });
$('#new-post').addEventListener('click', () => {
  if (saving || !canLeave()) return;
  const title = prompt('Post title'); if (!title?.trim()) return;
  const base = slugify(title) || 'new-post'; let slug = base, count = 2;
  while (state.posts.some(post => post.slug === slug || post.file.replace(/\.mdx?$/, '') === slug)) slug = base + '-' + count++;
  showPost({ file: slug + '.mdx', revision: null, title: title.trim(), slug, date: new Date().toLocaleDateString('en-CA'), description: '', hidden: true, body: '' }); $('#post-body').focus();
});
$('#post-form').addEventListener('submit', event => { event.preventDefault(); saveChanges(); });
$('#post-form').addEventListener('input', () => { setDirty(); words(); clearTimeout(previewTimer); previewTimer = setTimeout(updatePreview, 700); });
$('.segmented').addEventListener('click', event => { const button = event.target.closest('[data-view]'); if (button) setView(button.dataset.view); });
$('#post-body').addEventListener('keydown', event => { if (event.key === 'Tab') { event.preventDefault(); const field = event.target; field.setRangeText('  ', field.selectionStart, field.selectionEnd, 'end'); setDirty(); } });
$('#save').addEventListener('click', saveChanges);
$('#reload').addEventListener('click', async () => {
  if (saving || !canLeave()) return;
  try { state = await api('state'); if (mode === 'post') { const post = state.posts.find(post => post.file === current?.file) || state.posts[0]; if (post) showPost(post); else showProjects(); } else if (mode === 'projects') showProjects(); else showMedia(); }
  catch (error) { message(error.message); }
});
$('#project-fields').addEventListener('input', event => {
  const card = event.target.closest('[data-project]'); if (!card) return;
  const project = projectData[Number(card.dataset.project)], field = event.target;
  if (field.dataset.key) project[field.dataset.key] = field.value;
  else if (field.dataset.linkKey) project.links[Number(field.closest('[data-link]').dataset.link)][field.dataset.linkKey] = field.value;
  syncProjectSource(); setDirty();
});
$('#project-fields').addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const index = Number(button.closest('[data-project]').dataset.project), project = projectData[index], action = button.dataset.action;
  if (action === 'image') { openImages(index); return; }
  if (action === 'remove') { if (!confirm(`Remove ${project.title || 'this project'}? Save changes to apply.`)) return; projectData.splice(index, 1); }
  if (action === 'up' && index > 0) [projectData[index-1], projectData[index]] = [project, projectData[index-1]];
  if (action === 'down' && index < projectData.length - 1) [projectData[index+1], projectData[index]] = [project, projectData[index+1]];
  if (action === 'add-link') project.links.push({ type: 'repository', label: 'Source', href: '' });
  if (action === 'remove-link') project.links.splice(Number(button.closest('[data-link]').dataset.link), 1);
  renderProjects(); syncProjectSource(); setDirty();
});
$('#add-project').addEventListener('click', () => { projectData.push({ title: '', description: '', image: '', links: [] }); renderProjects(); syncProjectSource(); setDirty(); document.querySelector('.project-card:last-child input').focus(); });
$('#project-mode').addEventListener('click', () => {
  if (projectJson) { try { const data = JSON.parse($('#projects-source').value); if (!Array.isArray(data) || data.some(project => !project || typeof project !== 'object' || !Array.isArray(project.links))) throw new Error(); projectData = data; } catch { message('Use a JSON array of projects, each with a links array, before switching to fields.'); return; } }
  else syncProjectSource(); projectJson = !projectJson; renderProjects(); message();
});
$('#projects-source').addEventListener('input', () => setDirty());
$('#insert-image').addEventListener('click', () => openImages('post'));
$('#close-images').addEventListener('click', () => $('#image-dialog').close());
$('#image-grid').addEventListener('click', event => { const button = event.target.closest('[data-src]'); if (button) insertImage(button.dataset.src); });
$('#media-grid').addEventListener('click', async event => {
  const button = event.target.closest('[data-src]'); if (!button) return;
  try { await navigator.clipboard.writeText(button.dataset.src); message('Copied: ' + button.dataset.src, true); }
  catch { prompt('Copy image path:', button.dataset.src); }
});
for (const id of ['media-search','image-search']) $('#' + id).addEventListener('input', renderMedia);
$('#upload-main').addEventListener('click', () => { imageTarget = null; $('#image-upload').click(); });
$('#upload-dialog').addEventListener('click', () => $('#image-upload').click());
$('#image-upload').addEventListener('change', event => uploadFiles([...event.target.files]));
$('#post-body').addEventListener('dragover', event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); });
$('#post-body').addEventListener('drop', event => { if (!event.dataTransfer.files.length) return; event.preventDefault(); imageTarget = 'post'; uploadFiles([...event.dataTransfer.files]); });
window.addEventListener('beforeunload', event => { if (dirty || saving) { event.preventDefault(); event.returnValue = ''; } });
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveChanges(); } });
try {
  state = await api('state'); const selected = decodeURIComponent(location.hash.slice(1));
  if (selected === 'projects') showProjects(); else if (selected === 'images') showMedia();
  else { const post = state.posts.find(post => post.file === selected) || state.posts.find(post => !post.hidden) || state.posts[0]; if (post) showPost(post); else showProjects(); }
} catch (error) { message(error.message); $('#save-state').textContent = 'Unable to load'; }
