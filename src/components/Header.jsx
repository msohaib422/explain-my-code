import ThemeToggle from './ThemeToggle';
import SaveCodeButton from './SaveCodeButton';
import ClearButton from './ClearButton';

export default function Header({ onRun, theme, onThemeChange, code, onClear }) {
  return (
    <header
      className="flex items-center justify-between px-4 py-2 shrink-0"
      style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: theme === 'dark' ? 'linear-gradient(135deg, var(--color-accent), #a371f7)' : 'linear-gradient(135deg, #0969da, #8250df)', color: '#000' }}
          >
            {'</>'}
          </div>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              ExplainMyCode
            </h1>
            <p className="text-[0.625rem]" style={{ color: 'var(--color-text-secondary)' }}>
              Visual Code Execution Animator
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle theme={theme} onToggle={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')} />
        <SaveCodeButton code={code} />
        <ClearButton onClear={onClear} />
        <button
          onClick={onRun}
          className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium hover:brightness-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #238636, #2ea043)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(35, 134, 54, 0.3)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z"/>
            <path d="M6.271 4.317l4.2 2.8a.5.5 0 0 1 0 .833l-4.2 2.8A.5.5 0 0 1 5.7 10.8V5.2a.5.5 0 0 1 .571-.483z"/>
          </svg>
          Run &amp; Visualize
        </button>
      </div>
    </header>
  );
}
