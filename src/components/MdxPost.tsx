import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import CodeBlock, { InlineCode } from './CodeBlock';
import ExternalLink from './ExternalLink';
import JsonViewer from './JsonViewer';
import Math from './Math';
import PostImage from './PostImage';
import { markdownComponents } from './markdownComponents';
const components = { ...markdownComponents, CodeBlock, InlineCode, ExternalLink, JsonViewer, Math, PostImage };

// Only local, first-party content is compiled. MDX never ships to the browser.
export async function renderMdx(source: string) {
  const { default: Content } = await evaluate(source, {
    ...runtime,
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [rehypeKatex],
  });
  return <Content components={components} />;
}
