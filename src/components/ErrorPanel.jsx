export default function ErrorPanel({ error }) {
  if (!error) return null;

  return (
    <div className="p-4">
      <div
        className="rounded-lg p-4"
        style={{
          background: 'rgba(248, 81, 73, 0.1)',
          border: '1px solid rgba(248, 81, 73, 0.3)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--color-error)">
            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-3.25a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
          </svg>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-error)' }}>
            Execution Error
          </span>
        </div>
        {error.line > 0 && (
          <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Line {error.line}
          </p>
        )}
        <p className="text-sm font-mono" style={{ color: 'var(--color-text-primary)' }}>
          {error.message}
        </p>
      </div>
    </div>
  );
}
