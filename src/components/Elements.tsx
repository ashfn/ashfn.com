import type { ComponentPropsWithoutRef } from 'react';

// Build-time JSX helpers: ordinary HTML, without a client runtime.
export function Link({ href, ...props }: ComponentPropsWithoutRef<'a'>) {
  if (href?.startsWith('/') && !href.includes('.') && !/[#?/]$/.test(href)) href += '/';
  return <a href={href} {...props} />;
}
export function Image({ style, ...props }: ComponentPropsWithoutRef<'img'>) {
  return <img loading="lazy" decoding="async" style={{ color: 'transparent', ...style }} {...props} />;
}
