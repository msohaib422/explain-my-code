import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { examples } from './examples';
import { generateTrace } from './engine/interpreter';
import { generateAllExplanations } from './engine/explainer';
import CodeEditor from './components/CodeEditor';
import ExecutionControls from './components/ExecutionControls';
import VariablesPanel from './components/VariablesPanel';
import CallStackPanel from './components/CallStackPanel';
import ConsolePanel from './components/ConsolePanel';
import ExplanationPanel from './components/ExplanationPanel';
import ErrorPanel from './components/ErrorPanel';
import ExampleSelector from './components/ExampleSelector';
import Header from './components/Header';

const DEFAULT_CODE = examples[0].code;

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [trace, setTrace] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [speed, setSpeed] = useState(500);
  const [activePanel, setActivePanel] = useState('variables');
  const [theme, setTheme] = useState('dark');
  const playRef = useRef(null);

  const currentState =
    trace && trace.steps[currentStep] ? trace.steps[currentStep] : null;
  const totalSteps = trace ? trace.steps.length : 0;

  const explanations = useMemo(() => {
    if (!trace || !trace.steps || trace.steps.length === 0) return [];
    return generateAllExplanations(code, trace);
  }, [trace, code]);

  const handleRun = useCallback(() => {
    setIsPlaying(false);
    if (playRef.current) clearInterval(playRef.current);
    setError(null);

    const result = generateTrace(code);
    if (result.error) {
      setError(result.error);
      setTrace(null);
      return;
    }

    setTrace(result);
    setCurrentStep(0);
    if (result.steps.length > 0) {
      setActivePanel('variables');
    }
  }, [code]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    if (playRef.current) clearInterval(playRef.current);
    setTrace(null);
    setCurrentStep(0);
    setError(null);
  }, []);

  const handleNext = useCallback(() => {
    if (!trace) return;
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [trace, totalSteps]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handlePlay = useCallback(() => {
    if (!trace) return;
    if (currentStep >= totalSteps - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(true);
  }, [trace, currentStep, totalSteps]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (isPlaying && trace) {
      playRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    }
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [isPlaying, trace, totalSteps, speed]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.target.closest('.monaco-editor')) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (isPlaying) handlePause();
          else handlePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'r':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleReset();
          }
          break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handlePlay, handlePause, handleNext, handlePrev, handleReset]);

  const handleCodeChange = useCallback((newCode) => {
    setCode(newCode);
    if (trace) {
      setIsPlaying(false);
      if (playRef.current) clearInterval(playRef.current);
      setTrace(null);
      setCurrentStep(0);
      setError(null);
    }
  }, [trace]);

  const handleLoadExample = useCallback(
    (example) => {
      setCode(example.code);
      handleReset();
    },
    [handleReset]
  );

  const handleClear = useCallback(() => {
    setIsPlaying(false);
    if (playRef.current) clearInterval(playRef.current);
    setCode('');
    setTrace(null);
    setCurrentStep(0);
    setError(null);
  }, []);

  const panelTabs = [
    { id: 'variables', label: 'Variables', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    )},
    { id: 'callstack', label: 'Call Stack', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="4" rx="1"/>
        <rect x="4" y="7" width="16" height="4" rx="1"/>
        <rect x="6" y="11" width="12" height="4" rx="1"/>
      </svg>
    )},
    { id: 'console', label: 'Console', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5"/>
        <line x1="12" y1="19" x2="20" y2="19"/>
      </svg>
    )},
    { id: 'explanation', label: 'Explain', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    )},
  ];

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg-primary)' }} data-theme={theme}>
      <Header onRun={handleRun} theme={theme} onThemeChange={setTheme} code={code} onClear={handleClear} />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden gap-0">
        {/* Left: Code Editor */}
        <div
          className="flex flex-col min-h-0"
          style={{ flex: '1 1 50%', minWidth: 0 }}
        >
          {/* Example Selector Bar */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto"
            style={{
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)',
            }}
          >
            <ExampleSelector examples={examples} onLoad={handleLoadExample} />
          </div>
          {/* Editor Area */}
          <div className="flex-1 min-h-0" style={{ background: 'var(--color-bg-primary)' }}>
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
              activeLine={currentState?.line}
              theme={theme}
            />
          </div>
        </div>

        {/* Divider */}
        <div
          className="hidden lg:block w-px shrink-0"
          style={{ background: 'var(--color-border)' }}
        />

        {/* Right: Visualization Panels */}
        <div
          className="flex flex-col min-h-0"
          style={{
            flex: '1 1 50%',
            minWidth: 0,
          }}
        >
          {/* Panel Tabs */}
          <div
            className="flex items-center gap-1 px-4 py-2.5"
            style={{
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)',
            }}
          >
            {panelTabs.map((tab) => {
              const isActive = activePanel === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(77, 171, 247, 0.12), rgba(151, 117, 250, 0.08))'
                      : 'transparent',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    border: isActive ? '1px solid rgba(77, 171, 247, 0.2)' : '1px solid transparent',
                    boxShadow: isActive ? '0 2px 8px rgba(77, 171, 247, 0.1)' : 'none',
                  }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.6 }}>{tab.icon}</span>
                  {tab.label}
                  {tab.id === 'console' && currentState && currentState.output.length > 0 && (
                    <span
                      className="ml-0.5 px-1.5 text-[9px] rounded-full font-bold"
                      style={{
                        background: 'var(--color-accent)',
                        color: '#fff',
                        boxShadow: '0 1px 4px rgba(77, 171, 247, 0.3)',
                      }}
                    >
                      {currentState.output.length}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Step info */}
            {currentState && (
              <div className="ml-auto flex items-center gap-2">
                <span
                  className="text-[10px] font-mono px-2 py-1 rounded-md font-medium"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  Line {currentState.line}
                </span>
                {currentState.status === 'completed' && (
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-md"
                    style={{
                      background: 'rgba(64, 192, 87, 0.15)',
                      color: 'var(--color-success)',
                      border: '1px solid rgba(64, 192, 87, 0.25)',
                    }}
                  >
                    Done
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Panel Content */}
          <div
            className="flex-1 min-h-0 overflow-auto"
            style={{ background: 'var(--color-bg-primary)' }}
          >
            {error && <ErrorPanel error={error} />}
            {activePanel === 'variables' && currentState && (
              <VariablesPanel
                variables={currentState.variables}
                loopInfo={currentState.loopInfo}
                functionCall={currentState.functionCall}
                info={currentState.info}
              />
            )}
            {activePanel === 'callstack' && currentState && (
              <CallStackPanel
                callStack={currentState.callStack}
                callStackHistory={currentState.callStackHistory}
              />
            )}
            {activePanel === 'console' && currentState && (
              <ConsolePanel
                output={currentState.output}
              />
            )}
            {activePanel === 'explanation' && currentState && (
              <ExplanationPanel
                explanations={explanations}
                currentStep={currentStep}
              />
            )}
            {!currentState && !error && (
              <div
                className="flex items-center justify-center h-full px-6"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <div className="text-center">
                  <div
                    className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center relative"
                    style={{
                      background: 'linear-gradient(135deg, rgba(77, 171, 247, 0.1), rgba(151, 117, 250, 0.1))',
                      border: '1px solid var(--color-border)',
                      boxShadow: '0 8px 32px rgba(77, 171, 247, 0.08)',
                    }}
                  >
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <div
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: 'var(--color-success)',
                        boxShadow: '0 2px 6px rgba(64, 192, 87, 0.3)',
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                    Ready to Visualize
                  </p>
                  <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                    Write code or load an example, then run it
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <kbd
                      className="px-2 py-1 rounded-md text-[10px] font-mono font-semibold"
                      style={{
                        background: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        boxShadow: '0 2px 0 var(--color-border)',
                      }}
                    >
                      Space
                    </kbd>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      to play/pause
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ExecutionControls
        isPlaying={isPlaying}
        currentStep={currentStep}
        totalSteps={totalSteps}
        speed={speed}
        onPlay={handlePlay}
        onPause={handlePause}
        onNext={handleNext}
        onPrev={handlePrev}
        onReset={handleReset}
        onSpeedChange={setSpeed}
        hasTrace={!!trace}
      />
    </div>
  );
}
