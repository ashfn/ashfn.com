import Icon from './Icon';
export default function ThemeToggle() {
  return (
    <label
      htmlFor="theme-toggle"
      title="Toggle color theme"
      className="fixed bottom-4 right-4 z-50 grid h-9 w-9 place-items-center overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] backdrop-blur-sm transition-colors duration-200 hover:bg-[var(--surface-hover)] hover:border-[var(--border-subtle)] cursor-pointer"
    >
      <input id="theme-toggle" type="checkbox" aria-label="Use alternate color theme"
        className="absolute inset-0 h-full w-full opacity-0 cursor-pointer" />
      {/* Sun and moon are stacked; the inactive one rotates and scales away */}
      <span
        aria-hidden
        data-theme-icon="sun"
        className="col-start-1 row-start-1 transition-all duration-300 ease-out"

      >
        <Icon name="sun" />
      </span>
      <span
        aria-hidden
        data-theme-icon="moon"
        className="col-start-1 row-start-1 transition-all duration-300 ease-out"

      >
        <Icon name="moon" />
      </span>
    </label>
  );
}
