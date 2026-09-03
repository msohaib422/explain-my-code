import { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';

const EDITOR_DARK_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'ff7b72' },
    { token: 'string', foreground: 'a5d6ff' },
    { token: 'number', foreground: '79c0ff' },
    { token: 'type', foreground: 'ffa657' },
    { token: 'function', foreground: 'd2a8ff' },
    { token: 'variable', foreground: 'ffa657' },
  ],
  colors: {
    'editor.background': '#0d1117',
    'editor.foreground': '#e6edf3',
    'editorLineNumber.foreground': '#484f58',
    'editorLineNumber.activeForeground': '#58a6ff',
    'editor.lineHighlightBackground': '#161b2280',
    'editor.selectionBackground': '#264f7860',
    'editorCursor.foreground': '#58a6ff',
    'editorIndentGuide.background': '#21262d',
    'editorIndentGuide.activeBackground': '#30363d',
  },
};

const EDITOR_LIGHT_THEME = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'cf222e' },
    { token: 'string', foreground: '0a3069' },
    { token: 'number', foreground: '0550ae' },
    { token: 'type', foreground: '953800' },
    { token: 'function', foreground: '8250df' },
    { token: 'variable', foreground: '953800' },
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#1f2328',
    'editorLineNumber.foreground': '#8c959f',
    'editorLineNumber.activeForeground': '#0969da',
    'editor.lineHighlightBackground': '#f6f8fa80',
    'editor.selectionBackground': '#0969da30',
    'editorCursor.foreground': '#0969da',
    'editorIndentGuide.background': '#eaeef2',
    'editorIndentGuide.activeBackground': '#d0d7de',
  },
};

const EDITOR_OPTIONS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  lineHeight: 22,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  padding: { top: 12, bottom: 12 },
  renderLineHighlight: 'all',
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on',
};

export default function CodeEditor({ code, onChange, activeLine, theme }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationRef = useRef([]);
  const [isReady, setIsReady] = useState(false);

  function handleBeforeMount(monaco) {
    monaco.editor.defineTheme('explainDark', EDITOR_DARK_THEME);
    monaco.editor.defineTheme('explainLight', EDITOR_LIGHT_THEME);
  }

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsReady(true);
  }

  useEffect(() => {
    if (!monacoRef.current || !isReady) return;
    monacoRef.current.editor.setTheme(theme === 'dark' ? 'explainDark' : 'explainLight');
  }, [theme, isReady]);

  useEffect(() => {
    if (!editorRef.current || !isReady) return;

    const line = activeLine;
    const newDecorations = line > 0 ? [{
      range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1000 },
      options: {
        isWholeLine: true,
        className: 'active-line-highlight',
        overviewRuler: { color: '#58a6ff', position: 2 },
        gutterClassName: 'active-line-gutter',
      }
    }] : [];

    decorationRef.current = editorRef.current.deltaDecorations(
      decorationRef.current,
      newDecorations
    );
  }, [activeLine, isReady]);

  return (
    <div className="h-full w-full relative" style={{ background: theme === 'dark' ? '#0d1117' : '#ffffff' }}>
      <style>{`
        .active-line-highlight {
          background: var(--color-line-highlight) !important;
          border-left: 3px solid var(--color-accent) !important;
        }
        .active-line-gutter {
          background: var(--color-line-highlight) !important;
          color: var(--color-accent) !important;
        }
      `}</style>
      <Editor
        height="100%"
        defaultLanguage="javascript"
        value={code}
        theme={theme === 'dark' ? 'explainDark' : 'explainLight'}
        beforeMount={handleBeforeMount}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorDidMount}
        options={EDITOR_OPTIONS}
        loading={
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-secondary)' }}>
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
