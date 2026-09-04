import ThemeToggle from './ThemeToggle';
import SaveCodeButton from './SaveCodeButton';
import ClearButton from './ClearButton';

export default function Header({ onRun, theme, onThemeChange, code, onClear }) {
  return (
    <header
      className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 shrink-0 flex-wrap gap-2"
      style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold shrink-0"
            style={{ background: theme === 'dark' ? 'linear-gradient(135deg, var(--color-accent), #a371f7)' : 'linear-gradient(135deg, #0969da, #8250df)', color: '#000' }}
          >
            {'</>'}
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
              ExplainMyCode
            </h1>
            <p className="text-xs hidden sm:block" style={{ color: 'var(--color-text-secondary)' }}>
              Visual Code Execution
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-0.5 sm:shrink-0 ml-auto sm:ml-4 min-w-0">
        <ThemeToggle theme={theme} onToggle={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')} />
        <SaveCodeButton code={code} />
        <ClearButton onClear={onClear} />
        <button
          onClick={onRun}
          className="flex items-center gap-2 px-3 sm:px-5 py-2 rounded-md text-base font-medium hover:brightness-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #238636, #2ea043)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(35, 134, 54, 0.3)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z"/>
            <path d="M6.271 4.317l4.2 2.8a.5.5 0 0 1 0 .833l-4.2 2.8A.5.5 0 0 1 5.7 10.8V5.2a.5.5 0 0 1 .571-.483z"/>
          </svg>
          <span className="hidden sm:inline">Run &amp; Visualize</span>
          <span className="sm:hidden">Run</span>
        </button>
      </div>
    </header>
  );
}
