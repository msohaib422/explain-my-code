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
        transition: 'transform 0.2s ease',
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
    <div className="p-3">
      {loopInfo && (
        <div
          className="mb-3 px-3 py-2 rounded-lg text-xs"
          style={{
            background: 'rgba(210, 153, 34, 0.08)',
            border: '1px solid rgba(210, 153, 34, 0.25)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium" style={{ color: 'var(--color-warning)' }}>Loop</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              Iteration {loopInfo.iteration}
            </span>
            <span
              className="px-1.5 py-0.5 rounded-full text-[0.625rem] font-medium"
              style={{
                background: loopInfo.condition
                  ? 'rgba(63, 185, 80, 0.15)'
                  : 'rgba(248, 81, 73, 0.15)',
                color: loopInfo.condition
                  ? 'var(--color-success)'
                  : 'var(--color-error)',
              }}
            >
              {loopInfo.condition ? 'continue' : 'exit'}
            </span>
          </div>
        </div>
      )}

      {functionCall && (
        <div
          className="mb-3 px-3 py-2 rounded-lg text-xs"
          style={{
            background: 'rgba(163, 113, 247, 0.08)',
            border: '1px solid rgba(163, 113, 247, 0.25)',
          }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium" style={{ color: '#a371f7' }}>Call</span>
            <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>
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
          className="mb-3 px-3 py-2 rounded-lg text-xs"
          style={{
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span style={{ color: 'var(--color-text-secondary)' }}>{info}</span>
        </div>
      )}

      <h3
        className="text-[0.6875rem] uppercase tracking-wider font-medium mb-2"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Variables
      </h3>
      {entries.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          No variables in scope
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map(([name, value]) => {
            const isChanged = changed.has(name);
            const isExpanded = expanded.has(name);
            const isExpandable = expandable(value);

            return (
              <div key={name}>
                <button
                  onClick={() => isExpandable && toggleExpand(name)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-all duration-200"
                  style={{
                    background: isChanged ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
                    borderLeft: isChanged
                      ? '2px solid var(--color-accent)'
                      : '2px solid transparent',
                    cursor: isExpandable ? 'pointer' : 'default',
                  }}
                >
                  {isExpandable ? (
                    <Chevron expanded={isExpanded} />
                  ) : (
                    <span style={{ width: 10 }} />
                  )}
                  <span
                    className="font-mono text-xs font-medium"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {name}
                  </span>
                  <span className="text-[0.625rem] mx-0.5" style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}>
                    =
                  </span>
                  {!isExpandable && (
                    <span
                      className="font-mono text-xs truncate"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {formatCompact(value)}
                    </span>
                  )}
                  {isExpandable && !isExpanded && (
                    <span
                      className="font-mono text-xs"
                      style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}
                    >
                      {formatCompact(value)}
                    </span>
                  )}
                </button>
                {isExpandable && isExpanded && (
                  <div
                    className="ml-5 mr-2 mb-1.5 px-3 py-2 rounded-md font-mono text-xs whitespace-pre-wrap break-all leading-relaxed"
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
