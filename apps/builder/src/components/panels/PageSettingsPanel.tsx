/**
 * PageSettingsPanel — Phase 4.4
 *
 * Sections:
 *   1. Basic — title, slug, description
 *   2. SEO — canonical URL, noIndex
 *   3. Open Graph — og:title, og:description, og:image
 *   4. Favicon — URL input
 *   5. Custom CSS — <textarea> injected into published page <head>
 *   6. Custom JS  — <textarea> injected before </body> on published page
 *
 * All writes go through updatePageMeta → isDirty → autosave.
 */

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
    </div>
  );
}
