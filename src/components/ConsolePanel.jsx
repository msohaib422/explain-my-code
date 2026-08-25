import { useEffect, useRef } from 'react';

export default function ConsolePanel({ output }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="p-3 flex flex-col h-full">
      <h3
        className="text-[11px] uppercase tracking-wider font-medium mb-3 shrink-0"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Console Output
      </h3>
      <div
        ref={containerRef}
        className="flex-1 overflow-auto rounded p-3 font-mono text-sm"
        style={{
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
          minHeight: '120px',
          maxHeight: '100%',
        }}
      >
        {output.length === 0 ? (
          <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>
            No output yet
          </p>
        ) : (
          output.map((line, i) => (
            <div
              key={i}
              className="py-0.5 animate-fade-in flex items-start gap-2"
              style={{
                borderBottom:
                  i < output.length - 1 ? '1px solid rgba(48, 54, 61, 0.5)' : 'none',
              }}
            >
              <span
                className="text-[10px] mt-1 shrink-0 select-none"
                style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}
              >
                {i + 1}
              </span>
              <span style={{ color: 'var(--color-text-primary)' }}>{line}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
