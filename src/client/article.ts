// Event delegation keeps article controls independent of the article's size.
document.querySelectorAll<HTMLAnchorElement>('[data-copy]').forEach((link) => {
  link.setAttribute('aria-label', 'Copy code');
  link.title = 'Copy code';
});
const copyTimers = new WeakMap<Element, ReturnType<typeof setTimeout>>();
document.addEventListener('click', async (event) => {
  if (!(event.target instanceof Element)) return;
  const copy = event.target.closest<HTMLAnchorElement>('[data-copy]');
  if (copy) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !navigator.clipboard?.writeText) return;
    event.preventDefault();
    const code = copy.parentElement?.parentElement?.querySelector('pre code')?.textContent;
    if (code === undefined) return;
    try {
      await navigator.clipboard.writeText(code);
      const [normal, check] = copy.querySelectorAll<HTMLElement>('[data-icon]');
      normal.style.display = 'none'; check.style.display = '';
      copy.setAttribute('aria-label', 'Copied');
      clearTimeout(copyTimers.get(copy));
      copyTimers.set(copy, setTimeout(() => {
        normal.style.display = ''; check.style.display = 'none';
        copy.setAttribute('aria-label', 'Copy code');
      }, 1500));
    } catch { location.href = copy.href; }
  }
});
// Handle both cached failures and images that fail after this script loads.
const hideFailedIcon = (img: HTMLImageElement) => img.parentElement?.remove();
document.querySelectorAll<HTMLImageElement>('[data-favicon]').forEach((img) => {
  if (img.complete && !img.naturalWidth) hideFailedIcon(img);
  else img.addEventListener('error', () => hideFailedIcon(img), { once: true });
});

const toc = document.querySelector<HTMLElement>('[data-toc]');
if (toc) {
  const links = [...toc.querySelectorAll<HTMLAnchorElement>('a')];
  const headings = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))!);
  const indicator = toc.querySelector<HTMLElement>('[data-toc-indicator]')!;
  let frame = 0;
  function update() {
    frame = 0;
    let active = 0;
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top <= innerHeight * .3) active = i;
      else break;
    }
    if (innerHeight + scrollY >= document.body.scrollHeight - 2) active = headings.length - 1;
    links.forEach((a, i) => {
      if (i === active) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    const item = links[active].parentElement!;
    indicator.style.top = `${item.offsetTop}px`;
    indicator.style.height = `${item.offsetHeight}px`;
    indicator.style.opacity = '1';
    if (item.offsetTop < toc!.scrollTop) toc!.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > toc!.scrollTop + toc!.clientHeight)
      toc!.scrollTop = item.offsetTop + item.offsetHeight - toc!.clientHeight;
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  toc.addEventListener('click', (event) => {
    const a = (event.target as Element).closest<HTMLAnchorElement>('a');
    if (!a || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    document.getElementById(decodeURIComponent(a.hash.slice(1)))?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
    history.replaceState(null, '', a.hash);
  });
  update();
}
