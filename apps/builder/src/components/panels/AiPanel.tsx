/**
 * AiPanel — Phase 7 AI Copilot.
 *
 * Layout: accordion sections (multiple open allowed) — Generate expanded by default.
 * Sections: Generate · Populate · Styles · Advisor
 */

import { useState, useEffect, useCallback } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import {
  Sparkles, FileText, Palette, Gauge,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2,
  Loader2, Key, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAdapter } from '@/contexts/AdapterContext';
import {
  useAiStore, useCanvasStore,
  selectAiReady, selectAiNeedsSetup,
  selectIsGenerating, selectIsPopulating,
  selectGenerateError, selectUsagePercent, selectUsageAtLimit,
  createPage,
  type NexusPage,
} from '@nexus/core';

// ─── Elevated card wrapper ────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg p-3 ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {children}
    </div>
  );
}

// ─── Primary CTA button ───────────────────────────────────────────────────────
function PrimaryBtn({
  onClick, disabled, loading, loadingLabel, label, icon: Icon,
  'data-testid': testId,
}: {
  onClick: () => void; disabled?: boolean; loading?: boolean;
  loadingLabel: string; label: string; icon: typeof Sparkles;
  'data-testid'?: string;
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      disabled={disabled ?? loading}
      className="w-full py-2.5 rounded-md text-[13px] font-semibold flex items-center justify-center gap-2 transition-all duration-100 disabled:opacity-40"
      style={{ background: '#10b77f', color: '#ffffff' }}
      onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#0da870'; }}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#10b77f')}
    >
      {loading
        ? <><Loader2 size={13} className="animate-spin" />{loadingLabel}</>
        : <><Icon size={13} />{label}</>}
    </button>
  );
}

// ─── Accordion section header ─────────────────────────────────────────────────
function AiAccordionItem({
  id, label, icon: Icon, children,
}: {
  id: string;
  label: string;
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <Accordion.Item value={id} className="border-b border-white/[0.06]">
      <Accordion.Trigger
        className={cn(
          'flex w-full items-center justify-between px-3 h-10 group',
          'transition-colors duration-[140ms] hover:bg-white/[0.025]',
          'focus-visible:outline-none',
        )}
      >
        <span className="flex items-center gap-2">
          <Icon size={12} strokeWidth={2} style={{ color: '#10b77f' }} className="shrink-0" />
          <span className="text-[11px] font-bold tracking-[0.07em] uppercase" style={{ color: '#94A3B8' }}>
            {label}
          </span>
        </span>
        <ChevronDown
          size={11} strokeWidth={2}
          className="text-[#64748B] transition-transform duration-[140ms] group-data-[state=open]:rotate-180"
        />
      </Accordion.Trigger>
      <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        {children}
      </Accordion.Content>
    </Accordion.Item>
  );
}

// ─── Setup Prompt ─────────────────────────────────────────────────────────────
function SetupPrompt({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6 text-center">
      <div className="h-11 w-11 flex items-center justify-center rounded-full"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
        <Key size={18} style={{ color: '#94A3B8' }} />
      </div>
      <div>
        <p className="text-[14px] font-semibold mb-2" style={{ color: '#ffffff' }}>
          AI Features Need Setup
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: '#94A3B8' }}>
          Connect an OpenAI API key to unlock layout generation, content population,
          style suggestions, and performance auditing.
        </p>
      </div>
      <PrimaryBtn
        data-testid="ai-setup-btn"
        onClick={onSetup}
        loadingLabel="Opening…"
        label="Configure API Key"
        icon={Key}
      />
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ onClose }: { onClose: () => void }) {
  const adapter     = useAdapter();
  const settings    = useAiStore((s) => s.settings);
  const setSettings = useAiStore((s) => s.setSettings);

  const [apiKey,   setApiKey]   = useState('');
  const [model,    setModel]    = useState(settings?.model    ?? 'gpt-4o-mini');
  const [provider, setProvider] = useState(settings?.provider ?? 'openai');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');

  const handleSave = async () => {
    if (!adapter.ai) { setError('AI adapter not available.'); return; }
    setSaving(true); setError('');
    try {
      await adapter.ai.saveSettings(provider, model, apiKey);
      const fresh = await adapter.ai.getSettings();
      setSettings(fresh);
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded text-[13px] text-white bg-[#080c16] border border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] outline-none focus:border-[#10b77f] transition-all';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-sm rounded-xl overflow-hidden"
        style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.10)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Sparkles size={13} style={{ color: '#10b77f' }} />
            <span className="text-[14px] font-semibold text-white">AI Settings</span>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded">✕</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-[#64748B] mb-1.5">API Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)}
              className={inputCls} style={{ background: '#080c16' }}>
              <option value="openai">OpenAI</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-[#64748B] mb-1.5">Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}
              className={inputCls} style={{ background: '#080c16' }}>
              {(settings?.models ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-[#64748B] mb-1.5">
              API Key{' '}
              {settings?.hasApiKey && <span style={{ color: '#10b77f' }}>● configured</span>}
            </label>
            <input type="password"
              placeholder={settings?.hasApiKey ? '••••••••••••••••' : 'sk-...'}
              value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              className={inputCls} />
            <p className="text-[11px] mt-1.5 text-[#64748B]">Stored encrypted in WordPress options.</p>
          </div>
          {error && (
            <p className="flex items-start gap-1.5 text-[12px] text-red-400">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />{error}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="w-full py-2.5 rounded-md text-[13px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: '#10b77f', color: '#ffffff' }}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : null}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Usage Bar ────────────────────────────────────────────────────────────────
function UsageBar() {
  const pct     = useAiStore(selectUsagePercent);
  const used    = useAiStore((s) => s.usageThisMonth);
  const limit   = useAiStore((s) => s.usageLimit);
  const atLimit = useAiStore(selectUsageAtLimit);

  if (limit === -1) return null;

  return (
    <div className="px-3 py-2.5 border-t border-white/[0.06] shrink-0">
      <div className="flex justify-between text-[10px] mb-1.5" style={{ color: '#64748B' }}>
        <span>Monthly usage</span>
        <span style={{ color: atLimit ? '#f87171' : '#64748B' }}>{used} / {limit}</span>
      </div>
      <div className="h-px rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full transition-all duration-300 rounded-full"
          style={{ width: `${Math.min(100, pct)}%`, background: atLimit ? '#ef4444' : '#10b77f' }} />
      </div>
      {atLimit && <p className="text-[10px] mt-1" style={{ color: '#f87171' }}>Limit reached — upgrade to continue</p>}
    </div>
  );
}

// ─── Generate section ─────────────────────────────────────────────────────────
function GenerateContent() {
  const adapter      = useAdapter();
  const page         = useCanvasStore((s) => s.page);
  const loadPage     = useCanvasStore((s) => s.loadPage);
  const markDirty    = useCanvasStore((s) => s.markDirty);
  const isGenerating = useAiStore(selectIsGenerating);
  const genError     = useAiStore(selectGenerateError);
  const atLimit      = useAiStore(selectUsageAtLimit);
  const setLoading   = useAiStore((s) => s.setLoading);
  const setError     = useAiStore((s) => s.setError);
  const incUsage     = useAiStore((s) => s.incrementUsage);

  const [prompt,  setPrompt]  = useState('');
  const [success, setSuccess] = useState(false);

  const examples = [
    'A SaaS hero with gradient background, headline, sub-text and two CTA buttons',
    'A 3-column features section with icons, titles and descriptions',
    'A centered pricing section with 3 tiers highlighted in different colors',
    'A testimonials section with 2 quote cards and author attribution',
  ];

  const handleGenerate = useCallback(async () => {
    if (!adapter.ai || !prompt.trim() || isGenerating) return;
    if (!page) {
      const newPage = createPage({ title: 'Untitled Page', slug: 'untitled-page' });
      loadPage(newPage);
      await new Promise((r) => setTimeout(r, 0));
    }
    setLoading('generate', true);
    setError('generate', null);
    setSuccess(false);
    try {
      const currentPageId = useCanvasStore.getState().page!.id;
      const result = await adapter.ai.generateLayout(prompt, currentPageId);
      const currentPage = useCanvasStore.getState().page!;
      const rootId    = currentPage.rootNodeId;
      const genRootId = result.rootNodeId;
      const mergedMap = { ...currentPage.nodeMap };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const [nid, node] of Object.entries(result.nodeMap as Record<string, any>)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mergedMap[nid] = { ...node, parentId: nid === genRootId ? rootId : (node.parentId ?? null) } as any;
      }
      const currentRoot = mergedMap[rootId];
      if (currentRoot) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mergedMap[rootId] as any) = { ...currentRoot, children: [...(currentRoot.children ?? []), genRootId] };
      }
      const updatedPage: NexusPage = {
        ...currentPage,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodeMap: mergedMap as any,
        updatedAt: new Date().toISOString(),
      };
      loadPage(updatedPage);
      markDirty();
      incUsage();
      setSuccess(true);
      setPrompt('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError('generate', err?.message ?? 'Generation failed. Please try again.');
    } finally {
      setLoading('generate', false);
    }
  }, [adapter.ai, page, prompt, isGenerating]);

  return (
    <div className="flex flex-col gap-3 px-3 pb-3 pt-1">
      <p className="text-[12px] leading-relaxed" style={{ color: '#94A3B8' }}>
        Describe a layout and AI generates a live, editable section on your canvas.
      </p>
      <Card>
        <textarea
          data-testid="ai-generate-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
          placeholder="e.g. A hero section with a dark gradient background, large headline, subtitle and a green CTA button…"
          rows={4}
          disabled={isGenerating || atLimit}
          className="w-full text-[13px] resize-none bg-transparent outline-none disabled:opacity-50 placeholder:text-[#475569] leading-relaxed"
          style={{ color: '#ffffff' }}
        />
        <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
          <span className="text-[10px] shrink-0" style={{ color: '#475569' }}>⌘+Enter</span>
          <PrimaryBtn
            data-testid="ai-generate-btn"
            onClick={handleGenerate}
            disabled={!prompt.trim() || atLimit}
            loading={isGenerating}
            loadingLabel="Generating…"
            label="Generate"
            icon={Wand2}
          />
        </div>
      </Card>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: '#475569' }}>Try an example</span>
        {examples.map((ex, i) => (
          <button key={i} onClick={() => setPrompt(ex)} disabled={isGenerating}
            className="text-left text-[11px] leading-snug transition-colors duration-100 disabled:opacity-40 truncate"
            style={{ color: '#64748B' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#10b77f')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
            title={ex}>
            › {ex}
          </button>
        ))}
      </div>
      {genError && (
        <p className="flex items-start gap-1.5 text-[12px]" style={{ color: '#f87171' }}>
          <AlertTriangle size={11} className="mt-0.5 shrink-0" />{genError}
        </p>
      )}
      {success && (
        <p data-testid="ai-generate-success" className="flex items-center gap-1.5 text-[12px]" style={{ color: '#10b77f' }}>
          <CheckCircle2 size={11} />Layout generated!
        </p>
      )}
    </div>
  );
}

// ─── Populate section ─────────────────────────────────────────────────────────
function PopulateContent() {
  const adapter      = useAdapter();
  const page         = useCanvasStore((s) => s.page);
  const loadPage     = useCanvasStore((s) => s.loadPage);
  const markDirty    = useCanvasStore((s) => s.markDirty);
  const isPopulating = useAiStore(selectIsPopulating);
  const setLoading   = useAiStore((s) => s.setLoading);
  const setError     = useAiStore((s) => s.setError);
  const incUsage     = useAiStore((s) => s.incrementUsage);
  const atLimit      = useAiStore(selectUsageAtLimit);

  const [context,  setContext]    = useState('');
  const [error,    setLocalError] = useState('');
  const [success,  setSuccess]    = useState(false);

  const handlePopulate = async () => {
    if (!adapter.ai || !page || !context.trim() || isPopulating) return;
    setLoading('populate', true);
    setLocalError('');
    setError('populate', null);
    setSuccess(false);
    try {
      const updatedMap = await adapter.ai.populateContent(page.nodeMap as Record<string, unknown>, context, page.id);
      const updatedPage: NexusPage = { ...page, nodeMap: updatedMap as NexusPage['nodeMap'], updatedAt: new Date().toISOString() };
      loadPage(updatedPage);
      markDirty();
      incUsage();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setLocalError(err?.message ?? 'Content population failed.');
    } finally {
      setLoading('populate', false);
    }
  };

  return (
    <div className="flex flex-col gap-3 px-3 pb-3 pt-1">
      <p className="text-[12px] leading-relaxed" style={{ color: '#94A3B8' }}>
        AI fills all text nodes with professional copy tailored to your brand context.
      </p>
      <Card>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: '#64748B' }}>
          Page Context
        </label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="e.g. SaaS project management tool for remote dev teams, B2B, modern tone…"
          rows={3}
          disabled={isPopulating || atLimit}
          className="w-full text-[13px] resize-none bg-transparent outline-none disabled:opacity-50 placeholder:text-[#475569] leading-relaxed"
          style={{ color: '#ffffff' }}
        />
        <div className="mt-2 pt-2 border-t border-white/[0.06]">
          <PrimaryBtn
            onClick={handlePopulate}
            disabled={!context.trim() || atLimit || !page}
            loading={isPopulating}
            loadingLabel="Populating…"
            label="Populate Content"
            icon={FileText}
          />
        </div>
      </Card>
      {error && (
        <p className="flex items-start gap-1.5 text-[12px]" style={{ color: '#f87171' }}>
          <AlertTriangle size={11} className="mt-0.5 shrink-0" />{error}
        </p>
      )}
      {success && (
        <p className="flex items-center gap-1.5 text-[12px]" style={{ color: '#10b77f' }}>
          <CheckCircle2 size={11} />Content populated!
        </p>
      )}
    </div>
  );
}

// ─── Styles section ───────────────────────────────────────────────────────────
function StylesContent() {
  const adapter   = useAdapter();
  const page      = useCanvasStore((s) => s.page);
  const loadPage  = useCanvasStore((s) => s.loadPage);
  const markDirty = useCanvasStore((s) => s.markDirty);
  const setLoading = useAiStore((s) => s.setLoading);

  const [changedToken, setChangedToken] = useState('');
  const [loading,      setLocalLoading] = useState(false);
  const [suggestions,  setSuggestions]  = useState<Record<string, string> | null>(null);
  const [error,        setError]        = useState('');
  const [applied,      setApplied]      = useState(false);

  const currentTokens = page?.globalStyles ?? {};

  const handleSuggest = async () => {
    if (!adapter.ai || !changedToken.trim()) return;
    setLocalLoading(true);
    setError('');
    setSuggestions(null);
    setApplied(false);
    try {
      const result = await adapter.ai.suggestStyles(currentTokens, changedToken);
      setSuggestions(result);
    } catch (err: any) {
      setError(err?.message ?? 'Style suggestion failed.');
    } finally {
      setLocalLoading(false);
      setLoading('styles' as any, false);
    }
  };

  const handleApply = () => {
    if (!page || !suggestions) return;
    const updatedPage: NexusPage = { ...page, globalStyles: { ...page.globalStyles, ...suggestions }, updatedAt: new Date().toISOString() };
    loadPage(updatedPage);
    markDirty();
    setApplied(true);
    setTimeout(() => { setSuggestions(null); setApplied(false); }, 2000);
  };

  return (
    <div className="flex flex-col gap-3 px-3 pb-3 pt-1">
      <p className="text-[12px] leading-relaxed" style={{ color: '#94A3B8' }}>
        Change a design token and let AI suggest a harmonious full palette update.
      </p>
      <Card>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: '#64748B' }}>
          Token Changed
        </label>
        <input
          value={changedToken}
          onChange={(e) => setChangedToken(e.target.value)}
          placeholder="e.g. --color-accent: #7c3aed"
          className="w-full text-[13px] bg-transparent outline-none placeholder:text-[#475569]"
          style={{ color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}
          onFocus={(e) => (e.target.style.borderBottomColor = '#10b77f')}
          onBlur={(e)  => (e.target.style.borderBottomColor = 'rgba(255,255,255,0.08)')}
        />
        <div className="mt-3">
          <PrimaryBtn onClick={handleSuggest} disabled={!changedToken.trim()} loading={loading}
            loadingLabel="Suggesting…" label="Suggest Styles" icon={Palette} />
        </div>
      </Card>
      {error && <p className="text-[12px]" style={{ color: '#f87171' }}>{error}</p>}
      {suggestions && !applied && (
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: '#64748B' }}>
            {Object.keys(suggestions).length} Suggested Tokens
          </p>
          <div className="max-h-28 overflow-y-auto flex flex-col gap-1 mb-3">
            {Object.entries(suggestions).slice(0, 10).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[11px]">
                <span className="truncate max-w-[120px]" style={{ color: '#64748B' }}>{k}</span>
                <span style={{ color: '#10b77f' }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
            <button onClick={handleApply} className="flex-1 py-1.5 rounded text-[12px] font-semibold"
              style={{ background: '#10b77f', color: '#ffffff' }}>Apply All</button>
            <button onClick={() => setSuggestions(null)} className="flex-1 py-1.5 rounded text-[12px] transition-colors"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', color: '#94A3B8' }}>Discard</button>
          </div>
        </Card>
      )}
      {applied && (
        <p className="flex items-center gap-1.5 text-[12px]" style={{ color: '#10b77f' }}>
          <CheckCircle2 size={11} />Styles applied!
        </p>
      )}
    </div>
  );
}

// ─── Advisor section ──────────────────────────────────────────────────────────
function AdvisorContent({ onOpenAdvisor = () => {} }: { onOpenAdvisor?: () => void }) {
  const audit  = useAiStore((s) => s.currentAudit);
  const score  = audit?.score ?? null;

  const scoreColor = score === null ? '#64748B' : score >= 80 ? '#10b77f' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col gap-3 px-3 pb-3 pt-1">
      <p className="text-[12px] leading-relaxed" style={{ color: '#94A3B8' }}>
        AI scans your published page and gives actionable fixes for performance, SEO, and accessibility.
      </p>
      {score !== null ? (
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black tabular-nums" style={{ color: scoreColor }}>{score}</span>
              <span className="text-[10px]" style={{ color: '#64748B' }}>Score</span>
            </div>
            <div className="flex-1">
              <p className="text-[13px] mb-1" style={{ color: '#ffffff' }}>
                {(audit?.findings ?? []).length} finding{(audit?.findings ?? []).length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-3 flex-wrap">
                {(['high', 'medium', 'low'] as const).map((sev) => {
                  const count = (audit?.findings ?? []).filter((f) => f.severity === sev).length;
                  if (!count) return null;
                  const c = sev === 'high' ? '#f87171' : sev === 'medium' ? '#fbbf24' : '#6b7280';
                  return <span key={sev} className="text-[11px]" style={{ color: c }}>{count} {sev}</span>;
                })}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="flex items-center gap-3">
          <Gauge size={18} style={{ color: '#475569' }} />
          <p className="text-[12px]" style={{ color: '#64748B' }}>
            No audit yet. Publish first, then run the advisor.
          </p>
        </Card>
      )}
      <button
        onClick={onOpenAdvisor}
        className="w-full py-2.5 rounded-md text-[13px] font-semibold flex items-center justify-center gap-2 transition-all"
        style={{ background: '#10b77f', color: '#ffffff' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#0da870')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#10b77f')}
      >
        <Gauge size={13} />
        {score !== null ? 'View Full Report' : 'Run Performance Audit'}
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ─── Main AiPanel ─────────────────────────────────────────────────────────────
export function AiPanel({ onOpenAdvisor = () => {} }: { onOpenAdvisor?: () => void }) {
  const adapter        = useAdapter();
  const aiReady        = useAiStore(selectAiReady);
  const aiNeedsSetup   = useAiStore(selectAiNeedsSetup);
  const settingsLoaded = useAiStore((s) => s.settingsLoaded);
  const setSettings    = useAiStore((s) => s.setSettings);

  const [showSettings, setShowSettings] = useState(false);
  const [loadingInit,  setLoadingInit]  = useState(false);

  useEffect(() => {
    if (settingsLoaded || !adapter.ai) return;
    setLoadingInit(true);
    adapter.ai.getSettings()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoadingInit(false));
  }, [adapter.ai, settingsLoaded]);

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={16} className="animate-spin" style={{ color: '#64748B' }} />
      </div>
    );
  }

  return (
    <>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Header */}
      <div data-testid="ai-panel" className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06] shrink-0"
        style={{ background: '#1a211d' }}>
        <div className="flex items-center gap-2">
          <Sparkles size={12} style={{ color: '#10b77f' }} />
          <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: '#bbcabf' }}>AI Copilot</span>
          {aiReady && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#10b77f' }} title="AI ready" />}
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded transition-colors"
          style={{ color: '#64748B' }}
          title="AI Settings"
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
        >
          <Key size={12} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {!settingsLoaded && !loadingInit && (
          <div className="flex items-center justify-center h-24">
            <Loader2 size={14} className="animate-spin" style={{ color: '#64748B' }} />
          </div>
        )}
        {settingsLoaded && aiNeedsSetup && <SetupPrompt onSetup={() => setShowSettings(true)} />}

        {aiReady && (
          <Accordion.Root type="single" collapsible defaultValue="generate">
            <AiAccordionItem id="generate" label="Generate" icon={Wand2}>
              <GenerateContent />
            </AiAccordionItem>
            <AiAccordionItem id="populate" label="Populate" icon={FileText}>
              <PopulateContent />
            </AiAccordionItem>
            <AiAccordionItem id="styles" label="Styles" icon={Palette}>
              <StylesContent />
            </AiAccordionItem>
            <AiAccordionItem id="advisor" label="Advisor" icon={Gauge}>
              <AdvisorContent onOpenAdvisor={onOpenAdvisor} />
            </AiAccordionItem>
          </Accordion.Root>
        )}
      </div>

      {/* Usage bar */}
      {aiReady && <UsageBar />}
    </>
  );
}
