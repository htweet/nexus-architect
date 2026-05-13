/**
 * AuthWidget — "Smart Component" demonstration widget.
 *
 * This widget is the canonical example of a "fully wired" Nexus component.
 * It uses the useNexusContext() hook to switch behaviour based on render mode:
 *
 *   EDIT MODE   — Real HTML inputs are rendered and styled so the designer
 *                 can see exactly how the widget will look. However, the
 *                 Submit button is intercepted and a toast is shown instead
 *                 of making a real API call. An "EDIT MODE" badge is shown.
 *
 *   PREVIEW MODE — All inputs are fully interactive. The form submission
 *                  fires the configured auth provider's API (mocked here;
 *                  replace with real Supabase/Firebase SDK calls in prod).
 *
 * Config properties (all live-editable from the Right Panel):
 *   • provider     — 'supabase' | 'firebase' | 'custom'
 *   • title        — Heading shown above the form
 *   • submitLabel  — CTA button text
 *   • themeColor   — Accent colour for button + focus rings
 *   • showRegLink  — Toggle "Don't have an account? Register" link
 *   • showSocial   — Toggle Google / GitHub OAuth buttons
 *   • redirectUrl  — Where to navigate after successful login
 */

import { memo, useState, useCallback, type FormEvent } from 'react';
import { LogIn, Github, Mail, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useCanvasStore, useNexusContext } from '@nexus/core';
import { getVisualNodeStyles } from './shared';
import type { WidgetDefinition, WidgetRendererProps } from './registry';

// ─── Config interface ─────────────────────────────────────────────────────────

interface AuthWidgetConfig {
  provider:     'supabase' | 'firebase' | 'custom';
  title:        string;
  submitLabel:  string;
  themeColor:   string;
  showRegLink:  boolean;
  showSocial:   boolean;
  redirectUrl:  string;
}

const DEFAULTS: AuthWidgetConfig = {
  provider:    'supabase',
  title:       'Welcome back',
  submitLabel: 'Sign in',
  themeColor:  '#10b77f',
  showRegLink: true,
  showSocial:  true,
  redirectUrl: '/dashboard',
};

// ─── Renderer ─────────────────────────────────────────────────────────────────

const AuthWidgetRenderer = memo(function AuthWidgetRenderer({ nodeId, isPreview }: WidgetRendererProps) {
  const node           = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const { isEdit }     = useNexusContext();

  const [email,       setEmail]      = useState('');
  const [password,    setPassword]   = useState('');
  const [showPass,    setShowPass]   = useState(false);
  const [loading,     setLoading]    = useState(false);
  const [success,     setSuccess]    = useState(false);
  const [editToast,   setEditToast]  = useState(false);

  if (!node) return null;

  const c: AuthWidgetConfig = { ...DEFAULTS, ...(node.props as Partial<AuthWidgetConfig>) };
  const visualStyles = getVisualNodeStyles(node.styles?.base);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    // ── Edit-mode intercept ───────────────────────────────────────────────────
    if (isEdit) {
      setEditToast(true);
      setTimeout(() => setEditToast(false), 2800);
      return;
    }

    // ── Preview-mode: real (mocked) auth call ─────────────────────────────────
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400)); // replace with real SDK call
    setLoading(false);
    setSuccess(true);
    // In production: router.push(c.redirectUrl)
  }, [isEdit, c.redirectUrl]);

  const PROVIDER_LABEL: Record<AuthWidgetConfig['provider'], string> = {
    supabase: 'Supabase Auth',
    firebase: 'Firebase Auth',
    custom:   'Custom API',
  };

  if (success) {
    return (
      <div
        className="w-full rounded-xl p-8 flex flex-col items-center gap-4"
        style={{
          background: 'rgba(16,183,127,0.08)',
          border: `1px solid ${c.themeColor}33`,
          maxWidth: 420, margin: '0 auto',
          ...visualStyles,
        }}
      >
        <CheckCircle2 size={40} style={{ color: c.themeColor }} />
        <p className="text-base font-semibold" style={{ color: '#dde4dd' }}>Signed in successfully</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Redirecting to {c.redirectUrl}</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full rounded-xl flex flex-col gap-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.09)',
        padding: '32px',
        maxWidth: 420, margin: '0 auto',
        ...visualStyles,
      }}
    >
      {/* Edit-mode badge */}
      {isEdit && (
        <div
          className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest select-none"
          style={{ background: 'rgba(255,200,0,0.12)', color: '#f5c518', border: '1px solid rgba(245,197,24,0.20)' }}
        >
          Edit Mode
        </div>
      )}

      {/* Edit toast */}
      {editToast && (
        <div
          className="absolute inset-x-4 top-4 px-4 py-2.5 rounded-lg text-[12px] font-medium text-center z-10"
          style={{ background: '#1a2520', border: `1px solid ${c.themeColor}40`, color: c.themeColor }}
        >
          Form is interactive in Preview mode. Switch via the Preview button.
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-1">
          <LogIn size={16} style={{ color: c.themeColor }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {PROVIDER_LABEL[c.provider]}
          </span>
        </div>
        <h2 className="text-[22px] font-bold" style={{ color: '#dde4dd' }}>{c.title}</h2>
      </div>

      {/* Social login */}
      {c.showSocial && (
        <div className="flex gap-2">
          {[
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 0 1 0-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0 0 12.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/></svg>, label: 'Google' },
            { icon: <Github size={14} />, label: 'GitHub' },
          ].map(({ icon, label }) => (
            <button
              key={label}
              type="button"
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-[13px] font-medium transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: '#dde4dd' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onClick={isEdit ? () => { setEditToast(true); setTimeout(() => setEditToast(false), 2800); } : undefined}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Divider */}
      {c.showSocial && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required={!isEdit}
            className="h-10 rounded-lg px-3 text-[13px] outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid rgba(255,255,255,0.12)`,
              color: '#dde4dd',
              width: '100%',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = c.themeColor + '60'; e.currentTarget.style.boxShadow = `0 0 0 3px ${c.themeColor}15`; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Password
            </label>
            <button type="button" className="text-[11px] transition-colors" style={{ color: c.themeColor }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required={!isEdit}
              className="h-10 rounded-lg px-3 pr-10 text-[13px] outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid rgba(255,255,255,0.12)`,
                color: '#dde4dd',
                width: '100%',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = c.themeColor + '60'; e.currentTarget.style.boxShadow = `0 0 0 3px ${c.themeColor}15`; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onClick={() => setShowPass((v) => !v)}
            >
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="h-10 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          style={{
            background: `linear-gradient(135deg, ${c.themeColor}, ${c.themeColor}cc)`,
            color: '#fff',
            boxShadow: `0 4px 14px ${c.themeColor}40`,
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = '0.88'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={13} />}
          {loading ? 'Signing in…' : c.submitLabel}
        </button>
      </form>

      {/* Register link */}
      {c.showRegLink && (
        <p className="text-center text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Don&apos;t have an account?{' '}
          <button type="button" className="font-semibold transition-colors" style={{ color: c.themeColor }}>
            Create account
          </button>
        </p>
      )}
    </div>
  );
});

// ─── Inspector ────────────────────────────────────────────────────────────────

import { InspectorInput, InspectorSection } from './shared';
import type { WidgetInspectorProps } from './registry';

function AuthWidgetInspector({ nodeId }: WidgetInspectorProps) {
  const node          = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const updateNodeProps = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;

  const c = { ...DEFAULTS, ...(node.props as Partial<AuthWidgetConfig>) };
  const set = (key: keyof AuthWidgetConfig, value: unknown) =>
    updateNodeProps(nodeId, { ...node.props, [key]: value });

  return (
    <>
      <InspectorSection label="Identity" />
        <div className="flex flex-col gap-3 mt-2 mb-1">
        <InspectorInput
          label="Card Title"
          value={c.title}
          onChange={(v) => set('title', v)}
        />
        <InspectorInput
          label="Button Label"
          value={c.submitLabel}
          onChange={(v) => set('submitLabel', v)}
        />
        <InspectorInput
          label="Redirect URL"
          value={c.redirectUrl}
          onChange={(v) => set('redirectUrl', v)}
        />
        </div>

      <InspectorSection label="Provider" />
        <div className="flex flex-col gap-3 mt-2 mb-1">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.40)' }}>
            Auth Provider
          </label>
          <select
            value={c.provider}
            onChange={(e) => set('provider', e.target.value)}
            className="h-8 rounded px-2 text-[12px]"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#dde4dd' }}
          >
            <option value="supabase">Supabase Auth</option>
            <option value="firebase">Firebase Auth</option>
            <option value="custom">Custom API</option>
          </select>
        </div>
        <InspectorInput
          label="Theme Color"
          type="color"
          value={c.themeColor}
          onChange={(v) => set('themeColor', v)}
        />
        </div>

      <InspectorSection label="Options" />
        <div className="flex flex-col gap-3 mt-2 mb-1">
        {(
          [
            { key: 'showRegLink', label: 'Show Registration Link' },
            { key: 'showSocial',  label: 'Show Social Login Buttons' },
          ] as const
        ).map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-0.5">
            <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.60)' }}>{label}</span>
            <button
              onClick={() => set(key, !c[key])}
              className="relative w-8 h-4 rounded-full transition-colors"
              style={{ background: c[key] ? '#10b77f' : 'rgba(255,255,255,0.15)' }}
            >
              <span
                className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
                style={{ transform: c[key] ? 'translateX(17px)' : 'translateX(2px)' }}
              />
            </button>
          </div>
        ))}
        </div>
    </>
  );
}

// ─── Widget Definition ────────────────────────────────────────────────────────

import { KeyRound } from 'lucide-react';

export const AuthWidget: WidgetDefinition = {
  type:         'auth',
  label:        'Auth / Login',
  icon:         KeyRound,
  category:     'interactive',
  isPremium:    false,
  keywords:     ['login', 'auth', 'sign in', 'form', 'supabase', 'firebase'],
  defaultProps: { ...DEFAULTS },
  Renderer:     AuthWidgetRenderer,
  Inspector:    AuthWidgetInspector,
};
