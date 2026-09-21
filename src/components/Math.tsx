// Server component: renders KaTeX to static HTML at build time so no katex /
// react-katex JavaScript is shipped to the client (only the stylesheet is needed).

import katex from 'katex';

interface MathProps {
  expression: string;
  block?: boolean;
}

export default function Math({ expression, block = false }: MathProps) {
  const html = katex.renderToString(expression, {
    displayMode: block,
    throwOnError: false,
    strict: false,
  });

  if (block) {
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
