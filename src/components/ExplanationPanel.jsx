import { useEffect, useRef, useMemo } from 'react';

const TYPE_COLORS = {
  variable: { bg: 'rgba(63, 185, 80, 0.1)', border: 'rgba(63, 185, 80, 0.3)', dot: '#3fb950', label: 'Variable' },
  assignment: { bg: 'rgba(88, 166, 255, 0.1)', border: 'rgba(88, 166, 255, 0.3)', dot: '#58a6ff', label: 'Assignment' },
  condition: { bg: 'rgba(210, 153, 34, 0.1)', border: 'rgba(210, 153, 34, 0.3)', dot: '#d29922', label: 'Condition' },
  loop: { bg: 'rgba(210, 153, 34, 0.1)', border: 'rgba(210, 153, 34, 0.3)', dot: '#d29922', label: 'Loop' },
  'function-decl': { bg: 'rgba(163, 113, 247, 0.1)', border: 'rgba(163, 113, 247, 0.3)', dot: '#a371f7', label: 'Function' },
  'function-call': { bg: 'rgba(163, 113, 247, 0.1)', border: 'rgba(163, 113, 247, 0.3)', dot: '#a371f7', label: 'Call' },
  return: { bg: 'rgba(248, 133, 73, 0.1)', border: 'rgba(248, 133, 73, 0.3)', dot: '#f88549', label: 'Return' },
  console: { bg: 'rgba(136, 136, 136, 0.1)', border: 'rgba(136, 136, 136, 0.3)', dot: '#8b949e', label: 'Console' },
  class: { bg: 'rgba(163, 113, 247, 0.1)', border: 'rgba(163, 113, 247, 0.3)', dot: '#a371f7', label: 'Class' },
  completed: { bg: 'rgba(63, 185, 80, 0.15)', border: 'rgba(63, 185, 80, 0.4)', dot: '#3fb950', label: 'Done' },
  statement: { bg: 'var(--color-bg-tertiary)', border: 'var(--color-border)', dot: 'var(--color-text-secondary)', label: '' },
};

function ExplanationEntry({ entry, isActive, stepNum, isLast }) {
  if (!entry) return null;
  const colors = TYPE_COLORS[entry.type] || TYPE_COLORS.statement;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', position: 'relative' }}>
      {/* Timeline column */}
      <div
        style={{
          width: '28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {/* Dot / commit node */}
        <div
          style={{
            width: isActive ? '12px' : '10px',
            height: isActive ? '12px' : '10px',
            borderRadius: '50%',
            background: isActive ? colors.dot : 'var(--color-bg-primary)',
            border: isActive
              ? `2px solid ${colors.dot}`
              : `2px solid ${colors.border || 'var(--color-border)'}`,
            flexShrink: 0,
            marginTop: '4px',
            zIndex: 1,
            boxShadow: isActive ? `0 0 0 3px ${colors.bg}` : 'none',
            transition: 'all 0.2s ease',
          }}
        />
        {/* Vertical connecting line */}
        {!isLast && (
          <div
            style={{
              width: '2px',
              flex: 1,
              minHeight: '8px',
              background: 'var(--color-border)',
              opacity: 0.5,
            }}
          />
        )}
      </div>

      {/* Jiggly arrow connector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          paddingTop: '5px',
          width: '14px',
          flexShrink: 0,
        }}
      >
        <div
          className={isActive ? 'animate-jiggle-arrow' : ''}
          style={{
            height: '2px',
            width: '14px',
            background: colors.dot,
            borderRadius: '1px',
            position: 'relative',
            opacity: isActive ? undefined : 0,
          }}
        >
          {/* Arrow head */}
          <div
            style={{
              position: 'absolute',
              right: '-1px',
              top: '-3px',
              width: 0,
              height: 0,
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent',
              borderLeft: `6px solid ${colors.dot}`,
            }}
          />
        </div>
      </div>

      {/* Content column */}
      <div
        style={{
          flex: 1,
          padding: '0 0.5rem 1rem 0.375rem',
          minWidth: 0,
        }}
      >
        {/* Header row: Step badge + Type label + Line number */}
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded"
            style={{
              background: isActive ? colors.dot : 'var(--color-bg-tertiary)',
              color: isActive ? '#000' : 'var(--color-text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            Step {stepNum + 1}
          </span>
          {colors.label && (
            <span
              className="text-[0.5625rem] px-1 py-0.5 rounded"
              style={{
                background: colors.bg,
                color: 'var(--color-text-secondary)',
                border: `1px solid ${colors.border}`,
              }}
            >
              {colors.label}
            </span>
          )}
          {entry.lineNumber > 0 && (
            <span
              className="text-[0.5625rem] font-mono"
              style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}
            >
              L{entry.lineNumber}
            </span>
          )}
        </div>

        {/* Source code line */}
        {entry.sourceLine && entry.sourceLine.trim() && (
          <div
            className="font-mono text-[0.6875rem] px-2 py-1 rounded mb-1"
            style={{
              background: 'var(--color-bg-primary)',
              color: 'var(--color-text-primary)',
              borderLeft: `2px solid ${colors.border}`,
            }}
          >
            {entry.sourceLine.trim()}
          </div>
        )}

        {/* Explanation text */}
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {entry.explanation}
        </p>
      </div>
    </div>
  );
}

export default function ExplanationPanel({ explanations, currentStep }) {
  const containerRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const el = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      if (elRect.bottom > containerRect.bottom - 20 || elRect.top < containerRect.top) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentStep, explanations]);

  const visibleEntries = useMemo(() => {
    if (!explanations) return [];
    const entries = explanations.slice(0, currentStep + 1);
    const deduped = [];
    for (let idx = 0; idx < entries.length; idx++) {
      const entry = entries[idx];
      if (deduped.length > 0 && deduped[deduped.length - 1].explanation === entry.explanation) {
        continue;
      }
      deduped.push({ ...entry, originalIndex: idx });
    }
    return deduped;
  }, [explanations, currentStep]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-1 shrink-0">
        <h3
          className="text-[0.6875rem] uppercase tracking-wider font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Explanation
        </h3>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto px-3 pb-3"
        style={{ scrollBehavior: 'smooth' }}
      >
        {visibleEntries.length === 0 ? (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <p className="text-xs italic">
              Step through execution to see explanations
            </p>
          </div>
        ) : (
          <div>
            {visibleEntries.map((entry, i) => (
              <div
                key={i}
                ref={entry.originalIndex === currentStep ? activeRef : null}
              >
                <ExplanationEntry
                  entry={entry}
                  isActive={entry.originalIndex === currentStep}
                  stepNum={entry.originalIndex}
                  isLast={i === visibleEntries.length - 1}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
