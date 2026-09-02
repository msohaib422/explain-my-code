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
      <div className="p-3">
        <h3
          className="text-[11px] uppercase tracking-wider font-medium mb-3"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Call Stack
        </h3>
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Stack is empty
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <h3
        className="text-[11px] uppercase tracking-wider font-medium mb-3"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Call Stack
      </h3>
      <div className="space-y-1">
        {activeFrames.map((frame, i) => {
          const isTop = i === 0;
          const key = `active-${typeof frame === 'string' ? frame : frame.name}-${i}`;
          const isAnimating = animating.has(typeof frame === 'string' ? frame : `${frame.name}`);
          const label = frameLabel(frame);

          return (
            <div
              key={key}
              className="transition-all duration-200"
              style={{
                opacity: isAnimating ? 0.5 : 1,
                transform: isAnimating ? 'scale(0.97)' : 'scale(1)',
              }}
            >
              <div
                className="px-3 py-2 rounded text-sm font-mono"
                style={{
                  background: isTop
                    ? 'rgba(88, 166, 255, 0.12)'
                    : 'var(--color-bg-tertiary)',
                  border: isTop
                    ? '1px solid rgba(88, 166, 255, 0.3)'
                    : '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isTop && (
                      <span
                        className="text-[9px] font-bold px-1 py-0.5 rounded"
                        style={{
                          background: 'var(--color-accent)',
                          color: '#000',
                        }}
                      >
                        TOP
                      </span>
                    )}
                    <span
                      className="text-xs"
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
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      background: 'rgba(63, 185, 80, 0.15)',
                      color: 'var(--color-success)',
                    }}
                  >
                    Added
                  </span>
                </div>
              </div>
              {(i < activeFrames.length - 1 || hasRemoved) && (
                <div
                  className="flex justify-center py-0.5"
                  style={{ color: 'var(--color-border)' }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 12L2 6h12z" />
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
                className="px-3 py-2 rounded text-sm font-mono"
                style={{
                  background: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  opacity: 0.5,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-xs"
                    style={{
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      background: 'rgba(248, 81, 73, 0.15)',
                      color: 'var(--color-error)',
                    }}
                  >
                    Removed
                  </span>
                </div>
              </div>
              {!isLast && (
                <div
                  className="flex justify-center py-0.5"
                  style={{ color: 'var(--color-border)' }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 12L2 6h12z" />
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
