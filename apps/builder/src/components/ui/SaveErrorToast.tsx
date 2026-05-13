/**
 * SaveErrorToast — Non-intrusive save failure notification.
 *
 * Blueprint Phase 2.4: "If the sync fails, the error is surfaced
 * non-intrusively without reverting the user's work."
 *
 * Renders a dismissible banner fixed at the bottom-centre of the screen
 * when saveError !== null. Auto-dismisses after 8 seconds.
 * Clears the error from the store on dismiss.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { useAdapter } from '@/contexts/AdapterContext';

const AUTO_DISMISS_MS = 8000;

export function SaveErrorToast() {
  const saveError  = useCanvasStore((s) => s.saveError);
  const setSaveError = useCanvasStore((s) => s.setSaveError);
  const setSaving  = useCanvasStore((s) => s.setSaving);
  const markSaved  = useCanvasStore((s) => s.markSaved);
  const adapter    = useAdapter();

  // Auto-dismiss after 8s
  useEffect(() => {
    if (!saveError) return;
    const t = setTimeout(() => setSaveError(null), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [saveError, setSaveError]);

  if (!saveError) return null;

  const handleRetry = async () => {
    const { page } = useCanvasStore.getState();
    if (!page) return;
    setSaveError(null);
    setSaving(true);
    try {
      await adapter.data.updatePage(page.id, page);
      markSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed. Please try again.';
      setSaveError(msg);
    }
  };

  return createPortal(
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position:   'fixed',
        bottom:     '24px',
        left:       '50%',
        transform:  'translateX(-50%)',
        zIndex:     99999,
        display:    'flex',
        alignItems: 'center',
        gap:        '10px',
        padding:    '10px 16px',
        borderRadius: '10px',
        background: 'rgba(147,0,10,0.30)',
        border:     '1px solid rgba(255,59,48,0.40))',
        boxShadow:  '0 4px 24px rgba(0,0,0,0.5)',
        maxWidth:   '480px',
        whiteSpace: 'nowrap',
      }}
    >
      <AlertTriangle
        size={15}
        strokeWidth={2}
        style={{ color: '#ffb4ab', flexShrink: 0 }}
      />
      <span
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: '#ffb4ab',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '280px',
        }}
      >
        {saveError}
      </span>
      <button
        onClick={handleRetry}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '4px',
          fontSize:   '12px',
          fontWeight: 700,
          padding:    '4px 10px',
          borderRadius: '6px',
          border:     '1px solid rgba(255,59,48,0.40))',
          background: 'transparent',
          color:      '#ffb4ab',
          cursor:     'pointer',
          flexShrink: 0,
        }}
      >
        <RefreshCw size={11} strokeWidth={2.5} />
        Retry
      </button>
      <button
        onClick={() => setSaveError(null)}
        aria-label="Dismiss"
        style={{
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width:      '20px',
          height:     '20px',
          borderRadius: '4px',
          border:     'none',
          background: 'transparent',
          color:      '#bbcabf',
          cursor:     'pointer',
          flexShrink: 0,
          padding:    0,
        }}
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>,
    document.body,
  );
}
