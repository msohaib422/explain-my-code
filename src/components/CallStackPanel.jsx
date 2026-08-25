import { useEffect, useState, useRef } from 'react';

export default function CallStackPanel({ callStack, functionCall }) {
  const [prevStack, setPrevStack] = useState([]);
  const [animating, setAnimating] = useState(new Set());
  const timers = useRef({});

  useEffect(() => {
    const pushing = new Set();
    for (const name of callStack) {
      if (!prevStack.includes(name)) {
        pushing.add(name);
        if (timers.current[name]) clearTimeout(timers.current[name]);
        timers.current[name] = setTimeout(() => {
          setAnimating((s) => {
            const n = new Set(s);
            n.delete(name);
            return n;
          });
        }, 600);
      }
    }
    if (pushing.size > 0) setAnimating(pushing);
    setPrevStack([...callStack]);
  }, [callStack]);

  const reversedStack = [...callStack].reverse();

  return (
    <div className="p-3">
      <h3
        className="text-[11px] uppercase tracking-wider font-medium mb-3"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Call Stack
      </h3>
      {callStack.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Stack is empty
        </p>
      ) : (
        <div className="space-y-1">
          {reversedStack.map((frame, i) => {
            const isTop = i === 0;
            const isAnimating = animating.has(frame);
            const frameIndex = callStack.length - 1 - i;

            return (
              <div
                key={`${frame}-${frameIndex}`}
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
                      {frame}
                    </span>
                  </div>
                </div>
                {i < reversedStack.length - 1 && (
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
      )}
    </div>
  );
}
