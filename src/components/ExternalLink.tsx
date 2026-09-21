import { ReactNode } from 'react';
import Icon from './Icon';

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

function linkHostname(href: string) {
  try {
    return new URL(href).hostname;
  } catch {
    return null;
  }
}

export default function ExternalLink({ href, children, className = '' }: ExternalLinkProps) {
  const hostname = linkHostname(href);
  const github = hostname && ['github.com', 'githubusercontent.com'].some(domain =>
    hostname === domain || hostname.endsWith('.' + domain));
  const iconName = github ? 'github' : null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-[var(--ashgreen)] hover:text-[var(--ashgreen-light)] transition-colors duration-200 ${className}`}
    >
      <span className="whitespace-nowrap">
      {hostname && (
        <span className="external-link-icon relative inline-block mr-[5px] w-[16px] h-[16px] rounded-[3px] border border-[var(--foreground)]/15 bg-[var(--foreground)]/5 overflow-hidden">
          {iconName ? (
            <Icon
              name={iconName}
              size={12}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--foreground)]"
            />
          ) : <img
            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
            alt=""
            width={16}
            height={16}
            loading="lazy"
            className="absolute left-1/2 top-1/2 w-[12px] h-[12px] -translate-x-1/2 -translate-y-1/2 object-contain"
            data-favicon=""
          />}
        </span>
      )}
      <span className="whitespace-normal">{children}</span>
      </span>
    </a>
  );
}
