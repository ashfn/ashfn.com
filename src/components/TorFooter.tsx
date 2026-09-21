import Icon from './Icon';
import { ONION_HOST, ONION_ORIGIN, TOR_ARTICLE } from '../lib/onion.js';

export default function TorFooter() {
  return (
    <footer className="w-full px-6 pb-16 sm:pb-6" aria-label="Tor address">
      <div className="flex flex-col items-center gap-1.5 text-[var(--foreground)]">
        <p className="text-xs text-center opacity-25">
          Tor address.{' '}
          <a href={TOR_ARTICLE} className="underline hover:text-[#59316B] hover:opacity-100">How I found it</a>
        </p>
        <a href={ONION_ORIGIN + '/'} className="flex items-center gap-2 max-w-full text-[var(--foreground)] group opacity-25 hover:opacity-100 transition-opacity" aria-label="Open the onion address in Tor Browser">
          <Icon name="tor" className="shrink-0 group-hover:text-[#59316B] transition-colors" />
          <span className="text-xs break-all select-text group-hover:text-[#59316B] transition-colors">{ONION_HOST}</span>
        </a>
      </div>
    </footer>
  );
}
