import Icon from './Icon';
import { ONION_HOST, ONION_ORIGIN } from '../lib/onion.js';

export default function TorFooter() {
  return (
    <footer className="w-full px-6 pb-16 sm:pb-6" aria-label="Tor address">
      <div className="flex flex-col items-center gap-1.5 text-[var(--foreground)]">
        <p className="text-xs text-center opacity-25">
          Mirror of this site below
        </p>
        <a href={ONION_ORIGIN + '/'} className="flex items-center gap-2 max-w-full text-[var(--foreground)] opacity-25 hover:opacity-100 hover:text-[#59316B] focus-visible:opacity-100 focus-visible:text-[#59316B] transition-none" aria-label="Open the onion address in Tor Browser">
          <Icon name="tor" className="shrink-0" />
          <span className="text-xs break-all select-text">{ONION_HOST}</span>
        </a>
      </div>
    </footer>
  );
}
