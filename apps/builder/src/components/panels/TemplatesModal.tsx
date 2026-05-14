/**
 * TemplatesModal — full-screen overlay templates browser.
 *
 * Invoked from the TopBar "Templates" button.
 * Two top-level tabs:
 *   • Pages    — Starters, Landing Pages, Blog, Portfolio
 *   • Sections — Sections category only
 *
 * Features:
 *   • Bigger thumbnails (aspect-ratio cards)
 *   • Per-tab search
 *   • Category filter dropdown (Pages tab only; Sections tab shows all sections)
 *   • Save Current Page as template (same as old panel)
 *   • Escape key / backdrop click to close
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, Save, RefreshCw, LayoutTemplate } from 'lucide-react';
import { useCanvasStore, createPage } from '@nexus/core';
import { useAdapter } from '@/contexts/AdapterContext';
import { cn } from '@/lib/cn';
import {
  ALL_STARTERS,
  THUMB_SVG,
  genId,
  clone,
} from '@/components/panels/TemplatesPanel';
import type { NexusTemplate } from '@nexus/core';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_CATEGORIES  = ['All', 'Starters', 'Landing Pages', 'Blog', 'Portfolio'] as const;
type PageCategory = typeof PAGE_CATEGORIES[number];

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function TemplateThumbnail({ templateId }: { templateId: string }) {
  const svg = THUMB_SVG[templateId];
  if (!svg) {
    return (
      <div className="w-full h-full flex items-center justify-center opacity-20">
        <LayoutTemplate size={32} />
      </div>
    );
  }
  return (
    <div
      className="w-full h-full"
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ lineHeight: 0 }}
    />
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  tpl,
  onApply,
}: {
  tpl:     NexusTemplate;
  onApply: () => void;
}) {
  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl overflow-hidden cursor-pointer',
        'border transition-all duration-200',
        'hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
      )}
      style={{
        background:   '#161d19',
        borderColor:  'rgba(255,255,255,0.10)',
      }}
      onClick={onApply}
    >
      {/* Thumbnail */}
      <div
        className="w-full overflow-hidden shrink-0"
        style={{
          aspectRatio:     '16/9',
          background:      '#080810',
        }}
      >
        <TemplateThumbnail templateId={tpl.id} />
      </div>

      {/* Info */}
      <div className="px-3 py-2.5 flex flex-col gap-0.5">
        <p className="text-[12px] font-bold truncate" style={{ color: '#dde4dd' }}>
          {tpl.name}
        </p>
        {tpl.description && (
          <p className="text-[11px] leading-snug line-clamp-2" style={{ color: '#bbcabf' }}>
            {tpl.description}
          </p>
        )}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ background: 'rgba(0,0,0,0.55)' }}>
        <span
          className="px-5 py-2 rounded-full text-[12px] font-black uppercase tracking-wider"
          style={{ background: '#10b77f', color: '#fff' }}
        >
          Use Template
        </span>
      </div>
    </div>
  );
}

// ─── Group heading ─────────────────────────────────────────────────────────────

function GroupHeading({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.14em] col-span-full mb-1"
      style={{ color: '#bbcabf' }}>
      {label}
    </p>
  );
}

// ─── Pages tab ────────────────────────────────────────────────────────────────

function PagesTab({ onApply }: { onApply: (tpl: NexusTemplate) => void }) {
  const [search, setSearch]     = useState('');
  const [cat,    setCat]        = useState<PageCategory>('All');

  const pageTemplates = ALL_STARTERS.filter((t) => t.category !== 'Sections');

  const filtered = pageTemplates.filter((t) => {
    const matchesCat    = cat === 'All' || t.category === cat;
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Group for "All" view
  const grouped: Record<string, NexusTemplate[]> = {};
  if (cat === 'All') {
    for (const t of filtered) (grouped[t.category] ??= []).push(t);
  } else {
    grouped[cat] = filtered;
  }

  const categoryOrder = ['Starters', 'Landing Pages', 'Blog', 'Portfolio'];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 shrink-0 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
        {/* Search */}
        <div
          className="flex items-center gap-2 h-9 flex-1 max-w-[340px] rounded-lg px-3 border"
          style={{ background: '#09100c', borderColor: 'rgba(255,255,255,0.10)' }}
        >
          <Search size={13} style={{ color: '#bbcabf' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search page templates…"
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: '#dde4dd' }}
          />
        </div>

        {/* Category filter */}
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value as PageCategory)}
          className="h-9 rounded-lg px-3 text-[12px] font-semibold outline-none cursor-pointer border"
          style={{
            background:  '#09100c',
            borderColor: 'rgba(255,255,255,0.10)',
            color:       '#dde4dd',
          }}
        >
          {PAGE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <LayoutTemplate size={32} />
            <p className="text-sm">No templates match your search</p>
          </div>
        ) : (
          categoryOrder
            .filter((c) => grouped[c]?.length)
            .map((category) => (
              <div key={category} className="mb-8">
                {cat === 'All' && <GroupHeading label={category} />}
                <div className="grid gap-4" style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                }}>
                  {(grouped[category] ?? []).map((tpl) => (
                    <TemplateCard key={tpl.id} tpl={tpl} onApply={() => onApply(tpl)} />
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ─── Sections tab ─────────────────────────────────────────────────────────────

function SectionsTab({ onApply }: { onApply: (tpl: NexusTemplate) => void }) {
  const [search, setSearch] = useState('');

  const sectionTemplates = ALL_STARTERS.filter((t) => t.category === 'Sections');
  const filtered = sectionTemplates.filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 shrink-0 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
        <div
          className="flex items-center gap-2 h-9 flex-1 max-w-[340px] rounded-lg px-3 border"
          style={{ background: '#09100c', borderColor: 'rgba(255,255,255,0.10)' }}
        >
          <Search size={13} style={{ color: '#bbcabf' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search section templates…"
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: '#dde4dd' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <LayoutTemplate size={32} />
            <p className="text-sm">No sections match your search</p>
          </div>
        ) : (
          <div className="grid gap-4" style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          }}>
            {filtered.map((tpl) => (
              <TemplateCard key={tpl.id} tpl={tpl} onApply={() => onApply(tpl)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Save tab ─────────────────────────────────────────────────────────────────

function SaveTab({ onSaved }: { onSaved: (tpl: NexusTemplate) => void }) {
  const page    = useCanvasStore((s) => s.page);
  const adapter = useAdapter();
  const [name,  setName]  = useState('');
  const [desc,  setDesc]  = useState('');
  const [busy,  setBusy]  = useState(false);

  const handleSave = async () => {
    if (!page || !name.trim()) return;
    setBusy(true);
    const tpl: NexusTemplate = {
      id:          genId(),
      name:        name.trim(),
      ...(desc.trim() ? { description: desc.trim() } : {}),
      category:    'Starters',
      createdAt:   new Date().toISOString(),
      snapshot: {
        rootNodeId:   page.rootNodeId,
        globalStyles: page.globalStyles ?? {},
        nodeMap:      JSON.parse(JSON.stringify(page.nodeMap)) as typeof page.nodeMap,
      },
    };
    onSaved(tpl);
    const saveFn = (adapter.data as { saveTemplate?: (t: NexusTemplate) => Promise<NexusTemplate> }).saveTemplate;
    if (saveFn) { try { await saveFn(tpl); } catch { /* silent */ } }
    setName('');
    setDesc('');
    setBusy(false);
  };

  const fieldStyle = {
    background:   '#09100c',
    border:       '1px solid rgba(255,255,255,0.10)',
    color:        '#dde4dd',
    borderRadius: '10px',
    padding:      '10px 14px',
    fontSize:     '13px',
    outline:      'none',
    width:        '100%',
  } as React.CSSProperties;

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="w-full max-w-[480px] flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#bbcabf' }}>
            Template Name *
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My awesome template"
            style={fieldStyle}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#bbcabf' }}>
            Description
          </span>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="A short description of this template…"
            rows={3}
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!page || !name.trim() || busy}
          className="flex items-center justify-center gap-2 h-10 rounded-lg text-[13px] font-bold disabled:opacity-40 transition-all"
          style={{ background: '#10b77f', color: '#fff' }}
        >
          <Save size={14} />
          {busy ? 'Saving…' : 'Save Template'}
        </button>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

type ModalTab = 'pages' | 'sections' | 'save';

interface TemplatesModalProps {
  isOpen:  boolean;
  onClose: () => void;
}

export function TemplatesModal({ isOpen, onClose }: TemplatesModalProps) {
  const [activeTab, setActiveTab]         = useState<ModalTab>('pages');
  const [userTemplates, setUserTemplates] = useState<NexusTemplate[]>([]);
  const page     = useCanvasStore((s) => s.page);
  const loadPage = useCanvasStore((s) => s.loadPage);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const applyTemplate = useCallback((tpl: NexusTemplate) => {
    const activePage = page ?? createPage({ title: 'Untitled Page', slug: 'untitled-page' });
    if (!page) loadPage(activePage);

    const snap  = tpl.snapshot;
    const idMap = new Map<string, string>();
    const mapId = (oldId: string): string => {
      if (oldId === snap.rootNodeId) return activePage.rootNodeId;
      if (!idMap.has(oldId)) idMap.set(oldId, genId());
      return idMap.get(oldId)!;
    };

    const newNodeMap: typeof activePage.nodeMap = {};
    const walk = (id: string, parentId: string | null) => {
      const orig = snap.nodeMap[id];
      if (!orig) return;
      const newId       = mapId(id);
      const newChildren = orig.children.map((c) => mapId(c));
      newNodeMap[newId] = { ...clone(orig), id: newId, parentId, children: newChildren };
      orig.children.forEach((c) => walk(c, newId));
    };
    walk(snap.rootNodeId, null);

    loadPage({
      ...activePage,
      rootNodeId:   activePage.rootNodeId,
      nodeMap:      newNodeMap,
      globalStyles: { ...activePage.globalStyles, ...snap.globalStyles },
      updatedAt:    new Date().toISOString(),
    });

    useCanvasStore.getState().markDirty();
    onClose();
  }, [page, loadPage, onClose]);

  if (!isOpen) return null;

  const TABS: { id: ModalTab; label: string }[] = [
    { id: 'pages',    label: 'Pages'    },
    { id: 'sections', label: 'Sections' },
    { id: 'save',     label: 'Save Current' },
  ];

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[99999] flex items-start justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="relative flex flex-col w-full max-w-[1200px] mx-4 my-8 rounded-2xl overflow-hidden"
        style={{
          background:   '#161d19',
          border:       '1px solid rgba(255,255,255,0.10)',
          boxShadow:    '0 32px 80px rgba(0,0,0,0.6)',
          maxHeight:    'calc(100vh - 64px)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-4 px-6 py-4 shrink-0 border-b"
          style={{ background: '#09100c', borderColor: 'rgba(255,255,255,0.10)' }}
        >
          <LayoutTemplate size={18} style={{ color: '#10b77f' }} />
          <h2 className="text-[15px] font-black" style={{ color: '#dde4dd' }}>
            Templates
          </h2>

          {/* Tabs */}
          <div className="flex items-center gap-1 ml-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all duration-150',
                  activeTab === t.id
                    ? 'text-[#dde4dd]'
                    : 'text-[#bbcabf] hover:text-[#bbcabf]',
                )}
                style={activeTab === t.id ? {
                  background: '#09100c',
                  border:     '1px solid rgba(255,255,255,0.10)',
                } : {}}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="ml-auto flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ color: '#bbcabf' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'pages'    && <PagesTab    onApply={applyTemplate} />}
          {activeTab === 'sections' && <SectionsTab onApply={applyTemplate} />}
          {activeTab === 'save'     && <SaveTab     onSaved={(tpl) => { setUserTemplates((p) => [tpl, ...p]); }} />}
        </div>
      </div>
    </div>
  );
}
