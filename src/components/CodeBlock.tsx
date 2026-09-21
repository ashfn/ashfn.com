// Server component: syntax highlighting is performed at build time and emitted
// as static HTML, so react-syntax-highlighter ships no JavaScript to the client.
// Only the small copy button is a client island.
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';
import c from 'react-syntax-highlighter/dist/esm/languages/hljs/c';
import cpp from 'react-syntax-highlighter/dist/esm/languages/hljs/cpp';
import css from 'react-syntax-highlighter/dist/esm/languages/hljs/css';
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import nginx from 'react-syntax-highlighter/dist/esm/languages/hljs/nginx';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import rust from 'react-syntax-highlighter/dist/esm/languages/hljs/rust';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import yaml from 'react-syntax-highlighter/dist/esm/languages/hljs/yaml';
import CopyButton from './CopyButton';

const LANGUAGES = {
  bash, c, cpp, css, go, javascript, json, nginx, python, rust, sql, typescript, xml, yaml,
};

for (const [name, definition] of Object.entries(LANGUAGES)) {
  SyntaxHighlighter.registerLanguage(name, definition);
}

// Common aliases, so a fence tagged ```js or ```sh still highlights
const ALIASES: Record<string, keyof typeof LANGUAGES> = {
  sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash',
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  html: 'xml', svg: 'xml', yml: 'yaml', golang: 'go', 'c++': 'cpp', rs: 'rust',
};

/** Resolves a fence tag to a registered language, or undefined if we can't highlight it. */
export function isHighlighted(language?: string): string | undefined {
  if (!language) return undefined;
  const name = language.toLowerCase();
  if (name in LANGUAGES) return name;
  return ALIASES[name];
}

interface CodeBlockProps {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language = "typescript" }: CodeBlockProps) {
  const singleLine = !/[\r\n]/.test(code.trimEnd());
  return (
    <div className="w-full max-w-3xl mx-auto my-4">
      <div className="relative">
        <div className={`absolute right-2 z-10 flex ${singleLine ? 'top-1/2 -translate-y-1/2' : 'top-2'}`}>
          <CopyButton code={code} />
        </div>
        <SyntaxHighlighter
          language={language}
          // Tokens are emitted as hljs class names rather than inline styles,
          // so the palette in globals.css can follow the active theme.
          useInlineStyles={false}
          customStyle={{
            padding: "1rem",
            fontSize: "0.875rem",
            margin: 0,
          }}
          showLineNumbers={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export function InlineCode({ children }: { children: string }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--foreground)] text-sm">
      {children}
    </code>
  );
}
