import { Link } from './Elements';
import { PageTransition } from './PageTransition';
export interface Heading { id: string; text: string }
export default function BlogPost({ title, date, html, headings }: {
  title: string; date: string; html: string; headings: Heading[];
}) {
  const nativeTocStyles = headings.map(h =>
    `html:not([data-js]):has(article [id=${JSON.stringify(h.id)}]:target) [data-toc] a[href=${JSON.stringify('#' + h.id)}] { color:var(--ashgreen);opacity:1 }
html:not([data-js]):has(article [id=${JSON.stringify(h.id)}]:target) [data-toc] a[href=${JSON.stringify('#' + h.id)}]::before { content:'';position:absolute;left:0;top:0;bottom:0;width:1px;background:currentColor }`
  ).join('\n');
  return <div className="min-h-screen bg-[var(--background)]">
    <PageTransition>
      {headings.length > 0 && <style>{nativeTocStyles}</style>}
      <div className="max-w-2xl mx-auto px-6 py-16 relative">
        {headings.length > 0 && <nav data-toc="" aria-label="Table of contents"
          className="toc-nav hidden lg:block fixed left-8 top-1/2 -translate-y-1/2">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-[var(--border)]" />
          <div data-toc-indicator="" className="absolute left-0 w-px bg-[var(--ashgreen)] transition-[top,height,opacity] duration-300 ease-out"
            style={{ top: 0, height: 0, opacity: 0 }} />
          <ul className="space-y-2 text-xs">
            {headings.map((h) => <li key={h.id}>
              <a href={`#${h.id}`} className="toc-link block py-0.5 pl-3 no-underline hover:no-underline">{h.text}</a>
            </li>)}
          </ul>
        </nav>}
        <div className="flex items-start gap-3 mb-8">
          <Link href="/blog" aria-label="Back to blog" className="flex h-7 items-center text-[var(--ashgreen)] hover:text-[var(--ashgreen-light)]">&larr;</Link>
          <div>
            <h1 className="text-xl font-medium">{title}</h1>
            <p className="text-[var(--foreground)] opacity-40 text-sm">{date}</p>
          </div>
        </div>
        <article className="prose max-w-none space-y-6 text-[var(--foreground)] leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </PageTransition>
  </div>;
}
