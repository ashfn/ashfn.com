import Icon from './Icon';
import { registerCode } from '../lib/codeFiles';
export default function CopyButton({ code }: { code: string }) {
  return <a href={registerCode(code)} data-copy="" aria-label="Open code as plain text" title="Open code as plain text"
    className="inline-block p-2 rounded hover:bg-[var(--surface-hover)] cursor-pointer">
    <Icon name="copy" size={14} className="text-[var(--foreground)] opacity-40" />
    <Icon name="check" size={14} className="text-[var(--ashgreen)]" style={{ display: 'none' }} />
  </a>;
}
