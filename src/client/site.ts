// The shared enhancement layer. All content is already present in the HTML.
const root = document.documentElement;
const system = matchMedia('(prefers-color-scheme: dark)');
const button = document.querySelector<HTMLInputElement>('#theme-toggle');
function syncThemeLabel() {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : system.matches;
  const label = `Switch to ${dark ? 'light' : 'dark'} theme`;
  button?.setAttribute('aria-label', 'Use alternate color theme');
  button?.setAttribute('title', label);
}
if (button) {
  syncThemeLabel();
  system.addEventListener('change', syncThemeLabel);
  button.addEventListener('change', () => {
    const next = getComputedStyle(root).colorScheme === 'dark' ? 'dark' : 'light';
    const apply = () => {
      button.checked = false;
      if ((next === 'dark') === system.matches) {
        delete root.dataset.theme;
        try { localStorage.removeItem('theme'); } catch {}
      } else {
        root.dataset.theme = next;
        try { localStorage.setItem('theme', next); } catch {}
      }
      syncThemeLabel();
    };
    // The checkbox has already applied the CSS theme. Reset its inversion
    // while persisting that same theme; there is no script dependency.
    apply();
  });
}

// A six-character listener is all the games cost until someone starts one.
if (document.body.dataset.page === 'home') {
  let sequence = '';
  let running = false;
  document.addEventListener('keydown', async (event) => {
    if (running || event.ctrlKey || event.metaKey || event.altKey ||
      (event.target instanceof HTMLElement && event.target.closest('input:not([type="checkbox"]), textarea, [contenteditable="true"]'))) return;
    const key = event.key.toLowerCase();
    if (key.length !== 1 || !/[a-z]/.test(key)) return;
    sequence = (sequence + key).slice(-6);
    const name = sequence.endsWith('snake') ? 'snake' : sequence === 'tetris' ? 'tetris' : null;
    if (!name) return;
    sequence = '';
    running = true;
    try {
      const game = name === 'snake' ? await import('./snake') : await import('./tetris');
      game.start(() => { running = false; });
    } catch (error) { running = false; console.error('Could not start game', error); }
  });
}
