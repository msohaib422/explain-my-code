export default function ExampleSelector({ examples: exList, onLoad }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider font-bold mr-1" style={{ color: 'var(--color-text-muted)' }}>
        Examples:
      </span>
      {exList.map((ex, i) => (
        <button
          key={i}
          onClick={() => onLoad(ex)}
          className="px-3 py-1 text-[11px] rounded-lg transition-all duration-200 font-semibold"
          style={{
            background: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
          title={ex.description}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-elevated)';
            e.currentTarget.style.borderColor = 'var(--color-accent)';
            e.currentTarget.style.color = 'var(--color-accent)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {ex.name}
        </button>
      ))}
    </div>
  );
}
