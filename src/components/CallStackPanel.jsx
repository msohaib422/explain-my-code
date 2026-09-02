import { useEffect, useState, useRef } from 'react';

function formatValue(val) {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') {
    if (val.length > 20) return `"${val.slice(0, 18)}…"`;
    return `"${val}"`;
  }
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'function') return 'ƒ';
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const inner = val.length > 3 ? `${val.length} items` : val.map(formatValue).join(', ');
    return `[${inner}]`;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '{}';
    if (keys.length > 4) return `{${keys.length} keys}`;
    return `{${keys.map((k) => `${k}: ${formatValue(val[k])}`).join(', ')}}`;
  }
  return String(val);
}

function frameLabel(frame) {
  const { name, args } = frame;
  if (!args || args.length === 0) return name;
  return `${name}(${args.map(formatValue).join(', ')})`;
}

export default function CallStackPanel({ callStack, callStackHistory }) {
  const [prevStack, setPrevStack] = useState([]);
  const [animating, setAnimating] = useState(new Set());
  const timers = useRef({});

  useEffect(() => {
    const pushing = new Set();
    for (const frame of callStack) {
      const key = typeof frame === 'string' ? frame : `${frame.name}`;
      if (!prevStack.some((p) => (typeof p === 'string' ? p : p.name) === key)) {
        pushing.add(key);
        if (timers.current[key]) clearTimeout(timers.current[key]);
        timers.current[key] = setTimeout(() => {
          setAnimating((s) => {
            const n = new Set(s);
            n.delete(key);
            return n;
          });
        }, 600);
      }
    }
    if (pushing.size > 0) setAnimating(pushing);
    setPrevStack([...callStack]);
  }, [callStack]);

  const activeFrames = [...callStack].reverse();
  const removedFrames = (callStackHistory || []).filter((e) => e.status === 'Removed');

  const hasActive = activeFrames.length > 0;
  const hasRemoved = removedFrames.length > 0;

  if (!hasActive && !hasRemoved) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-4 rounded-full" style={{ background: 'var(--color-accent)' }} />
          <h3
            className="text-[11px] uppercase tracking-wider font-bold"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Call Stack
          </h3>
        </div>
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Stack is empty
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-4 rounded-full" style={{ background: 'var(--color-accent)' }} />
        <h3
          className="text-[11px] uppercase tracking-wider font-bold"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Call Stack
        </h3>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
          {activeFrames.length}
        </span>
      </div>
      <div className="space-y-2">
        {activeFrames.map((frame, i) => {
          const isTop = i === 0;
          const key = `active-${typeof frame === 'string' ? frame : frame.name}-${i}`;
          const isAnimating = animating.has(typeof frame === 'string' ? frame : `${frame.name}`);
          const label = frameLabel(frame);

          return (
            <div
              key={key}
              className="transition-all duration-300"
              style={{
                opacity: isAnimating ? 0.5 : 1,
                transform: isAnimating ? 'scale(0.97)' : 'scale(1)',
              }}
            >
              <div
                className="px-4 py-3 rounded-xl text-sm font-mono"
                style={{
                  background: isTop
                    ? 'linear-gradient(135deg, rgba(77, 171, 247, 0.1), rgba(151, 117, 250, 0.06))'
                    : 'var(--color-bg-secondary)',
                  border: isTop
                    ? '1px solid rgba(77, 171, 247, 0.25)'
                    : '1px solid var(--color-border)',
                  boxShadow: isTop
                    ? '0 4px 16px rgba(77, 171, 247, 0.1)'
                    : '0 1px 3px rgba(0, 0, 0, 0.06)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {isTop && (
                      <span
                        className="text-[9px] font-black px-2 py-0.5 rounded-md"
                        style={{
                          background: 'linear-gradient(135deg, #4dabf7, #339af0)',
                          color: '#fff',
                          boxShadow: '0 2px 6px rgba(77, 171, 247, 0.3)',
                        }}
                      >
                        TOP
                      </span>
                    )}
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: isTop
                          ? 'var(--color-accent)'
                          : 'var(--color-text-primary)',
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0"
                    style={{
                      background: 'rgba(64, 192, 87, 0.12)',
                      color: 'var(--color-success)',
                      border: '1px solid rgba(64, 192, 87, 0.2)',
                    }}
                  >
                    Added
                  </span>
                </div>
              </div>
              {(i < activeFrames.length - 1 || hasRemoved) && (
                <div className="flex justify-center py-1" style={{ color: 'var(--color-border)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <polyline points="19 12 12 19 5 12"/>
                  </svg>
                </div>
              )}
            </div>
          );
        })}

        {removedFrames.map((entry, i) => {
          const label = frameLabel(entry);
          const isLast = i === removedFrames.length - 1;

          return (
            <div key={`removed-${entry.id}-${i}`}>
              <div
                className="px-4 py-3 rounded-xl text-sm font-mono"
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  opacity: 0.45,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0"
                    style={{
                      background: 'rgba(255, 107, 107, 0.12)',
                      color: 'var(--color-error)',
                      border: '1px solid rgba(255, 107, 107, 0.2)',
                    }}
                  >
                    Removed
                  </span>
                </div>
              </div>
              {!isLast && (
                <div className="flex justify-center py-1" style={{ color: 'var(--color-border)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <polyline points="19 12 12 19 5 12"/>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
