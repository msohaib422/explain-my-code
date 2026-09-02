import { useState, useRef, useEffect } from 'react';

function isInternalVar(name) {
  return name.startsWith('_');
}

function isFunctionVar(val) {
  return val && typeof val === 'object' && val.type === 'function';
}

function formatCompact(val) {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'function') return '[Function]';
  if (typeof val === 'object' && Array.isArray(val)) {
    return val.length === 0 ? '[]' : `Array(${val.length})`;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    return keys.length === 0 ? '{}' : `Object{${keys.length}}`;
  }
  return String(val);
}

function formatFull(val, depth = 0) {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'function') return '[Function]';
  if (typeof val === 'object' && Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const indent = '  '.repeat(depth + 1);
    const closeIndent = '  '.repeat(depth);
    const items = val.map((v) => `${indent}${formatFull(v, depth + 1)}`).join(',\n');
    return `[\n${items}\n${closeIndent}]`;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '{}';
    const indent = '  '.repeat(depth + 1);
    const closeIndent = '  '.repeat(depth);
    const items = keys
      .map((k) => `${indent}${k}: ${formatFull(val[k], depth + 1)}`)
      .join(',\n');
    return `{\n${items}\n${closeIndent}}`;
  }
  return String(val);
}

function Chevron({ expanded }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        opacity: 0.4,
      }}
    >
      <path d="M3 2l4 3-4 3" />
    </svg>
  );
}

export default function VariablesPanel({ variables, loopInfo, functionCall, info }) {
  const [prevValues, setPrevValues] = useState({});
  const [changed, setChanged] = useState(new Set());
  const changeTimers = useRef({});
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    const changedKeys = new Set();
    for (const [key, value] of Object.entries(variables)) {
      if (isInternalVar(key) || isFunctionVar(value)) continue;
      const prev = prevValues[key];
      if (prev !== undefined) {
        try {
          if (JSON.stringify(prev) !== JSON.stringify(value)) {
            changedKeys.add(key);
          }
        } catch {
          changedKeys.add(key);
        }
        if (changeTimers.current[key]) clearTimeout(changeTimers.current[key]);
        changeTimers.current[key] = setTimeout(() => {
          setChanged((s) => {
            const n = new Set(s);
            n.delete(key);
            return n;
          });
        }, 1200);
      }
    }
    if (changedKeys.size > 0) {
      setChanged((prev) => new Set([...prev, ...changedKeys]));
    }
    setPrevValues({ ...variables });
  }, [variables]);

  const entries = Object.entries(variables).filter(
    ([name, val]) => !isInternalVar(name) && !isFunctionVar(val)
  );

  const toggleExpand = (name) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const expandable = (val) => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'object' && Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return false;
  };

  return (
    <div className="p-4 space-y-3">
      {loopInfo && (
        <div
          className="px-4 py-3 rounded-xl text-xs"
          style={{
            background: 'linear-gradient(135deg, rgba(250, 176, 5, 0.06), rgba(250, 176, 5, 0.02))',
            border: '1px solid rgba(250, 176, 5, 0.2)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"/>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
              <span className="font-bold" style={{ color: 'var(--color-warning)' }}>Loop</span>
            </div>
            <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Iteration {loopInfo.iteration}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: loopInfo.condition
                  ? 'rgba(64, 192, 87, 0.15)'
                  : 'rgba(255, 107, 107, 0.15)',
                color: loopInfo.condition
                  ? 'var(--color-success)'
                  : 'var(--color-error)',
                border: `1px solid ${loopInfo.condition ? 'rgba(64, 192, 87, 0.25)' : 'rgba(255, 107, 107, 0.25)'}`,
              }}
            >
              {loopInfo.condition ? 'continue' : 'exit'}
            </span>
          </div>
        </div>
      )}

      {functionCall && (
        <div
          className="px-4 py-3 rounded-xl text-xs"
          style={{
            background: 'linear-gradient(135deg, rgba(134, 114, 255, 0.06), rgba(134, 114, 255, 0.02))',
            border: '1px solid rgba(134, 114, 255, 0.2)',
          }}
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8672ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span className="font-bold" style={{ color: '#8672ff' }}>Call</span>
            </div>
            <span className="font-mono font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {functionCall.name}(
              {Object.entries(functionCall.params)
                .map(([k, v]) => `${k}=${formatCompact(v)}`)
                .join(', ')}
              )
            </span>
          </div>
        </div>
      )}

      {info && !loopInfo && !functionCall && (
        <div
          className="px-4 py-3 rounded-xl text-xs"
          style={{
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{info}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-4 rounded-full" style={{ background: 'var(--color-accent)' }} />
        <h3
          className="text-[11px] uppercase tracking-wider font-bold"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Variables
        </h3>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
          {entries.length}
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          No variables in scope
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map(([name, value]) => {
            const isChanged = changed.has(name);
            const isExpanded = expanded.has(name);
            const isExpandable = expandable(value);

            return (
              <div
                key={name}
                className="rounded-xl overflow-hidden"
                style={{
                  border: isChanged ? '1px solid rgba(77, 171, 247, 0.25)' : '1px solid var(--color-border)',
                  background: isChanged ? 'rgba(77, 171, 247, 0.04)' : 'var(--color-bg-secondary)',
                  boxShadow: isChanged ? '0 2px 8px rgba(77, 171, 247, 0.08)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              >
                <button
                  onClick={() => isExpandable && toggleExpand(name)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all duration-200"
                  style={{ cursor: isExpandable ? 'pointer' : 'default' }}
                >
                  {isExpandable ? (
                    <Chevron expanded={isExpanded} />
                  ) : (
                    <span style={{ width: 10 }} />
                  )}
                  <span
                    className="font-mono text-xs font-bold"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {name}
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    =
                  </span>
                  {!isExpandable && (
                    <span
                      className="font-mono text-xs truncate font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {formatCompact(value)}
                    </span>
                  )}
                  {isExpandable && !isExpanded && (
                    <span
                      className="font-mono text-xs font-medium"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {formatCompact(value)}
                    </span>
                  )}
                </button>
                {isExpandable && isExpanded && (
                  <div
                    className="mx-3 mb-3 px-4 py-3 rounded-lg font-mono text-xs whitespace-pre-wrap break-all leading-relaxed"
                    style={{
                      background: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {formatFull(value)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
