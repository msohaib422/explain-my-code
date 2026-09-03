import { examples } from '../examples';

export default function ExampleSelector({ examples: exList, onLoad }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[0.625rem] uppercase tracking-wider font-medium mr-1" style={{ color: 'var(--color-text-secondary)' }}>
        Examples:
      </span>
      {exList.map((ex, i) => (
        <button
          key={i}
          onClick={() => onLoad(ex)}
          className="px-2 py-0.5 text-[0.6875rem] rounded hover:brightness-125"
          style={{
            background: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
          title={ex.description}
        >
          {ex.name}
        </button>
      ))}
    </div>
  );
}
