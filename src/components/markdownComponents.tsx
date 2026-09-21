import { Link } from '@/components/Elements';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import CodeBlock, { InlineCode, isHighlighted } from './CodeBlock';
import ExternalLink from './ExternalLink';
import PostImage from './PostImage';

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const textOf = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  const props = (node as { props?: { children?: ReactNode } }).props;
  return props ? textOf(props.children) : '';
};

/** The image renderer, referenced by both `img` and the paragraph check. */
const MarkdownImage = ({ src, alt, title }: ComponentPropsWithoutRef<'img'>) => (
  <PostImage src={String(src ?? '')} alt={alt ?? ''} caption={title || undefined} />
);

/**
 * True when a paragraph holds only images (one, or several on consecutive
 * lines). Those render as <figure>, which is invalid inside <p>. Works for
 * markdown and MDX alike by inspecting rendered children rather than the
 * source tree, since MDX supplies no `node`.
 */
function isImagesOnly(children: ReactNode): boolean {
  const items = (Array.isArray(children) ? children : [children]).filter(
    (child) => !(typeof child === 'string' && !child.trim()),
  );
  if (items.length === 0) return false;
  return items.every((child) => {
    const type = (child as { type?: unknown })?.type;
    return type === MarkdownImage || type === PostImage;
  });
}

/**
 * How markdown elements map onto this site's styles and components. Shared by
 * markdown and MDX posts so both render identically.
 */
export const markdownComponents = {
  h2: ({ children }: ComponentPropsWithoutRef<'h2'>) => (
    // The table of contents in BlogPost picks these up by id
    <h2 id={slugify(textOf(children))} className="text-base font-medium mt-10 mb-4">
      {children}
    </h2>
  ),
  h3: ({ children }: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="text-sm font-medium mt-8 mb-3">{children}</h3>
  ),
  p: ({ children }: ComponentPropsWithoutRef<'p'>) =>
    // An image on its own line would otherwise render <figure> inside <p>,
    // which is invalid HTML and breaks hydration. Drop the wrapper.
    isImagesOnly(children) ? <>{children}</> : <p className="opacity-90">{children}</p>,
  ul: ({ children }: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="list-disc pl-5 space-y-1 opacity-90">{children}</ul>
  ),
  ol: ({ children }: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="list-decimal pl-5 space-y-1 opacity-90">{children}</ol>
  ),
  blockquote: ({ children }: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="border-l-2 border-[var(--border)] pl-4 opacity-70">{children}</blockquote>
  ),
  hr: () => <hr className="border-[var(--border)] my-8" />,
  table: ({ children }: ComponentPropsWithoutRef<'table'>) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }: ComponentPropsWithoutRef<'th'>) => (
    <th className="border border-[var(--border)] px-3 py-1.5 text-left font-medium">{children}</th>
  ),
  td: ({ children }: ComponentPropsWithoutRef<'td'>) => (
    <td className="border border-[var(--border)] px-3 py-1.5">{children}</td>
  ),
  a: ({ href, children }: ComponentPropsWithoutRef<'a'>) => {
    const target = href ?? '';
    if (/^https?:\/\//.test(target)) {
      return <ExternalLink href={target}>{children}</ExternalLink>;
    }
    return (
      <Link href={target} className="text-[var(--ashgreen)]">
        {children}
      </Link>
    );
  },
  img: MarkdownImage,
  // Fenced blocks arrive as <pre><code class="language-x">; unwrap them so the
  // site's own CodeBlock (and its copy button) does the rendering.
  pre: ({ children }: ComponentPropsWithoutRef<'pre'>) => {
    const child = Array.isArray(children) ? children[0] : children;
    const props = (child as { props?: ComponentPropsWithoutRef<'code'> })?.props;
    const language = /language-(\w+)/.exec(props?.className ?? '')?.[1];
    const code = textOf(props?.children).replace(/\n$/, '');
    return <CodeBlock code={code} language={isHighlighted(language) ? language : undefined} />;
  },
  code: ({ className, children }: ComponentPropsWithoutRef<'code'>) =>
    className?.includes('language-') ? (
      <>{children}</>
    ) : (
      <InlineCode>{textOf(children)}</InlineCode>
    ),
};
