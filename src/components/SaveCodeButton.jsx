import { useState } from 'react';

export default function SaveCodeButton({ code }) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setStatus(null);

    let result = null;

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'code.js',
          types: [
            {
              description: 'JavaScript files',
              accept: { 'application/javascript': ['.js'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(code);
        await writable.close();
        result = 'saved';
      } else {
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'code.js';
        a.click();
        URL.revokeObjectURL(url);
        result = 'downloaded';
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        result = 'error';
      }
    } finally {
      setSaving(false);
      setStatus(result);
      if (result && result !== 'error') {
        setTimeout(() => setStatus(null), 2000);
      }
    }
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className="w-8 h-8 flex items-center justify-center rounded-md transition-all"
      title={saving ? 'Saving...' : status === 'saved' ? 'Saved!' : status === 'downloaded' ? 'Downloaded!' : 'Save code as .js file'}
      style={{
        color: 'var(--color-text-secondary)',
        background: 'transparent',
        opacity: saving ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-bg-tertiary)';
        e.currentTarget.style.color = 'var(--color-text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--color-text-secondary)';
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </svg>
    </button>
  );
}
