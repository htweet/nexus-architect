/**
 * LeftPanel — Nexus Architect left sidebar.
 * Width: 264px. Tabs: Layers | Widgets | AI | Marketplace
 *
 * Phase M: Added Marketplace tab + useWidgetRegistryVersion for reactive
 * palette — when an addon registers/unregisters widgets the palette
 * re-renders automatically without any extra store plumbing.
 */

import { useState, useEffect, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Search, ChevronRight, ChevronDown,
  FileText, Plus, AlignLeft,
  Square, Minus as MinusIcon, Image, Type, MousePointer2,
  LayoutGrid, Columns, Frame, List, Loader2, Heading1,
  Star, Zap, Component, Sparkles, LogIn, Store,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  useCanvasStore, useSelectionStore, useUIStore, type NexusPage,
} from '@nexus/core';
import { useAdapter } from '@/contexts/AdapterContext';
import { getWidget, getAllWidgets } from '@/widgets/registry';
import { AiPanel } from '@/components/panels/AiPanel';
import { LayersTree } from '@/components/layers/LayersTree';
import { MarketplacePanel } from '@/components/panels/MarketplacePanel';
import { useWidgetRegistryVersion } from '@/hooks/useWidgetRegistryVersion';

type PanelTab = 'layers' | 'widgets' | 'ai' | 'marketplace';

const STATIC_PALETTE_GROUPS = [
  {
    label: 'Layout',
    items: [
      { type: 'section',    label: 'Section',    icon: <Frame size={14} strokeWidth={1.5} /> },
      { type: 'container',  label: 'Container',  icon: <Square size={14} strokeWidth={1.5} /> },
      { type: 'columns',    label: 'Columns',    icon: <Columns size={14} strokeWidth={1.5} /> },
      { type: 'nexus-grid', label: 'Grid',       icon: <LayoutGrid size={14} strokeWidth={1.5} /> },
      { type: 'spacer',     label: 'Spacer',     icon: <MinusIcon size={14} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Content',
    items: [
      { type: 'heading',   label: 'Heading',   icon: <Heading1 size={14} strokeWidth={1.5} /> },
      { type: 'paragraph', label: 'Text',      icon: <AlignLeft size={14} strokeWidth={1.5} /> },
      { type: 'button',    label: 'Button',    icon: <MousePointer2 size={14} strokeWidth={1.5} /> },
      { type: 'image',     label: 'Image',     icon: <Image size={14} strokeWidth={1.5} /> },
      { type: 'divider',   label: 'Divider',   icon: <MinusIcon size={14} strokeWidth={1.5} /> },
      { type: 'list',      label: 'List',      icon: <List size={14} strokeWidth={1.5} /> },
      { type: 'icon',      label: 'Icon',      icon: <Star size={14} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { type: 'tabs',        label: 'Tabs',        icon: <Component size={14} strokeWidth={1.5} /> },
      { type: 'accordion',   label: 'Accordion',   icon: <ChevronDown size={14} strokeWidth={1.5} /> },
      { type: 'alert',       label: 'Alert',       icon: <Zap size={14} strokeWidth={1.5} /> },
      { type: 'testimonial', label: 'Testimonial', icon: <FileText size={14} strokeWidth={1.5} /> },
      { type: 'video',       label: 'Video',       icon: <Square size={14} strokeWidth={1.5} /> },
      { type: 'html',        label: 'HTML',        icon: <Type size={14} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Forms',
    items: [
      { type: 'nexus-auth', label: 'Login Form', icon: <LogIn size={14} strokeWidth={1.5} /> },
    ],
  },
];

/** Build the full palette groups, merging in any dynamically-registered addon widgets. */
function buildPaletteGroups(registryVersion: number) {
  // registryVersion is consumed so useMemo re-runs when the registry changes
  void registryVersion;

  const allWidgets = getAllWidgets();
  const staticTypes = new Set(
    STATIC_PALETTE_GROUPS.flatMap((g) => g.items.map((i) => i.type)),
  );

  // Collect addon-registered widgets not already in the static palette
  const addonItems = allWidgets
    .filter((w) => !staticTypes.has(w.type))
    .map((w) => ({
      type:  w.type,
      label: w.label ?? w.type,
      icon:  w.icon ? <w.icon size={14} strokeWidth={1.5} /> : <Sparkles size={14} strokeWidth={1.5} />,
    }));

  if (addonItems.length === 0) return STATIC_PALETTE_GROUPS;

  return [
    ...STATIC_PALETTE_GROUPS,
    { label: 'Addons', items: addonItems },
  ];
}

function PaletteItem({ type, label, icon }: { type: string; label: string; icon: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:   `palette-${type}`,
    data: { type: 'palette', widgetType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-md cursor-grab active:cursor-grabbing select-none',
        'transition-colors duration-[120ms] text-[13px]',
        isDragging && 'opacity-50',
      )}
      style={{ color: '#dde4dd' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <span style={{ color: '#bbcabf', flexShrink: 0 }}>{icon}</span>
      {label}
    </div>
  );
}

function LayerNode({ nodeId, depth = 0 }: { nodeId: string; depth?: number }) {
  const node            = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const primarySelected = useSelectionStore((s) => s.primarySelectedId);
  const selectNode      = useSelectionStore((s) => s.selectNode);
  const [expanded, setExpanded] = useState(true);

  if (!node) return null;

  const def         = getWidget(node.type);
  const hasChildren = node.children?.length > 0;
  const isSelected  = primarySelected === nodeId;
  const TypeIcon    = def?.icon;

  return (
    <div>
      <div
        onClick={() => selectNode(nodeId)}
        onDoubleClick={() => hasChildren && setExpanded((v) => !v)}
        style={{
          paddingLeft: `${10 + depth * 16}px`,
          background:  isSelected ? 'rgba(16,183,127,0.15)' : 'transparent',
          color:       isSelected ? '#50dea3' : '#dde4dd',
        }}
        className="flex items-center gap-1.5 h-8 pr-2 cursor-pointer rounded-md mx-1 select-none transition-colors duration-[120ms]"
        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
        >
          {hasChildren
            ? (expanded
              ? <ChevronDown  size={11} style={{ color: isSelected ? '#50dea3' : '#bbcabf' }} />
              : <ChevronRight size={11} style={{ color: isSelected ? '#50dea3' : '#bbcabf' }} />)
            : <span className="w-4" />}
        </button>
        <span className="flex-shrink-0" style={{ color: isSelected ? '#50dea3' : '#bbcabf' }}>
          {TypeIcon ? <TypeIcon size={13} /> : <Square size={13} />}
        </span>
        <span className="text-[13px] truncate leading-none">
          {node.label ?? def?.label ?? node.type}
        </span>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.filter(Boolean).map((childId) => (
            <LayerNode key={childId} nodeId={childId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function PagesSection() {
  const adapter  = useAdapter();
  const page     = useCanvasStore((s) => s.page);
  const loadPage = useCanvasStore((s) => s.loadPage);
  const [pages,   setPages]   = useState<NexusPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adapter.data.listPages()
      .then((r) => setPages(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [adapter]);

  const handleSwitch = async (id: string) => {
    if (id === page?.id) return;
    try { loadPage(await adapter.data.getPage(id)); } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    try {
      const p = await adapter.data.createPage({ title: 'New Page', slug: `page-${Date.now()}` });
      setPages((prev) => [...prev, p]);
      loadPage(p);
    } catch { /* ignore */ }
  };

  const rowStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'rgba(16,183,127,0.15)' : 'transparent',
    color:      active ? '#50dea3' : '#dde4dd',
  });

  return (
    <div>
      <div className="flex items-center justify-between px-3.5 py-2">
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#bbcabf' }}>Pages</span>
        <button
          onClick={handleCreate} title="New page"
          style={{ color: '#bbcabf' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#dde4dd')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#bbcabf')}
        ><Plus size={14} strokeWidth={1.5} /></button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 size={14} className="animate-spin" style={{ color: '#bbcabf' }} />
        </div>
      ) : pages.map((p) => (
        <div
          key={p.id}
          onClick={() => handleSwitch(p.id)}
          className="flex items-center gap-2.5 px-3.5 h-8 cursor-pointer rounded-md mx-1 text-[13px] select-none transition-colors duration-[120ms]"
          style={rowStyle(p.id === page?.id)}
          onMouseEnter={(e) => { if (p.id !== page?.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
          onMouseLeave={(e) => { if (p.id !== page?.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <FileText size={13} className="flex-shrink-0 opacity-70" />
          <span className="truncate">{p.title}</span>
        </div>
      ))}
    </div>
  );
}

export function LeftPanel() {
  const leftPanelOpen  = useUIStore((s) => s.leftPanelOpen);
  const activeLeftTab  = useUIStore((s) => s.activeLeftTab);
  const setLeftTab     = useUIStore((s) => s.setLeftTab);
  const page           = useCanvasStore((s) => s.page);
  const [search, setSearch] = useState('');

  // Reactive: re-builds palette groups when addons register / unregister widgets
  const registryVersion = useWidgetRegistryVersion();
  const paletteGroups   = useMemo(
    () => buildPaletteGroups(registryVersion),
    [registryVersion],
  );

  if (!leftPanelOpen) return null;

  const tab: PanelTab =
    activeLeftTab === 'layers'      ? 'layers'      :
    activeLeftTab === 'widgets'     ? 'widgets'     :
    activeLeftTab === 'ai'          ? 'ai'          :
    activeLeftTab === 'marketplace' ? 'marketplace' :
    'layers';

  const TABS: { id: PanelTab; label: string; icon?: React.ReactNode }[] = [
    { id: 'layers',      label: 'Layers'  },
    { id: 'widgets',     label: 'Widgets' },
    { id: 'ai',          label: 'AI'      },
    { id: 'marketplace', label: 'Store', icon: <Store size={11} strokeWidth={1.5} /> },
  ];

  return (
    <aside
      className="flex flex-col shrink-0 overflow-hidden"
      style={{ width: 264, background: '#0e1511', borderRight: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Tab bar */}
      <div className="flex items-center shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setLeftTab(t.id as Parameters<typeof setLeftTab>[0])}
            className="flex-1 h-10 text-[12px] font-medium transition-colors duration-[120ms]"
            style={{
              color:        tab === t.id ? '#50dea3' : '#bbcabf',
              borderBottom: tab === t.id ? '2px solid #10b77f' : '2px solid transparent',
              background:   'transparent',
            }}
            onMouseEnter={(e) => { if (tab !== t.id) (e.currentTarget as HTMLElement).style.color = '#dde4dd'; }}
            onMouseLeave={(e) => { if (tab !== t.id) (e.currentTarget as HTMLElement).style.color = '#bbcabf'; }}
          >
            {t.icon
              ? <span className="flex items-center justify-center gap-1">{t.icon}{t.label}</span>
              : t.label}
          </button>
        ))}
      </div>

      {/* AI tab */}
      {tab === 'ai' && (
        <div className="flex-1 overflow-hidden">
          <AiPanel />
        </div>
      )}

      {/* Marketplace tab */}
      {tab === 'marketplace' && (
        <div className="flex-1 overflow-hidden" data-testid="marketplace-tab-content">
          <MarketplacePanel />
        </div>
      )}

      {/* Search bar (Layers + Widgets only) */}
      {(tab === 'layers' || tab === 'widgets') && (
        <div className="px-2.5 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 rounded-md px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Search size={13} style={{ color: '#bbcabf', flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'layers' ? 'Search layers…' : 'Search widgets…'}
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: '#dde4dd' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ color: '#bbcabf' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#dde4dd')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#bbcabf')}>×</button>
            )}
          </div>
        </div>
      )}

      {/* Layers tab */}
      {tab === 'layers' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar py-1.5">
          <PagesSection />
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-3.5 py-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#bbcabf' }}>Layers</span>
            </div>
            <LayersTree search={search} />
          </div>
        </div>
      )}

      {/* Widgets tab */}
      {tab === 'widgets' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
          {paletteGroups.map((group) => (
            <div key={group.label} className="mb-3">
              <div className="px-3.5 py-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#bbcabf' }}>
                  {group.label}
                </span>
              </div>
              <div className="px-1.5">
                {group.items
                  .filter((item) => !search || item.label.toLowerCase().includes(search.toLowerCase()))
                  .map((item) => <PaletteItem key={item.type} {...item} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
