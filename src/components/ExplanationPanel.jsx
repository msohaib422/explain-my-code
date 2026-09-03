import { useEffect, useRef, useMemo } from 'react';

const TYPE_COLORS = {
  variable: { bg: 'rgba(63, 185, 80, 0.1)', border: 'rgba(63, 185, 80, 0.3)', label: 'Variable' },
  assignment: { bg: 'rgba(88, 166, 255, 0.1)', border: 'rgba(88, 166, 255, 0.3)', label: 'Assignment' },
  condition: { bg: 'rgba(210, 153, 34, 0.1)', border: 'rgba(210, 153, 34, 0.3)', label: 'Condition' },
  loop: { bg: 'rgba(210, 153, 34, 0.1)', border: 'rgba(210, 153, 34, 0.3)', label: 'Loop' },
  'function-decl': { bg: 'rgba(163, 113, 247, 0.1)', border: 'rgba(163, 113, 247, 0.3)', label: 'Function' },
  'function-call': { bg: 'rgba(163, 113, 247, 0.1)', border: 'rgba(163, 113, 247, 0.3)', label: 'Call' },
  return: { bg: 'rgba(248, 133, 73, 0.1)', border: 'rgba(248, 133, 73, 0.3)', label: 'Return' },
  console: { bg: 'rgba(136, 136, 136, 0.1)', border: 'rgba(136, 136, 136, 0.3)', label: 'Console' },
  class: { bg: 'rgba(163, 113, 247, 0.1)', border: 'rgba(163, 113, 247, 0.3)', label: 'Class' },
  completed: { bg: 'rgba(63, 185, 80, 0.15)', border: 'rgba(63, 185, 80, 0.4)', label: 'Done' },
  statement: { bg: 'var(--color-bg-tertiary)', border: 'var(--color-border)', label: '' },
};

function ExplanationEntry({ entry, isActive, stepNum }) {
  if (!entry) return null;
  const colors = TYPE_COLORS[entry.type] || TYPE_COLORS.statement;

  return (
    <div
      className="animate-fade-in"
      style={{
        padding: '0.5rem 0.625rem',
        borderRadius: '0.375rem',
        background: isActive ? colors.bg : 'transparent',
        border: isActive ? `1px solid ${colors.border}` : '1px solid transparent',
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded"
          style={{
            background: isActive ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
            color: isActive ? '#000' : 'var(--color-text-secondary)',
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

      {entry.sourceLine && entry.sourceLine.trim() && (
        <div
          className="font-mono text-[0.6875rem] px-2 py-1 rounded mb-1.5"
          style={{
            background: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            borderLeft: `2px solid ${colors.border}`,
          }}
        >
          {entry.sourceLine.trim()}
        </div>
      )}

      <p
        className="text-xs leading-relaxed"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {entry.explanation}
      </p>
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
          <div className="space-y-1">
            {visibleEntries.map((entry, i) => (
              <div
                key={i}
                ref={entry.originalIndex === currentStep ? activeRef : null}
              >
                <ExplanationEntry
                  entry={entry}
                  isActive={entry.originalIndex === currentStep}
                  stepNum={entry.originalIndex}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
