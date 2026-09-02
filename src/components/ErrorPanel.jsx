export default function ErrorPanel({ error }) {
  if (!error) return null;

  return (
    <div className="p-4">
      <div
        className="rounded-xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.08), rgba(255, 107, 107, 0.03))',
          border: '1px solid rgba(255, 107, 107, 0.25)',
          boxShadow: '0 4px 16px rgba(255, 107, 107, 0.08)',
        }}
      >
        <div className="flex items-center gap-2.5 mb-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: 'rgba(255, 107, 107, 0.15)',
              border: '1px solid rgba(255, 107, 107, 0.2)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--color-error)">
              <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-3.25a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
            </svg>
          </div>
          <span className="text-sm font-black" style={{ color: 'var(--color-error)' }}>
            Execution Error
          </span>
        </div>
        {error.line > 0 && (
          <p className="text-xs mb-1.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Line {error.line}
          </p>
        )}
        <p className="text-sm font-mono leading-relaxed font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {error.message}
        </p>
      </div>
    </div>
  );
}
