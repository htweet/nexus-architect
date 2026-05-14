/**
 * NexusAuthWidget — Login Form canvas widget
 *
 * This is the first widget registered via the NEW NexusWidget API.
 * It uses settingsSchema instead of a hand-written Inspector component.
 *
 * Schema controls:
 *   1. text   — Success Redirect URL
 *   2. select — Auth Provider (Supabase / Firebase / Custom)
 *   3. switch — Enable Registration Link
 *   4. color  — Button Color
 *   5. text   — Submit Button Label
 */

import { memo } from 'react';
import { LogIn } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { registerNexusWidget } from '@nexus/core';
import type { NexusWidget, NexusRendererProps } from '@nexus/core';

// ─── Default config ───────────────────────────────────────────────────────────

interface AuthConfig {
  redirectUrl:      string;
  authProvider:     'supabase' | 'firebase' | 'custom';
  enableRegLink:    boolean;
  buttonColor:      string;
  submitLabel:      string;
}

const DEFAULT_CONFIG: AuthConfig = {
  redirectUrl:   '/dashboard',
  authProvider:  'supabase',
  enableRegLink: true,
  buttonColor:   '#10b77f',
  submitLabel:   'Sign In',
};

// ─── Canvas Renderer ──────────────────────────────────────────────────────────

const AuthRenderer = memo(function AuthRenderer({ nodeId }: NexusRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  if (!node) return null;

  const c = { ...DEFAULT_CONFIG, ...(node.props as Partial<AuthConfig>) };

  const providerLabels: Record<AuthConfig['authProvider'], string> = {
    supabase: 'Supabase Auth',
    firebase: 'Firebase Auth',
    custom:   'Custom API',
  };

  return (
    <div
      className="w-full rounded-xl p-8 flex flex-col gap-5"
      style={{
        background:   'rgba(255,255,255,0.04)',
        border:       '1px solid rgba(255,255,255,0.10)',
        maxWidth:     '400px',
        margin:       '0 auto',
      }}
    >
      {/* Provider badge */}
      <div className="flex items-center gap-2">
        <LogIn size={18} strokeWidth={2} style={{ color: c.buttonColor }} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.40)' }}>
          {providerLabels[c.authProvider]}
        </span>
      </div>

      {/* Email field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.50)' }}>
          Email
        </label>
        <div
          className="h-11 rounded-lg px-3 flex items-center"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.20)' }}>your@email.com</span>
        </div>
      </div>

      {/* Password field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.50)' }}>
          Password
        </label>
        <div
          className="h-11 rounded-lg px-3 flex items-center"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.20)' }}>••••••••</span>
        </div>
      </div>

      {/* Submit button */}
      <button
        className="w-full h-11 rounded-lg font-bold text-[14px] transition-opacity duration-150"
        style={{
          background: c.buttonColor,
          color:      '#003824',
          border:     'none',
          cursor:     'default',
        }}
      >
        {c.submitLabel}
      </button>

      {/* Registration link */}
      {c.enableRegLink && (
        <p className="text-center text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Don't have an account?{' '}
          <span style={{ color: c.buttonColor, cursor: 'default', fontWeight: 700 }}>
            Create one
          </span>
        </p>
      )}

      {/* Redirect hint */}
      {c.redirectUrl && (
        <p className="text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.20)' }}>
          Redirects to: {c.redirectUrl}
        </p>
      )}
    </div>
  );
});

// ─── NexusWidget definition ───────────────────────────────────────────────────

const NexusAuthWidgetDef: NexusWidget = {
  type: 'nexus-auth',
  metadata: {
    label:       'Login Form',
    icon:        LogIn,
    category:    'form',
    description: 'Schema-driven auth form powered by the NexusWidget API.',
    keywords:    ['login', 'auth', 'form', 'sign in', 'supabase', 'firebase'],
  },
  defaultConfig: DEFAULT_CONFIG as unknown as Record<string, unknown>,
  component: AuthRenderer,
  settingsSchema: [
    {
      type:        'select',
      id:          'authProvider',
      label:       'Auth Provider',
      options: [
        { value: 'supabase', label: 'Supabase' },
        { value: 'firebase', label: 'Firebase' },
        { value: 'custom',   label: 'Custom API' },
      ],
    },
    {
      type:        'text',
      id:          'redirectUrl',
      label:       'Success Redirect URL',
      placeholder: '/dashboard',
      hint:        'Where to send the user after a successful login.',
      inputType:   'url',
    },
    {
      type:        'text',
      id:          'submitLabel',
      label:       'Button Label',
      placeholder: 'Sign In',
    },
    {
      type:        'color',
      id:          'buttonColor',
      label:       'Button Color',
    },
    {
      type:      'switch',
      id:        'enableRegLink',
      label:     'Registration Link',
      onLabel:   'Shown',
      offLabel:  'Hidden',
    },
  ],
};

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Registers the NexusAuthWidget in the new NexusWidget registry.
 * Also registers a compatibility shim in the legacy WidgetDefinition registry
 * so the canvas renderer can render it normally.
 */
export function registerNexusAuthWidget(): void {
  registerNexusWidget(NexusAuthWidgetDef);
}

export { NexusAuthWidgetDef };
