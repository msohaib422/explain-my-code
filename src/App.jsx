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
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });
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

  // Auto-play effect
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

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't intercept if user is typing in editor
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      // Don't intercept Monaco editor
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

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg-primary)' }}>
      <Header onRun={handleRun} theme={theme} onThemeChange={setTheme} code={code} onClear={handleClear} />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left: Code Editor */}
        <div
          className="flex flex-col min-h-0"
          style={{ flex: '1 1 50%', minWidth: 0 }}
        >
          <div
            className="flex items-center gap-2 px-3 py-1.5 overflow-x-auto"
            style={{
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)',
            }}
          >
            <ExampleSelector examples={examples} onLoad={handleLoadExample} />
          </div>
          <div className="flex-1 min-h-0">
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
              activeLine={currentState?.line}
              theme={theme}
            />
          </div>
        </div>

        {/* Right: Visualization Panels */}
        <div
          className="flex flex-col min-h-0"
          style={{
            flex: '1 1 50%',
            minWidth: 0,
            borderLeft: '1px solid var(--color-border)',
          }}
        >
          {/* Panel Tabs */}
          <div
            className="flex items-center gap-0.5 px-2 py-1"
            style={{
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)',
            }}
          >
            {['variables', 'callstack', 'console', 'explanation'].map((panel) => (
              <button
                key={panel}
                onClick={() => setActivePanel(panel)}
                className="px-3 py-1 text-xs font-medium rounded"
                style={{
                  background:
                    activePanel === panel ? 'var(--color-bg-tertiary)' : 'transparent',
                  color:
                    activePanel === panel
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-secondary)',
                }}
              >
                {panel === 'variables'
                  ? 'Variables'
                  : panel === 'callstack'
                    ? 'Call Stack'
                    : panel === 'console'
                      ? 'Console'
                      : 'Explain'}
                {panel === 'console' && currentState && currentState.output.length > 0 && (
                  <span
                    className="ml-1 px-1 text-[0.625rem] rounded"
                    style={{
                      background: 'var(--color-accent)',
                      color: '#000',
                    }}
                  >
                    {currentState.output.length}
                  </span>
                )}
              </button>
            ))}

            {/* Step info */}
            {currentState && (
              <div className="ml-auto flex items-center gap-2">
                <span
                  className="text-[0.625rem] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Line {currentState.line}
                </span>
                {currentState.status === 'completed' && (
                  <span
                    className="text-[0.625rem] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      background: 'rgba(63, 185, 80, 0.2)',
                      color: 'var(--color-success)',
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
            style={{ background: 'var(--color-bg-secondary)' }}
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
                className="flex items-center justify-center h-full"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <div className="text-center px-4">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--color-bg-tertiary)' }}
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium mb-1">
                    Click "Run &amp; Visualize" to start
                  </p>
                  <p className="text-xs opacity-60">
                    Or press Space after running
                  </p>
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
