/**
 * CanvasErrorBoundary — Phase 9.2
 *
 * Top-level error boundary wrapping the entire canvas rendering tree.
 * Catches catastrophic renderer failures that escape individual
 * WidgetErrorBoundary instances (e.g. a crash in NodeRenderer itself,
 * or an infinite loop caused by a corrupt node tree).
 *
 * Recovery flow:
 *   1. Log the error with full context.
 *   2. Show a recovery UI that lets the user:
 *      a. Reload the page (preserves auto-saved data).
 *      b. Clear the canvas (nuclear option — creates a new empty page).
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import { obs } from '@nexus/core';

// ── Props / State ─────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
  onClearCanvas?: () => void;
}

interface State {
  hasError:  boolean;
  error:     Error | null;
  errorInfo: ErrorInfo | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info });
    console.error('[NexusCanvas] FATAL canvas crash:', error, info.componentStack);
    obs.trackCanvasErrorBoundary(error);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClear = () => {
    this.props.onClearCanvas?.();
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  override render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message ?? 'Unknown error';

    return (
      <div
        data-testid="canvas-error-boundary"
        role="alert"
        style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          height:         '100%',
          minHeight:      400,
          padding:        32,
          gap:            24,
          background:     '#09100c',
          color:          '#dde4dd',
        }}
      >
        {/* Icon */}
        <div style={{
          width:         64,
          height:        64,
          borderRadius:  16,
          background:    'rgba(239,68,68,0.10)',
          border:        '1px solid rgba(239,68,68,0.25)',
          display:       'flex',
          alignItems:    'center',
          justifyContent: 'center',
          boxShadow:     '0 0 32px rgba(239,68,68,0.12)',
        }}>
          <AlertTriangle size={28} style={{ color: '#f87171' }} />
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: '#f1f5f1' }}>
            Canvas renderer crashed
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#9ca89e', lineHeight: 1.6 }}>
            An unexpected error occurred while rendering the page. Your content is safe
            and has been auto-saved. You can reload to recover.
          </p>
        </div>

        {/* Error details (collapsed) */}
        <details style={{ width: '100%', maxWidth: 480 }}>
          <summary style={{
            cursor:   'pointer',
            fontSize: 11,
            color:    '#6b7b6f',
            padding:  '4px 8px',
            fontFamily: 'monospace',
          }}>
            Error details
          </summary>
          <pre style={{
            marginTop:   8,
            padding:     12,
            borderRadius: 6,
            background:  'rgba(239,68,68,0.06)',
            border:      '1px solid rgba(239,68,68,0.15)',
            fontSize:    10,
            color:       '#fca5a5',
            overflowX:   'auto',
            whiteSpace:  'pre-wrap',
            wordBreak:   'break-all',
          }}>
            {message}
          </pre>
        </details>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={this.handleReload}
            style={{
              display:     'flex',
              alignItems:  'center',
              gap:         6,
              padding:     '9px 18px',
              borderRadius: 8,
              background:  '#10b77f',
              border:      'none',
              color:       '#fff',
              fontSize:    13,
              fontWeight:  600,
              cursor:      'pointer',
            }}
          >
            <RotateCcw size={13} />
            Reload builder
          </button>

          {this.props.onClearCanvas && (
            <button
              onClick={this.handleClear}
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:         6,
                padding:     '9px 18px',
                borderRadius: 8,
                background:  'rgba(239,68,68,0.15)',
                border:      '1px solid rgba(239,68,68,0.25)',
                color:       '#fca5a5',
                fontSize:    13,
                fontWeight:  500,
                cursor:      'pointer',
              }}
            >
              <Trash2 size={13} />
              Clear canvas
            </button>
          )}
        </div>
      </div>
    );
  }
}
