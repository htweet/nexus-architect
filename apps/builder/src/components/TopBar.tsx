/**
 * TopBar — Nexus Architect builder header.
 * Executive Dark design (MD3 Charcoal & Emerald palette).
 * Height: 52px
 */

import { useState, useRef, useEffect } from 'react';
import {
  Undo2, Redo2, Monitor, Tablet, Smartphone,
  ChevronDown, Plus, Trash2, Copy, Loader2, ExternalLink, Check,
  LayoutTemplate, PanelLeft, PanelRight, Settings,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  useUIStore, useHistoryStore, useCanvasStore, useCollaborationStore,
  selectCanUndo, selectCanRedo, selectSaveStatus, selectActiveCollaborators,
  type ActiveBreakpoint, type NexusPage,
} from '@nexus/core';
import { useAdapter } from '@/contexts/AdapterContext';
import { PublishDialog } from '@/components/panels/PublishDialog';
import { TemplatesModal } from '@/components/panels/TemplatesModal';
import { SettingsModal } from '@/components/panels/SettingsModal';
import { PREVIEW_STORAGE_KEY } from '@/lib/preview-constants';
import type { PublishResult } from '@nexus/core';

// ── Logo ──────────────────────────────────────────────────────────────────────
function NexusLogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Nexus Architect">
      <defs>
        <linearGradient id="topbar-logo-grad" x1="0" y1="0" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#50dea3" />
          <stop offset="100%" stopColor="#10b77f" />
        </linearGradient>
      </defs>
      <rect width="26" height="26" rx="6" fill="url(#topbar-logo-grad)" />
      <path d="M7 19V7H9.6L16.4 15.4V7H19V19H16.4L9.6 10.6V19H7Z" fill="white" />
    </svg>
  );
}

// ── Save status indicator ─────────────────────────────────────────────────────
function SaveStatus() {
  const status = useCanvasStore(selectSaveStatus);

  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1 text-[12px]" style={{ color: '#bbcabf' }}>
        <Loader2 size={11} className="animate-spin" />
        Saving…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1 text-[12px]" style={{ color: '#50dea3' }}>
        <Check size={11} />
        Saved {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  }
  if (status === 'error') {
    return <span className="text-[12px] text-red-400">Save failed</span>;
  }
  return null;
}

// ── Collaborator avatars ──────────────────────────────────────────────────────
function CollabAvatars() {
  const peers = useCollaborationStore(selectActiveCollaborators);
  if (!peers.length) return null;
  return (
    <div className="flex -space-x-1.5">
      {peers.slice(0, 4).map((p) => (
        <div
          key={p.userId}
          title={p.name}
          className="w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: p.color, borderColor: '#0e1511' }}
        >
          {p.name[0]?.toUpperCase()}
        </div>
      ))}
    </div>
  );
}

// ── Page manager dropdown ─────────────────────────────────────────────────────
function PageTab() {
  const [open, setOpen]       = useState(false);
  const [pages, setPages]     = useState<NexusPage[]>([]);
  const [loading, setLoading] = useState(false);
  const ref                   = useRef<HTMLDivElement>(null);
  const adapter               = useAdapter();
  const page                  = useCanvasStore((s) => s.page);
  const loadPage              = useCanvasStore((s) => s.loadPage);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    adapter.data.listPages()
      .then((r) => setPages(r.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, adapter]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSwitch = async (p: NexusPage) => {
    const full = await adapter.data.getPage(p.id);
    loadPage(full);
    setOpen(false);
  };

  const handleNew = async () => {
    const slug  = `page-${Date.now()}`;
    const newPg = await adapter.data.createPage({ title: 'New Page', slug });
    const full  = await adapter.data.getPage(newPg.id);
    loadPage(full);
    setOpen(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await adapter.data.deletePage(id);
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-150"
        style={{ color: '#dde4dd', background: open ? 'rgba(255,255,255,0.08)' : 'transparent' }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <span className="max-w-[140px] truncate">{page?.title ?? 'Select page'}</span>
        <ChevronDown size={13} className={cn('text-[#bbcabf] transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 z-50 rounded-lg overflow-hidden py-1.5 min-w-[220px]"
          style={{
            background: '#161d19',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-5">
              <Loader2 size={15} className="animate-spin text-[#bbcabf]" />
            </div>
          ) : (
            pages.map((p) => (
              <div
                key={p.id}
                onClick={() => void handleSwitch(p)}
                className="flex items-center justify-between px-3.5 py-2 cursor-pointer group text-[13px]"
                style={{
                  background: p.id === page?.id ? 'rgba(16,183,127,0.12)' : 'transparent',
                  color: p.id === page?.id ? '#50dea3' : '#dde4dd',
                }}
                onMouseEnter={(e) => { if (p.id !== page?.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { if (p.id !== page?.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="truncate">{p.title}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 ml-2">
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded hover:text-[#50dea3] transition-colors"
                    style={{ color: '#bbcabf' }}
                    title="Duplicate"
                  >
                    <Copy size={11} />
                  </button>
                  <button
                    onClick={(e) => void handleDelete(p.id, e)}
                    className="p-1 rounded hover:text-red-400 transition-colors"
                    style={{ color: '#bbcabf' }}
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))
          )}

          <div className="border-t mt-1 pt-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => void handleNew()}
              className="flex items-center gap-2 w-full px-3.5 py-2 text-[13px] transition-colors"
              style={{ color: '#50dea3' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,183,127,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Plus size={13} />
              New page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Icon button ───────────────────────────────────────────────────────────────
function IconBtn({
  onClick, disabled, title, children,
}: {
  onClick: () => void; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-150 disabled:opacity-30"
      style={{ color: '#bbcabf' }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ── Breakpoint pill ───────────────────────────────────────────────────────────
const BREAKPOINTS: { key: ActiveBreakpoint; icon: React.ReactNode; label: string }[] = [
  { key: 'desktop', icon: <Monitor size={14} />,    label: 'Desktop (D)' },
  { key: 'tablet',  icon: <Tablet size={14} />,     label: 'Tablet (T)'  },
  { key: 'mobile',  icon: <Smartphone size={14} />, label: 'Mobile (M)'  },
];

// ── TopBar ────────────────────────────────────────────────────────────────────
export function TopBar() {
  const activeBreakpoint  = useUIStore((s) => s.activeBreakpoint);
  const setBreakpoint     = useUIStore((s) => s.setBreakpoint);
  const isPreviewMode     = useUIStore((s) => s.isPreviewMode);
  const enterPreview      = useUIStore((s) => s.enterPreview);
  const exitPreview       = useUIStore((s) => s.exitPreview);
  const toggleLeftPanel   = useUIStore((s) => s.toggleLeftPanel);
  const toggleRightPanel  = useUIStore((s) => s.toggleRightPanel);
  const leftPanelOpen     = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen    = useUIStore((s) => s.rightPanelOpen);
  const canUndo           = useHistoryStore(selectCanUndo);
  const canRedo           = useHistoryStore(selectCanRedo);
  const page              = useCanvasStore((s) => s.page);
  const adapter           = useAdapter();

  const [publishOpen,   setPublishOpen]   = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [previewing,    setPreviewing]    = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);

  const handleUndo = () => {
    const currentPage = useCanvasStore.getState().page ?? undefined;
    const entry = useHistoryStore.getState().undo(currentPage);
    if (entry) useCanvasStore.getState().loadPage(entry.snapshot);
  };

  const handleRedo = () => {
    const entry = useHistoryStore.getState().redo();
    if (entry) useCanvasStore.getState().loadPage(entry.snapshot);
  };

  const handleNewTabPreview = async () => {
    if (!page) return;
    setPreviewing(true);
    try {
      const { compilePage } = await import('@nexus/core');
      const compiled = compilePage(page);
      const bundle = { page, compiledHtml: compiled.html, compiledCss: compiled.css };
      localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(bundle));
      window.open(`${window.location.origin}/?nx-preview`, '_blank');
    } finally {
      setPreviewing(false);
    }
  };

  const handlePublish = async () => {
    if (!page) return;
    try {
      const result = await adapter.data.publishPage(page.id);
      setPublishResult(result);
      setPublishOpen(true);
    } catch { /* surfaced via dialog */ }
  };

  return (
    <header
      className="flex items-center px-3 gap-1.5 shrink-0 border-b relative"
      style={{
        height: 52,
        background: '#0e1511',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
      data-testid="topbar"
    >
      {/* ── LEFT ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 z-10">
        <NexusLogoMark />

        <div className="w-px h-5 mx-1.5" style={{ background: 'rgba(255,255,255,0.10)' }} />

        <IconBtn onClick={toggleLeftPanel} title="Toggle left panel (⇧⌘L)">
          <PanelLeft size={15} style={{ opacity: leftPanelOpen ? 1 : 0.4 }} />
        </IconBtn>
        <IconBtn onClick={toggleRightPanel} title="Toggle right panel (⇧⌘R)">
          <PanelRight size={15} style={{ opacity: rightPanelOpen ? 1 : 0.4 }} />
        </IconBtn>

        <div className="w-px h-5 mx-1.5" style={{ background: 'rgba(255,255,255,0.10)' }} />

        <IconBtn onClick={handleUndo} disabled={!canUndo} title="Undo (⌘Z)">
          <Undo2 size={14} />
        </IconBtn>
        <IconBtn onClick={handleRedo} disabled={!canRedo} title="Redo (⇧⌘Z)">
          <Redo2 size={14} />
        </IconBtn>

        <div className="w-px h-5 mx-1.5" style={{ background: 'rgba(255,255,255,0.10)' }} />

        <PageTab />

        <button
          onClick={() => setTemplatesOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors"
          style={{ color: '#bbcabf' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#dde4dd'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#bbcabf'; }}
          title="Templates"
        >
          <LayoutTemplate size={13} />
          Templates
        </button>
      </div>

      {/* ── CENTER ───────────────────────────────────────────────────────── */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none select-none">
        <span className="text-[15px] font-semibold" style={{ color: '#dde4dd' }}>
          {page?.title ?? 'Nexus Architect'}
        </span>
        <SaveStatus />
      </div>

      {/* ── RIGHT ────────────────────────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-2 z-10">
        {/* Breakpoint switcher */}
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
        >
          {BREAKPOINTS.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setBreakpoint(key)}
              title={label}
              className="flex items-center justify-center w-8 h-7 transition-colors duration-150"
              style={{
                color:      activeBreakpoint === key ? '#50dea3' : '#bbcabf',
                background: activeBreakpoint === key ? 'rgba(16,183,127,0.15)' : 'transparent',
              }}
            >
              {icon}
            </button>
          ))}
        </div>

        <CollabAvatars />

        {/* Settings button */}
        <button
          onClick={() => setSettingsOpen(true)}
          title="Builder settings (⌘,)"
          className="flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-150"
          style={{ color: '#bbcabf' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#dde4dd'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#bbcabf'; }}
        >
          <Settings size={15} />
        </button>

        <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.10)' }} />

        {/* Preview button */}
        <button
          onClick={isPreviewMode ? exitPreview : () => void handleNewTabPreview()}
          disabled={!page || previewing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors disabled:opacity-40"
          style={{
            background: isPreviewMode ? 'rgba(16,183,127,0.20)' : 'rgba(255,255,255,0.07)',
            color: isPreviewMode ? '#50dea3' : '#dde4dd',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
          title="Preview in new tab"
        >
          {previewing ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
          {isPreviewMode ? 'Exit' : 'Preview'}
        </button>

        {/* Publish button */}
        <button
          onClick={() => void handlePublish()}
          disabled={!page}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-all disabled:opacity-40"
          style={{ background: '#10b77f', color: '#ffffff' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#0da870'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#10b77f'; }}
          title="Publish page"
        >
          Publish
        </button>
      </div>

      {/* Dialogs */}
      <PublishDialog
        isOpen={publishOpen && publishResult !== null}
        result={publishResult}
        onClose={() => { setPublishOpen(false); setPublishResult(null); }}
      />
      <TemplatesModal
        isOpen={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </header>
  );
}
