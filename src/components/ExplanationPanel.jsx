import { useEffect, useRef, useMemo } from 'react';

const TYPE_COLORS = {
  variable: { bg: 'rgba(64, 192, 87, 0.08)', border: 'rgba(64, 192, 87, 0.25)', label: 'Variable', icon: '📦' },
  assignment: { bg: 'rgba(77, 171, 247, 0.08)', border: 'rgba(77, 171, 247, 0.25)', label: 'Assignment', icon: '✏️' },
  condition: { bg: 'rgba(250, 176, 5, 0.08)', border: 'rgba(250, 176, 5, 0.25)', label: 'Condition', icon: '🔀' },
  loop: { bg: 'rgba(250, 176, 5, 0.08)', border: 'rgba(250, 176, 5, 0.25)', label: 'Loop', icon: '🔄' },
  'function-decl': { bg: 'rgba(134, 114, 255, 0.08)', border: 'rgba(134, 114, 255, 0.25)', label: 'Function', icon: 'ƒ' },
  'function-call': { bg: 'rgba(134, 114, 255, 0.08)', border: 'rgba(134, 114, 255, 0.25)', label: 'Call', icon: '📞' },
  return: { bg: 'rgba(255, 146, 43, 0.08)', border: 'rgba(255, 146, 43, 0.25)', label: 'Return', icon: '↩️' },
  console: { bg: 'rgba(122, 139, 168, 0.08)', border: 'rgba(122, 139, 168, 0.25)', label: 'Console', icon: '💻' },
  class: { bg: 'rgba(134, 114, 255, 0.08)', border: 'rgba(134, 114, 255, 0.25)', label: 'Class', icon: '🏗️' },
  completed: { bg: 'rgba(64, 192, 87, 0.1)', border: 'rgba(64, 192, 87, 0.3)', label: 'Done', icon: '✅' },
  statement: { bg: 'var(--color-bg-tertiary)', border: 'var(--color-border)', label: '', icon: '📄' },
};

function ExplanationEntry({ entry, isActive, stepNum }) {
  if (!entry) return null;
  const colors = TYPE_COLORS[entry.type] || TYPE_COLORS.statement;

  return (
    <div
      className="animate-fade-in rounded-xl overflow-hidden"
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${colors.bg}, transparent)`
          : 'var(--color-bg-secondary)',
        border: isActive ? `1px solid ${colors.border}` : '1px solid var(--color-border)',
        boxShadow: isActive ? `0 4px 16px ${colors.bg}` : '0 1px 2px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-md"
            style={{
              background: isActive ? 'linear-gradient(135deg, #4dabf7, #339af0)' : 'var(--color-bg-tertiary)',
              color: isActive ? '#fff' : 'var(--color-text-muted)',
              boxShadow: isActive ? '0 2px 6px rgba(77, 171, 247, 0.3)' : 'none',
            }}
          >
            Step {stepNum + 1}
          </span>
          {colors.label && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-md font-bold"
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
              className="text-[10px] font-mono font-bold"
              style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}
            >
              L{entry.lineNumber}
            </span>
          )}
        </div>

        {entry.sourceLine && entry.sourceLine.trim() && (
          <div
            className="font-mono text-[11px] px-3 py-2 rounded-lg mb-2"
            style={{
              background: 'var(--color-bg-primary)',
              color: 'var(--color-text-primary)',
              borderLeft: `3px solid ${colors.border}`,
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            {entry.sourceLine.trim()}
          </div>
        )}

        <p
          className="text-xs leading-relaxed font-medium"
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
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: 'var(--color-accent)' }} />
          <h3
            className="text-[11px] uppercase tracking-wider font-bold"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Explanation
          </h3>
          {visibleEntries.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
              {visibleEntries.length}
            </span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto px-4 pb-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {visibleEntries.length === 0 ? (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <p className="text-xs italic font-medium">
              Step through execution to see explanations
            </p>
          </div>
        ) : (
          <div className="space-y-2">
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
