import { useEffect, useRef } from 'react';

export default function ConsolePanel({ output }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="w-1 h-4 rounded-full" style={{ background: 'var(--color-accent)' }} />
        <h3
          className="text-[11px] uppercase tracking-wider font-bold"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Console Output
        </h3>
        {output.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
            {output.length}
          </span>
        )}
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-auto rounded-xl p-4 font-mono text-sm"
        style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          minHeight: '120px',
          maxHeight: '100%',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.08)',
        }}
      >
        {output.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs italic font-medium" style={{ color: 'var(--color-text-muted)' }}>
              No output yet
            </p>
          </div>
        ) : (
          output.map((line, i) => (
            <div
              key={i}
              className="py-1.5 animate-fade-in flex items-start gap-3"
              style={{
                borderBottom:
                  i < output.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
              }}
            >
              <span
                className="text-[10px] mt-0.5 shrink-0 select-none font-bold w-5 text-right"
                style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}
              >
                {i + 1}
              </span>
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{line}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
