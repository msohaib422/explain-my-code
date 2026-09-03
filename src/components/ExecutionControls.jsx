const SPEEDS = [
  { label: '0.25x', value: 2000 },
  { label: '0.5x', value: 1000 },
  { label: '1x', value: 500 },
  { label: '2x', value: 250 },
  { label: '4x', value: 125 },
];

export default function ExecutionControls({
  isPlaying,
  currentStep,
  totalSteps,
  speed,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onReset,
  onSpeedChange,
  hasTrace,
}) {
  const progress = totalSteps > 0 ? (currentStep / (totalSteps - 1)) * 100 : 0;

  return (
    <div
      className="shrink-0 px-4 py-2 flex items-center gap-3"
      style={{ background: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-1">
        <ControlButton onClick={onPrev} disabled={!hasTrace || currentStep <= 0} title="Previous step (←)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.22 8.78a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1-1.06 1.06L8 5.06 4.28 8.78a.75.75 0 0 1-1.06 0z"/>
          </svg>
        </ControlButton>

        {isPlaying ? (
          <ControlButton onClick={onPause} primary title="Pause">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.75 3a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-1.5zm5 0a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-1.5z"/>
            </svg>
          </ControlButton>
        ) : (
          <ControlButton onClick={onPlay} disabled={!hasTrace} primary title="Play (Space)">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.271 4.317l4.2 2.8a.5.5 0 0 1 0 .833l-4.2 2.8A.5.5 0 0 1 5.7 10.8V5.2a.5.5 0 0 1 .571-.483z"/>
            </svg>
          </ControlButton>
        )}

        <ControlButton onClick={onNext} disabled={!hasTrace || currentStep >= totalSteps - 1} title="Next step (→)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.78 8.78a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 9.84a.75.75 0 0 1 1.06-1.06L8 12.44l3.72-3.72a.75.75 0 0 1 1.06 0z"/>
            </svg>
          </ControlButton>

        <ControlButton onClick={onReset} disabled={!hasTrace} title="Reset">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.001 7.001 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.501 5.501 0 0 0 8 2.5zM1.705 8.005a.75.75 0 0 1 .834.656 5.501 5.501 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.001 7.001 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834z"/>
          </svg>
        </ControlButton>
      </div>

      {hasTrace && (
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-tertiary)' }}>
            <div
              className="h-full rounded-full transition-[width] duration-150"
              style={{
                width: `${progress}%`,
                background: 'var(--color-accent)',
              }}
            />
          </div>
          <span className="text-xs whitespace-nowrap tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
            {totalSteps > 0 ? `${currentStep + 1} / ${totalSteps}` : '0 / 0'}
          </span>
        </div>
      )}

      <select
        value={speed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        className="text-xs px-2 py-1 rounded outline-none cursor-pointer"
        style={{
          background: 'var(--color-bg-tertiary)',
          color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        {SPEEDS.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}

function ControlButton({ children, onClick, disabled, primary, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded-md"
      style={{
        background: primary ? 'var(--color-accent)' : 'transparent',
        color: primary ? '#000' : disabled ? 'var(--color-border)' : 'var(--color-text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = primary ? 'var(--color-accent-hover)' : 'var(--color-bg-tertiary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = primary ? 'var(--color-accent)' : 'transparent';
        }
      }}
    >
      {children}
    </button>
  );
}
