/**
 * NodeContextMenu — right-click context menu for canvas nodes.
 *
 * Uses @radix-ui/react-dropdown-menu (already installed) with a
 * zero-size virtual trigger positioned at the cursor so the menu
 * opens exactly where the user right-clicked.
 */

import { useState, useCallback } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Copy, Trash2, Lock, Unlock, Eye, EyeOff,
  ArrowUp, ArrowDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useCanvasStore, useSelectionStore } from '@nexus/core';
import { pushHistory } from '@/lib/history';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NodeContextMenuProps {
  nodeId: string;
  children: React.ReactNode;
}

// ─── Menu Item component ──────────────────────────────────────────────────────

function MenuItem({
  icon: Icon,
  label,
  shortcut,
  destructive,
  onSelect,
}: {
  icon: typeof Copy;
  label: string;
  shortcut?: string;
  destructive?: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        'flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md cursor-default select-none',
        'outline-none transition-colors duration-100',
        destructive
          ? 'text-[#ffb4ab] data-[highlighted]:bg-error/15 data-[highlighted]:text-[#ffb4ab]'
          : 'text-[#bbcabf] data-[highlighted]:bg-[rgba(255,255,255,0.08)] data-[highlighted]:text-[#dde4dd]',
      )}
    >
      <Icon size={12} strokeWidth={2} className="shrink-0" />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-[#bbcabf] text-[10px] font-mono ml-2">{shortcut}</span>
      )}
    </DropdownMenu.Item>
  );
}

function MenuSeparator() {
  return (
    <DropdownMenu.Separator
      className="my-1 h-px"
      style={{ background: 'rgba(255,255,255,0.10)' }}
    />
  );
}

// ─── NodeContextMenu ──────────────────────────────────────────────────────────

export function NodeContextMenu({ nodeId, children }: NodeContextMenuProps) {
  const [open, setOpen]       = useState(false);
  const [cursor, setCursor]   = useState({ x: 0, y: 0 });

  const node         = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const removeNode   = useCanvasStore((s) => s.removeNode);
  const duplicateNode= useCanvasStore((s) => s.duplicateNode);
  const toggleLock   = useCanvasStore((s) => s.toggleNodeLock);
  const toggleHidden = useCanvasStore((s) => s.toggleNodeHidden);
  const moveNode     = useCanvasStore((s) => s.moveNode);
  const selectNode   = useSelectionStore((s) => s.selectNode);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Select this node if not already
    selectNode(nodeId);
    setCursor({ x: e.clientX, y: e.clientY });
    setOpen(true);
  }, [nodeId, selectNode]);

  if (!node) return <>{children}</>;

  // ── Sibling position helpers ──────────────────────────────────────────────
  const getSiblings = () => {
    if (!node.parentId) return [];
    const page = useCanvasStore.getState().page;
    return page?.nodeMap[node.parentId]?.children.filter(Boolean) ?? [];
  };

  const canMoveUp = () => {
    const siblings = getSiblings();
    const idx = siblings.indexOf(nodeId);
    return idx > 0;
  };

  const canMoveDown = () => {
    const siblings = getSiblings();
    const idx = siblings.indexOf(nodeId);
    return idx >= 0 && idx < siblings.length - 1;
  };

  const handleMoveUp = () => {
    if (!node.parentId) return;
    const siblings = getSiblings();
    const idx = siblings.indexOf(nodeId);
    if (idx <= 0) return;
    pushHistory('Move Up');
    moveNode(nodeId, node.parentId, idx - 1);
  };

  const handleMoveDown = () => {
    if (!node.parentId) return;
    const siblings = getSiblings();
    const idx = siblings.indexOf(nodeId);
    if (idx < 0 || idx >= siblings.length - 1) return;
    pushHistory('Move Down');
    moveNode(nodeId, node.parentId, idx + 2);
  };

  const handleDuplicate = () => {
    pushHistory('Duplicate');
    const newId = duplicateNode(nodeId);
    if (newId) selectNode(newId);
  };

  const handleDelete = () => {
    pushHistory('Delete');
    removeNode(nodeId);
    clearSelection();
  };

  return (
    <div onContextMenu={handleContextMenu} className="contents">
      {children}

      <DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
        {/* Zero-size virtual trigger positioned at cursor */}
        <DropdownMenu.Trigger asChild>
          <button
            aria-hidden
            tabIndex={-1}
            style={{
              position: 'fixed',
              top:    cursor.y,
              left:   cursor.x,
              width:  1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
              padding: 0,
              border: 'none',
              background: 'transparent',
            }}
          />
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={2}
            className="z-[99999] min-w-[180px] rounded-lg p-1.5 outline-none animate-fade-in"
            style={{
              background:  '#0e1511',
              border:      '1px solid rgba(255,255,255,0.10)',
              boxShadow:   '0 10px 30px rgba(0,0,0,0.5)',
            }}
          >
            {/* Move */}
            <MenuItem
              icon={ArrowUp}
              label="Move Up"
              onSelect={handleMoveUp}
              shortcut="↑"
            />
            <MenuItem
              icon={ArrowDown}
              label="Move Down"
              onSelect={handleMoveDown}
              shortcut="↓"
            />

            <MenuSeparator />

            {/* Duplicate */}
            <MenuItem
              icon={Copy}
              label="Duplicate"
              shortcut="⌘D"
              onSelect={handleDuplicate}
            />

            {/* Lock */}
            <MenuItem
              icon={node.locked ? Unlock : Lock}
              label={node.locked ? 'Unlock' : 'Lock'}
              onSelect={() => { pushHistory('Toggle Lock'); toggleLock(nodeId); }}
            />

            {/* Hide */}
            <MenuItem
              icon={node.hidden ? Eye : EyeOff}
              label={node.hidden ? 'Show' : 'Hide'}
              onSelect={() => { pushHistory('Toggle Visibility'); toggleHidden(nodeId); }}
            />

            <MenuSeparator />

            {/* Delete */}
            <MenuItem
              icon={Trash2}
              label="Delete"
              shortcut="⌫"
              destructive
              onSelect={handleDelete}
            />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
