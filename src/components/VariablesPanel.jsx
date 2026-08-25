import { useState, useRef, useEffect } from 'react';

function formatValue(val) {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'function') return '[Function]';
  if (typeof val === 'object' && Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const items = val.map((v) => formatValue(v)).join(', ');
    return items.length > 50 ? `[${items.slice(0, 47)}...]` : `[${items}]`;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '{}';
    const preview = keys
      .slice(0, 3)
      .map((k) => `${k}: ${formatValue(val[k])}`)
      .join(', ');
    return keys.length > 3 ? `{ ${preview}, ... }` : `{ ${preview} }`;
  }
  return String(val);
}

function isInternalVar(name) {
  return name.startsWith('_');
}

function isFunctionVar(val) {
  return val && typeof val === 'object' && val.type === 'function';
}

export default function VariablesPanel({ variables, loopInfo, functionCall, info }) {
  const [prevValues, setPrevValues] = useState({});
  const [changed, setChanged] = useState(new Set());
  const changeTimers = useRef({});

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

  return (
    <div className="p-3">
      {/* Info banner */}
      {loopInfo && (
        <div
          className="mb-3 px-3 py-2 rounded text-xs"
          style={{
            background: 'rgba(210, 153, 34, 0.1)',
            border: '1px solid rgba(210, 153, 34, 0.3)',
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--color-warning)' }}>Loop</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              Iteration {loopInfo.iteration}
            </span>
            <span
              className="px-1 py-0.5 rounded text-[10px]"
              style={{
                background: loopInfo.condition
                  ? 'rgba(63, 185, 80, 0.2)'
                  : 'rgba(248, 81, 73, 0.2)',
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
          className="mb-3 px-3 py-2 rounded text-xs"
          style={{
            background: 'rgba(163, 113, 247, 0.1)',
            border: '1px solid rgba(163, 113, 247, 0.3)',
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: '#a371f7' }}>Call</span>
            <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>
              {functionCall.name}(
              {Object.entries(functionCall.params)
                .map(([k, v]) => `${k}=${formatValue(v)}`)
                .join(', ')}
              )
            </span>
          </div>
        </div>
      )}

      {info && !loopInfo && !functionCall && (
        <div
          className="mb-3 px-3 py-2 rounded text-xs"
          style={{
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span style={{ color: 'var(--color-text-secondary)' }}>{info}</span>
        </div>
      )}

      <h3
        className="text-[11px] uppercase tracking-wider font-medium mb-3"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Variables
      </h3>
      {entries.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          No variables in scope
        </p>
      ) : (
        <div className="space-y-1">
          {entries.map(([name, value]) => {
            const isChanged = changed.has(name);
            return (
              <div
                key={name}
                className="flex items-center justify-between px-2 py-1.5 rounded text-sm transition-all duration-300"
                style={{
                  background: isChanged ? 'rgba(88, 166, 255, 0.12)' : 'transparent',
                  borderLeft: isChanged
                    ? '2px solid var(--color-accent)'
                    : '2px solid transparent',
                }}
              >
                <span
                  className="font-mono text-xs font-medium"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {name}
                </span>
                <span
                  className="font-mono text-xs"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {formatValue(value)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
