import ThemeToggle from './ThemeToggle';
import SaveCodeButton from './SaveCodeButton';
import ClearButton from './ClearButton';

export default function Header({ onRun, theme, onThemeChange, code, onClear }) {
  return (
    <header
      className="flex items-center justify-between px-6 py-3 shrink-0 glass"
      style={{ borderBottom: '1px solid var(--color-glass-border)' }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #4dabf7, #9775fa)',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(77, 171, 247, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ position: 'relative', zIndex: 1 }}>{'</>'}</div>
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold tracking-tight leading-tight" style={{ color: 'var(--color-text-primary)' }}>
              ExplainMyCode
            </h1>
            <p className="text-[10px] font-medium tracking-wide uppercase" style={{ color: 'var(--color-text-muted)' }}>
              Visual Code Execution Animator
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle theme={theme} onToggle={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')} />
        <SaveCodeButton code={code} />
        <ClearButton onClear={onClear} />
        <div className="w-px h-7 mx-1" style={{ background: 'var(--color-border)' }} />
        <button
          onClick={onRun}
          className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #2b8a3e, #40c057)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(43, 138, 62, 0.35), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z"/>
            <path d="M6.271 4.317l4.2 2.8a.5.5 0 0 1 0 .833l-4.2 2.8A.5.5 0 0 1 5.7 10.8V5.2a.5.5 0 0 1 .571-.483z"/>
          </svg>
          Run &amp; Visualize
        </button>
      </div>
    </header>
  );
}
