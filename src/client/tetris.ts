import { cellsOf, createGame, ghostY, hardDrop, move, rotate, softDrop, tick } from './tetris-rules';
export function wellFor(width: number, height: number) {
  const cols = Math.max(8, Math.round(width / 44));
  const cell = width / cols;
  return { cols, rows: Math.max(6, Math.floor(height / cell)), cell };
}
export function start(done: () => void) {
  const canvas = document.createElement('canvas');
  canvas.className = 'pointer-events-none fixed inset-0 z-0';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); done(); return; }
  const context = ctx;
  const hud = document.createElement('div');
  hud.className = 'fixed bottom-16 right-4 z-20 text-right text-sm text-[var(--foreground)] opacity-50';
  document.body.append(hud);
  let { cols, rows, cell } = wellFor(innerWidth, innerHeight);
  let game = createGame(cols, rows);
  let high = 0;
  try { high = Number(localStorage.getItem('tetrisHighScore')) || 0; } catch {}
  let ink = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim();
  let raf = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last = performance.now();
  let finished = false;
  let stopped = false;
  let previousHud = '';
  const system = matchMedia('(prefers-color-scheme: dark)');
  function status() {
    const html = game.over ? `<div>Game over — ${game.score}</div>` :
      `<div>Score: ${game.score}</div>${high > 0 ? `<div>High: ${high}</div>` : ''}<div>Lines: ${game.lines}</div>`;
    if (html !== previousHud) {
      hud.innerHTML = html + '<div class="opacity-70">←→/ad move · ↑/w/r rotate · ↓/s drop · space slam · esc</div>';
      previousHud = html;
    }
  }
  function drawCell(x: number, y: number, alpha: number) {
    if (y < 0) return;
    context.globalAlpha = alpha;
    context.fillStyle = ink;
    context.fillRect(Math.round(x * cell) + 1, Math.round(y * cell) + 1, Math.round(cell) - 2, Math.round(cell) - 2);
    context.globalAlpha = 1;
  }
  function draw() {
    context.clearRect(0, 0, innerWidth, innerHeight);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (game.board[y][x]) drawCell(x, y, .22);
    for (const [x, y] of cellsOf({ ...game.piece, y: ghostY(game) })) drawCell(x, y, .07);
    for (const [x, y] of cellsOf(game.piece)) drawCell(x, y, .32);
  }
  function resize() {
    const dpr = devicePixelRatio || 1;
    canvas.width = Math.floor(innerWidth * dpr); canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const well = wellFor(innerWidth, innerHeight);
    if (well.cols !== cols || well.rows !== rows) { ({ cols, rows } = well); game = createGame(cols, rows); }
    cell = well.cell;
    draw(); status();
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf); clearTimeout(timer);
    observer.disconnect();
    system.removeEventListener('change', theme);
    removeEventListener('resize', resize);
    removeEventListener('keydown', keydown);
    removeEventListener('pagehide', stop);
    document.removeEventListener('visibilitychange', visibility);
    canvas.remove(); hud.remove(); done();
  }
  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    if (game.score > high) {
      high = game.score;
      try { localStorage.setItem('tetrisHighScore', String(high)); } catch {}
    }
    status();
    (window as Window & { umami?: { track: (event: string, data: unknown) => void } }).umami?.track('tetris-played', { score: game.score, lines: game.lines });
    timer = setTimeout(stop, 2500);
  }
  function loop(now: number) {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    tick(game, dt); draw(); status();
    if (game.over) finish();
    else raf = requestAnimationFrame(loop);
  }
  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') { stop(); return; }
    if (game.over || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (!['ArrowLeft','a','ArrowRight','d','ArrowDown','s','ArrowUp','w','r',' '].includes(key)) return;
    event.preventDefault();
    if (key === 'ArrowLeft' || key === 'a') move(game, -1);
    else if (key === 'ArrowRight' || key === 'd') move(game, 1);
    else if (key === 'ArrowDown' || key === 's') softDrop(game, true);
    else if (key === ' ') hardDrop(game);
    else rotate(game, 1);
    draw(); status(); if (game.over) finish();
  }
  function visibility() { if (!document.hidden) last = performance.now(); }
  function theme() { ink = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim(); draw(); }
  const observer = new MutationObserver(theme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  system.addEventListener('change', theme);
  addEventListener('resize', resize); addEventListener('keydown', keydown);
  addEventListener('pagehide', stop, { once: true });
  document.addEventListener('visibilitychange', visibility);
  resize(); raf = requestAnimationFrame(loop);
}
