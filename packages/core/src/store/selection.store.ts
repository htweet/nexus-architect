/**
 * SelectionStore — Tracks what the user has selected on the canvas.
 *
 * Kept separate from CanvasStore so panel components only re-render
 * when the selection changes, not on every canvas mutation.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActiveRightPanel = 'element' | 'page' | 'navigator';

interface SelectionState {
  /** Currently selected node IDs. Multiple = multi-select via Shift+click. */
  selectedIds: string[];
  /** The "primary" selected node (last clicked). */
  primarySelectedId: string | null;
  /** Which right panel section is active. */
  activeRightPanel: ActiveRightPanel;
  /** Node currently being hovered over on canvas. */
  hoveredId: string | null;
  /** Node currently open for inline rich-text editing (double-click activated). */
  editingNodeId: string | null;
}

interface SelectionActions {
  /** Select a single node. Replaces any existing selection. */
  selectNode: (nodeId: string) => void;

  /** Add or remove a node from the selection (Shift+click behavior). */
  toggleNodeSelection: (nodeId: string) => void;

  /** Clear the entire selection. */
  clearSelection: () => void;

  /** Select all children of a parent. */
  selectChildren: (parentId: string, childIds: string[]) => void;

  /** Set the hovered node. */
  setHovered: (nodeId: string | null) => void;

  /** Switch the active right panel. */
  setActiveRightPanel: (panel: ActiveRightPanel) => void;

  /** Enter inline editing mode for a node. */
  setEditingNode: (nodeId: string | null) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export type SelectionStore = SelectionState & SelectionActions;

export const useSelectionStore = create<SelectionStore>()(
  devtools(
    (set) => ({
      // ── Initial State ─────────────────────────────────────────────────────
      selectedIds: [],
      primarySelectedId: null,
      activeRightPanel: 'page',
      hoveredId: null,
      editingNodeId: null,

      // ── Actions ───────────────────────────────────────────────────────────
      selectNode: (nodeId) =>
        set(
          {
            selectedIds: [nodeId],
            primarySelectedId: nodeId,
            activeRightPanel: 'element',
          },
          false,
          'selection/selectNode',
        ),

      toggleNodeSelection: (nodeId) =>
        set(
          (state) => {
            const isSelected = state.selectedIds.includes(nodeId);
            const newIds = isSelected
              ? state.selectedIds.filter((id) => id !== nodeId)
              : [...state.selectedIds, nodeId];
            return {
              selectedIds: newIds,
              primarySelectedId: newIds.at(-1) ?? null,
              activeRightPanel: newIds.length > 0 ? 'element' : 'page',
            };
          },
          false,
          'selection/toggleNodeSelection',
        ),

      clearSelection: () =>
        set(
          { selectedIds: [], primarySelectedId: null, activeRightPanel: 'page', editingNodeId: null },
          false,
          'selection/clearSelection',
        ),

      selectChildren: (_, childIds) =>
        set(
          {
            selectedIds: childIds,
            primarySelectedId: childIds.at(-1) ?? null,
            activeRightPanel: childIds.length > 0 ? 'element' : 'page',
          },
          false,
          'selection/selectChildren',
        ),

      setHovered: (nodeId) => set({ hoveredId: nodeId }, false, 'selection/setHovered'),

      setActiveRightPanel: (panel) =>
        set({ activeRightPanel: panel }, false, 'selection/setActiveRightPanel'),

      setEditingNode: (nodeId) =>
        set({ editingNodeId: nodeId }, false, 'selection/setEditingNode'),
    }),
    { name: 'NexusSelectionStore' },
  ),
);
