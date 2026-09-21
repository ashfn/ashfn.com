import type { ReactNode } from 'react';
export function PageTransition({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`page-transition ${className}`} style={{ opacity: 1 }}>{children}</div>;
}
