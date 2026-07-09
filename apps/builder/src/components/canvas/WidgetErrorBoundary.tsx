/**
 * WidgetErrorBoundary — Phase 9.2
 *
 * Class-based React Error Boundary that wraps each individual widget
 * renderer on the canvas. Catches crashes without bringing down the
 * entire page tree.
 *
 * Behaviour:
 *   - In edit mode:  renders a compact error card with the node type + error.
 *   - In preview:    renders nothing (invisible to end-visitors).
 *   - Always logs:   console.error + (future) Sentry.captureException().
 *
 * Architecture note:
 *   React hooks cannot be used in class components. This is intentional —
 *   Error Boundaries MUST be class components per the React spec.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { obs } from '@nexus/core';

// ── Props / State ─────────────────────────────────────────────────────────────

interface Props {
  nodeId:    string;
  nodeType:  string;
  isPreview: boolean;
  children:  ReactNode;
}

interface State {
  hasError: boolean;
  error:    Error | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    const { nodeId, nodeType } = this.props;
    console.error(
      `[NexusCanvas] Widget crash: type="${nodeType}" id="${nodeId}"`,
      error,
      info.componentStack,
    );
    obs.trackWidgetErrorBoundary(nodeId, nodeType, error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (!this.state.hasError) return this.props.children;

    // Preview mode: invisible — never expose internal errors to site visitors
    if (this.props.isPreview) return null;

    // Edit mode: recoverable error card
    const message = this.state.error?.message ?? 'Unknown render error';

    return (
      <div
        data-testid="widget-error-boundary"
        role="alert"
        style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           8,
          padding:       '12px 14px',
          borderRadius:  6,
          background:    'rgba(239,68,68,0.08)',
          border:        '1px solid rgba(239,68,68,0.25)',
          color:         '#fca5a5',
          fontFamily:    'ui-monospace, "JetBrains Mono", monospace',
          fontSize:      11,
          lineHeight:    1.5,
          userSelect:    'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <AlertTriangle size={12} style={{ flexShrink: 0, color: '#f87171' }} />
          <span>{this.props.nodeType} widget crashed</span>
        </div>

        <p style={{ margin: 0, opacity: 0.75, fontSize: 10, wordBreak: 'break-word' }}>
          {message.slice(0, 120)}
        </p>

        <button
          onClick={this.handleReset}
          style={{
            alignSelf:     'flex-start',
            display:       'flex',
            alignItems:    'center',
            gap:           4,
            padding:       '3px 8px',
            borderRadius:  4,
            background:    'rgba(239,68,68,0.15)',
            border:        '1px solid rgba(239,68,68,0.30)',
            color:         '#fca5a5',
            fontSize:      10,
            fontWeight:    500,
            cursor:        'pointer',
          }}
        >
          <RefreshCw size={9} />
          Retry
        </button>
      </div>
    );
  }
}
