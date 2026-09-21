import Icon from './Icon';
function JsonNode({ value, level, depth, name }: { value: unknown; level: number; depth: number; name?: string }) {
  const prefix = name === undefined ? null : <><span className="json-view--property">{name}</span>:{' '}</>;
  if (value === null || typeof value !== 'object') {
    const type = value === null ? 'null' : typeof value;
    return <>{prefix}<span className={`json-view--${type}`}>{typeof value === 'string' ? `"${value}"` : String(value)}</span></>;
  }
  const array = Array.isArray(value);
  const entries = Object.entries(value);
  const opening = array ? '[' : '{', closing = array ? ']' : '}';
  return <details className="json-node" open={level <= depth}>
    <summary aria-label="Toggle JSON section">
      {prefix}
      <span>{opening}</span>
      <span data-json-expanded="" className="jv-size-chevron">
        <span className="jv-size">{entries.length} Items</span>
        <Icon name="chevron" className="jv-chevron" />
      </span>
      <span data-json-collapsed=""><span className="jv-button">...</span><span>{closing}</span><span className="jv-size">{entries.length} Items</span></span>
    </summary>
    <div className="jv-indent">
      {entries.map(([key, child]) => <div className="json-view--pair" key={key}>
        <JsonNode value={child} level={level + 1} depth={depth} name={array ? undefined : key} />
      </div>)}
    </div>
    <span>{closing}</span>
  </details>;
}
export default function JsonViewer({ json, depth = 2 }: { json: unknown; depth?: number }) {
  return <div className="json-view w-full max-w-3xl mx-auto my-4 p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
    <code className="json-view json-view_vscode"><JsonNode value={json} level={1} depth={depth} /></code>
  </div>;
}
