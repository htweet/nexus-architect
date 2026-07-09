/**
 * PageSettingsPanel — Phase 4.4 + VAE Task 147 (PWA section)
 *
 * Sections:
 *   1. Basic — title, slug, description
 *   2. SEO — canonical URL, noIndex
 *   3. Open Graph — og:title, og:description, og:image
 *   4. Favicon — URL input
 *   5. Custom CSS — <textarea> injected into published page <head>
 *   6. Custom JS  — <textarea> injected before </body> on published page
 *   7. PWA & App — manifest, service worker, display mode, cache strategy
 *
 * All writes go through updatePageMeta/updatePWAConfig → isDirty → autosave.
 */

import { Smartphone } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { InspectorInput, InspectorTextarea, InspectorSection } from '@/widgets/shared';

// ─── Toggle (yes/no) ──────────────────────────────────────────────────────────

function BoolToggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="block text-[11px] font-bold uppercase tracking-[0.07em] text-[#bbcabf] leading-none">
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        className="flex items-center justify-between h-10 rounded-md px-3 transition-all duration-[140ms]"
        style={{
          background: value ? 'rgba(245,158,11,0.10)' : '#09100c',
          border: `1px solid ${value ? 'rgba(245,158,11,0.10)' : 'rgba(255,255,255,0.10)'}`,
        }}
      >
        <span className="text-[13px] font-medium" style={{ color: '#dde4dd' }}>
          {value ? 'Yes — hide from search engines' : 'No — allow indexing'}
        </span>
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: value ? '#fbbf24' : '#bbcabf' }}
        >
          {value ? 'ON' : 'OFF'}
        </span>
      </button>
      {hint && (
        <span className="text-[10px]" style={{ color: '#bbcabf' }}>
          {hint}
        </span>
      )}
    </div>
  );
}

// ─── Code editor (styled textarea) ───────────────────────────────────────────

function CodeEditor({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 6,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="block text-[11px] font-bold uppercase tracking-[0.07em] text-[#bbcabf] leading-none mb-1">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
        className="w-full rounded-md px-3 py-2.5 resize-y"
        style={{
          background: '#09100c',
          border: '1px solid rgba(255,255,255,0.10)',
          color: '#dde4dd',
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
          fontSize: '11px',
          lineHeight: '1.6',
          outline: 'none',
          transition: 'border-color 140ms, box-shadow 140ms',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#50dea3';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,183,127,0.15)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {hint && (
        <span className="text-[10px]" style={{ color: '#bbcabf' }}>
          {hint}
        </span>
      )}
    </div>
  );
}

// ─── Segmented control ────────────────────────────────────────────────────────

function Segmented<T extends string>({
  label, value, options, onChange, disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="block text-[10px] font-bold uppercase tracking-[0.06em] leading-none" style={{ color: '#7a8f7e' }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 2, opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              flex: 1, fontSize: 10, padding: '4px 0', borderRadius: 4, cursor: 'pointer',
              background: value === o.value ? 'rgba(16,183,127,0.15)' : 'rgba(255,255,255,0.05)',
              color: value === o.value ? '#10b77f' : '#bbcabf',
              border: `1px solid ${value === o.value ? 'rgba(16,183,127,0.30)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── PWA Section ──────────────────────────────────────────────────────────────

function PWASection() {
  const page          = useCanvasStore((s) => s.page);
  const updatePWAConfig = useCanvasStore((s) => s.updatePWAConfig);

  if (!page) return null;

  const pwa = page.pwaConfig ?? {
    enabled: false,
    appName: page.title,
    shortName: page.title.slice(0, 12),
    description: page.description ?? '',
    themeColor: '#10b77f',
    backgroundColor: '#0e1511',
    display: 'standalone' as const,
    startUrl: '/',
    orientation: 'any' as const,
    icon: null,
    cacheStrategy: {
      pages: 'network-first' as const,
      assets: 'cache-first' as const,
      images: 'cache-first' as const,
      api: 'network-only' as const,
    },
    offlinePage: null,
  };

  const disabled = !pwa.enabled;

  const labelStyle: React.CSSProperties = {
    fontSize: 10, color: '#7a8f7e', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)', borderRadius: 4,
    color: '#dde4dd', fontSize: 11, padding: '4px 8px', outline: 'none',
  };

  const selectStyle: React.CSSProperties = { ...inputStyle };

  return (
    <div style={{ opacity: 1 }}>
      {/* Master toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Smartphone size={13} strokeWidth={1.5} style={{ color: pwa.enabled ? '#10b77f' : '#4a5f4e' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#dde4dd' }}>PWA & App</span>
        </div>
        <button
          onClick={() => updatePWAConfig({ enabled: !pwa.enabled })}
          style={{
            fontSize: 10, padding: '3px 10px', borderRadius: 4, cursor: 'pointer',
            background: pwa.enabled ? 'rgba(16,183,127,0.15)' : 'rgba(255,255,255,0.06)',
            color: pwa.enabled ? '#10b77f' : '#bbcabf',
            border: `1px solid ${pwa.enabled ? 'rgba(16,183,127,0.30)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          {pwa.enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      <div style={{ opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? 'none' : 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* App Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={labelStyle}>App Name</span>
          <input
            value={pwa.appName}
            onChange={(e) => updatePWAConfig({ appName: e.target.value })}
            placeholder={page.title}
            style={inputStyle}
          />
        </div>

        {/* Short Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={labelStyle}>Short Name (max 12 chars)</span>
          <input
            value={pwa.shortName}
            onChange={(e) => updatePWAConfig({ shortName: e.target.value.slice(0, 12) })}
            placeholder="App"
            maxLength={12}
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={labelStyle}>Description</span>
          <input
            value={pwa.description}
            onChange={(e) => updatePWAConfig({ description: e.target.value })}
            placeholder="App description…"
            style={inputStyle}
          />
        </div>

        {/* Theme Color */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...labelStyle, flex: 1 }}>Theme Color</span>
          <input
            type="color"
            value={pwa.themeColor}
            onChange={(e) => updatePWAConfig({ themeColor: e.target.value })}
            style={{ width: 32, height: 24, border: 'none', background: 'none', cursor: 'pointer' }}
          />
          <input
            value={pwa.themeColor}
            onChange={(e) => updatePWAConfig({ themeColor: e.target.value })}
            placeholder="#10b77f"
            style={{ ...inputStyle, width: 80 }}
          />
        </div>

        {/* Display Mode */}
        <Segmented
          label="Display Mode"
          value={pwa.display}
          options={[
            { value: 'standalone', label: 'App' },
            { value: 'fullscreen', label: 'Full' },
            { value: 'minimal-ui', label: 'Minimal' },
            { value: 'browser',    label: 'Browser' },
          ]}
          onChange={(v) => updatePWAConfig({ display: v })}
        />

        {/* Orientation */}
        <Segmented
          label="Orientation"
          value={pwa.orientation}
          options={[
            { value: 'portrait',  label: 'Portrait'  },
            { value: 'landscape', label: 'Landscape' },
            { value: 'any',       label: 'Any'       },
          ]}
          onChange={(v) => updatePWAConfig({ orientation: v })}
        />

        {/* Cache Strategy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>Cache Strategy</span>
          {[
            { key: 'pages' as const,  label: 'Pages',  opts: ['network-first', 'cache-first', 'stale-while-revalidate'] },
            { key: 'assets' as const, label: 'Assets', opts: ['cache-first', 'network-first'] },
            { key: 'images' as const, label: 'Images', opts: ['cache-first', 'network-first'] },
            { key: 'api' as const,    label: 'API',    opts: ['network-only', 'network-first'] },
          ].map(({ key, label, opts }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: '#4a5f4e', width: 44, flexShrink: 0 }}>{label}</span>
              <select
                value={pwa.cacheStrategy[key]}
                onChange={(e) => updatePWAConfig({
                  cacheStrategy: { ...pwa.cacheStrategy, [key]: e.target.value },
                })}
                style={selectStyle}
              >
                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PageSettingsPanel() {
  const page           = useCanvasStore((s) => s.page);
  const updatePageMeta = useCanvasStore((s) => s.updatePageMeta);
  if (!page) return (
    <p className="text-sm text-center py-6" style={{ color: '#bbcabf' }}>
      No page loaded
    </p>
  );

  const seo = page.seoMeta ?? {};

  const setSeo = (updates: Partial<typeof seo>) =>
    updatePageMeta({ seoMeta: { ...seo, ...updates } });

  return (
    <div className="flex flex-col gap-3 px-3 pb-4">

      {/* ── Basic ── */}
      <InspectorSection label="Basic" />
      <InspectorInput
        label="Page Title"
        value={page.title}
        onChange={(v) => updatePageMeta({ title: v })}
        placeholder="My Page"
      />
      <InspectorInput
        label="Slug"
        value={page.slug}
        onChange={(v) => updatePageMeta({ slug: v })}
        placeholder="/my-page"
        hint="URL path for this page"
      />
      <InspectorTextarea
        label="Description"
        value={page.description ?? ''}
        onChange={(v) => updatePageMeta({ description: v })}
        placeholder="Short page description…"
        rows={2}
      />

      {/* ── SEO ── */}
      <InspectorSection label="SEO" />
      <InspectorInput
        label="Canonical URL"
        value={seo.canonicalUrl ?? ''}
        onChange={(v) => setSeo({ canonicalUrl: v })}
        placeholder="https://example.com/my-page"
        hint="Leave empty to use the default page URL"
      />
      <BoolToggle
        label="No Index"
        value={seo.noIndex ?? false}
        onChange={(v) => setSeo({ noIndex: v })}
        hint="Tells search engines not to index this page"
      />

      {/* ── Open Graph ── */}
      <InspectorSection label="Open Graph" />
      <InspectorInput
        label="OG Title"
        value={seo.ogTitle ?? ''}
        onChange={(v) => setSeo({ ogTitle: v })}
        placeholder={page.title}
        hint="Shown when shared on social media"
      />
      <InspectorTextarea
        label="OG Description"
        value={seo.ogDescription ?? ''}
        onChange={(v) => setSeo({ ogDescription: v })}
        placeholder="Description for social sharing…"
        rows={2}
      />
      <InspectorInput
        label="OG Image URL"
        value={seo.ogImage ?? ''}
        onChange={(v) => setSeo({ ogImage: v })}
        placeholder="https://…/og-image.png"
        hint="Recommended: 1200×630 px"
      />

      {/* ── Favicon ── */}
      <InspectorSection label="Favicon" />
      <InspectorInput
        label="Favicon URL"
        value={seo.favicon ?? ''}
        onChange={(v) => setSeo({ favicon: v })}
        placeholder="https://…/favicon.ico"
        hint=".ico, .png, or .svg"
      />

      {/* ── Custom CSS ── */}
      <InspectorSection label="Custom CSS" />
      <CodeEditor
        label="CSS"
        value={page.customCss ?? ''}
        onChange={(v) => updatePageMeta({ customCss: v })}
        placeholder={'/* injected into <head> on publish */\nbody { }'}
        hint="Injected inside a <style> tag in the page <head>"
        rows={7}
      />

      {/* ── Custom JS ── */}
      <InspectorSection label="Custom JavaScript" />
      <CodeEditor
        label="JavaScript"
        value={page.customJs ?? ''}
        onChange={(v) => updatePageMeta({ customJs: v })}
        placeholder={'// injected before </body> on publish\nconsole.log("Hello");'}
        hint="Injected inside a <script> tag before </body>"
        rows={7}
      />

      {/* ── PWA & App ── */}
      <InspectorSection label="PWA & App" />
      <PWASection />
    </div>
  );
}
