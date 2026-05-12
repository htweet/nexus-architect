/**
 * CanvasStore — The live page tree.
 *
 * Every drag, drop, prop change, and style mutation flows through here.
 * Uses subscribeWithSelector so individual node subscribers only re-render
 * when their specific node changes — not on every unrelated mutation.
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { createNode } from '../types/schema.js';
import type { NexusNode, NexusPage, NodeStyles, NodeVisibility } from '../types/schema.js';

// ─── State Shape ─────────────────────────────────────────────────────────────

interface CanvasState {
  page: NexusPage | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveError: string | null;
}

// ─── Action Shape ─────────────────────────────────────────────────────────────

interface CanvasActions {
  /** Load a full page from the adapter into the canvas. */
  loadPage: (page: NexusPage) => void;

  /** Clear the canvas and reset to an empty page. */
  clearCanvas: () => void;

  /** Update a node's props (content, configuration). */
  updateNodeProps: (nodeId: string, props: Record<string, unknown>) => void;

  /** Update a node's style map. Merges breakpoint styles. */
  updateNodeStyles: (nodeId: string, styles: NodeStyles) => void;

  /** Update a node's visibility map. */
  updateNodeVisibility: (nodeId: string, visibility: NodeVisibility) => void;

  /** Update a node's label (shown in the Layers panel). */
  updateNodeLabel: (nodeId: string, label: string) => void;

  /** Toggle a node's locked state. */
  toggleNodeLock: (nodeId: string) => void;

  /** Toggle a node's hidden state. */
  toggleNodeHidden: (nodeId: string) => void;

  /**
   * Add a new node to the tree.
   * @param node - The fully formed node to insert.
   * @param parentId - ID of the container node to insert into.
   * @param index - Position in parent's children array. Defaults to end.
   */
  addNode: (node: Omit<NexusNode, '_v' | '_ops'>, parentId: string, index?: number) => void;

  /**
   * Remove a node and all its descendants from the tree.
   * Also removes it from its parent's children array.
   */
  removeNode: (nodeId: string) => void;

  /**
   * Move a node to a new parent at a specific position.
   * Handles removal from old parent and insertion into new parent atomically.
   */
  moveNode: (nodeId: string, newParentId: string, newIndex: number) => void;

  /** Duplicate a node and all its descendants. Returns the new root node ID. */
  duplicateNode: (nodeId: string) => string | null;

  /** Mark the canvas as having unsaved changes. */
  markDirty: () => void;

  /** Mark the canvas as cleanly saved. */
  markSaved: () => void;

  /** Set the saving flag directly. */
  setSaving: (saving: boolean) => void;

  /** Record a save error. */
  setSaveError: (error: string | null) => void;

  /** Update page-level metadata (title, slug, seoMeta, globalStyles, customCss, customJs). */
  updatePageMeta: (updates: Partial<Pick<NexusPage, 'title' | 'slug' | 'description' | 'seoMeta' | 'globalStyles' | 'customCss' | 'customJs'>>) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export type CanvasStore = CanvasState & CanvasActions;

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // ── Initial State ─────────────────────────────────────────────────────
      page: null,
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      saveError: null,

      // ── Actions ───────────────────────────────────────────────────────────
      loadPage: (page) => set({ page, isDirty: false, saveError: null }, false, 'canvas/loadPage'),

      clearCanvas: () =>
        set({ page: null, isDirty: false, saveError: null }, false, 'canvas/clearCanvas'),

      updateNodeProps: (nodeId, props) =>
        set(
          (state) => {
            if (!state.page?.nodeMap[nodeId]) return state;
            return {
              isDirty: true,
              page: {
                ...state.page,
                updatedAt: new Date().toISOString(),
                nodeMap: {
                  ...state.page.nodeMap,
                  [nodeId]: {
                    ...state.page.nodeMap[nodeId]!,
                    props: { ...state.page.nodeMap[nodeId]!.props, ...props },
                  },
                },
              },
            };
          },
          false,
          'canvas/updateNodeProps',
        ),

      updateNodeStyles: (nodeId, styles) =>
        set(
          (state) => {
            if (!state.page?.nodeMap[nodeId]) return state;
            const existing = state.page.nodeMap[nodeId]!;
            const merged = { ...existing.styles };
            for (const [bp, bpStyles] of Object.entries(styles)) {
              merged[bp as keyof typeof styles] = {
                ...(merged[bp as keyof typeof merged] ?? {}),
                ...bpStyles,
              };
            }
            return {
              isDirty: true,
              page: {
                ...state.page,
                updatedAt: new Date().toISOString(),
                nodeMap: {
                  ...state.page.nodeMap,
                  [nodeId]: { ...existing, styles: merged },
                },
              },
            };
          },
          false,
          'canvas/updateNodeStyles',
        ),

      updateNodeVisibility: (nodeId, visibility) =>
        set(
          (state) => {
            if (!state.page?.nodeMap[nodeId]) return state;
            return {
              isDirty: true,
              page: {
                ...state.page,
                updatedAt: new Date().toISOString(),
                nodeMap: {
                  ...state.page.nodeMap,
                  [nodeId]: {
                    ...state.page.nodeMap[nodeId]!,
                    visibility: { ...state.page.nodeMap[nodeId]!.visibility, ...visibility },
                  },
                },
              },
            };
          },
          false,
          'canvas/updateNodeVisibility',
        ),

      updateNodeLabel: (nodeId, label) =>
        set(
          (state) => {
            if (!state.page?.nodeMap[nodeId]) return state;
            return {
              isDirty: true,
              page: {
                ...state.page,
                nodeMap: {
                  ...state.page.nodeMap,
                  [nodeId]: { ...state.page.nodeMap[nodeId]!, label },
                },
              },
            };
          },
          false,
          'canvas/updateNodeLabel',
        ),

      toggleNodeLock: (nodeId) =>
        set(
          (state) => {
            if (!state.page?.nodeMap[nodeId]) return state;
            return {
              isDirty: true,
              page: {
                ...state.page,
                nodeMap: {
                  ...state.page.nodeMap,
                  [nodeId]: {
                    ...state.page.nodeMap[nodeId]!,
                    locked: !state.page.nodeMap[nodeId]!.locked,
                  },
                },
              },
            };
          },
          false,
          'canvas/toggleNodeLock',
        ),

      toggleNodeHidden: (nodeId) =>
        set(
          (state) => {
            if (!state.page?.nodeMap[nodeId]) return state;
            return {
              isDirty: true,
              page: {
                ...state.page,
                nodeMap: {
                  ...state.page.nodeMap,
                  [nodeId]: {
                    ...state.page.nodeMap[nodeId]!,
                    hidden: !state.page.nodeMap[nodeId]!.hidden,
                  },
                },
              },
            };
          },
          false,
          'canvas/toggleNodeHidden',
        ),

      addNode: (nodeData, parentId, index) =>
        set(
          (state) => {
            if (!state.page?.nodeMap[parentId]) return state;
            const node = createNode(nodeData as Pick<NexusNode, 'id' | 'type'> & Partial<NexusNode>);
            const parent = state.page.nodeMap[parentId]!;
            const newChildren = [...parent.children];
            const insertAt = index ?? newChildren.length;
            newChildren.splice(insertAt, 0, node.id);
            return {
              isDirty: true,
              page: {
                ...state.page,
                updatedAt: new Date().toISOString(),
                nodeMap: {
                  ...state.page.nodeMap,
                  [node.id]: { ...node, parentId },
                  [parentId]: { ...parent, children: newChildren },
                },
              },
            };
          },
          false,
          'canvas/addNode',
        ),

      removeNode: (nodeId) =>
        set(
          (state) => {
            if (!state.page) return state;
            const node = state.page.nodeMap[nodeId];
            if (!node) return state;

            // Collect all descendant IDs for bulk removal
            const toRemove = new Set<string>();
            const collect = (id: string) => {
              toRemove.add(id);
              state.page!.nodeMap[id]?.children.forEach(collect);
            };
            collect(nodeId);

            const newMap = { ...state.page.nodeMap };
            toRemove.forEach((id) => { delete newMap[id]; });

            // Remove from parent's children array
            if (node.parentId && newMap[node.parentId]) {
              newMap[node.parentId] = {
                ...newMap[node.parentId]!,
                children: newMap[node.parentId]!.children.filter((id) => id !== nodeId),
              };
            }

            return {
              isDirty: true,
              page: {
                ...state.page,
                updatedAt: new Date().toISOString(),
                nodeMap: newMap,
              },
            };
          },
          false,
          'canvas/removeNode',
        ),

      moveNode: (nodeId, newParentId, newIndex) =>
        set(
          (state) => {
            if (!state.page) return state;
            const node = state.page.nodeMap[nodeId];
            const newParent = state.page.nodeMap[newParentId];
            if (!node || !newParent) return state;

            const newMap = { ...state.page.nodeMap };

            // Remove from old parent
            if (node.parentId && newMap[node.parentId]) {
              newMap[node.parentId] = {
                ...newMap[node.parentId]!,
                children: newMap[node.parentId]!.children.filter((id) => id !== nodeId),
              };
            }

            // Insert into new parent
            const newChildren = [...newParent.children.filter((id) => id !== nodeId)];
            newChildren.splice(newIndex, 0, nodeId);
            newMap[newParentId] = { ...newParent, children: newChildren };
            newMap[nodeId] = { ...node, parentId: newParentId };

            return {
              isDirty: true,
              page: {
                ...state.page,
                updatedAt: new Date().toISOString(),
                nodeMap: newMap,
              },
            };
          },
          false,
          'canvas/moveNode',
        ),

      duplicateNode: (nodeId) => {
        const state = get();
        if (!state.page?.nodeMap[nodeId]) return null;

        const generateId = () => `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        const cloneSubtree = (id: string, newMap: Record<string, NexusNode>): NexusNode => {
          const original = state.page!.nodeMap[id]!;
          const newId = generateId();
          const clonedChildren = original.children.map((childId) => {
            const clonedChild = cloneSubtree(childId, newMap);
            newMap[clonedChild.id] = { ...clonedChild, parentId: newId };
            return clonedChild.id;
          });
          return {
            ...original,
            id: newId,
            children: clonedChildren,
            _ops: [],
          };
        };

        const extraNodes: Record<string, NexusNode> = {};
        const clonedRoot = cloneSubtree(nodeId, extraNodes);
        const originalNode = state.page.nodeMap[nodeId]!;

        set(
          (st) => {
            if (!st.page) return st;
            const newMap = { ...st.page.nodeMap, ...extraNodes };
            newMap[clonedRoot.id] = { ...clonedRoot, parentId: originalNode.parentId };

            // Insert after the original in parent's children
            if (originalNode.parentId && newMap[originalNode.parentId]) {
              const siblings = [...newMap[originalNode.parentId]!.children];
              const originalIndex = siblings.indexOf(nodeId);
              siblings.splice(originalIndex + 1, 0, clonedRoot.id);
              newMap[originalNode.parentId] = { ...newMap[originalNode.parentId]!, children: siblings };
            }

            return {
              isDirty: true,
              page: {
                ...st.page,
                updatedAt: new Date().toISOString(),
                nodeMap: newMap,
              },
            };
          },
          false,
          'canvas/duplicateNode',
        );

        return clonedRoot.id;
      },

      markDirty: () => set({ isDirty: true }, false, 'canvas/markDirty'),

      markSaved: () =>
        set(
          { isDirty: false, isSaving: false, lastSavedAt: new Date(), saveError: null },
          false,
          'canvas/markSaved',
        ),

      setSaving: (saving) => set({ isSaving: saving }, false, 'canvas/setSaving'),

      setSaveError: (error) =>
        set({ saveError: error, isSaving: false }, false, 'canvas/setSaveError'),

      updatePageMeta: (updates) =>
        set(
          (state) => {
            if (!state.page) return state;
            return {
              isDirty: true,
              page: {
                ...state.page,
                ...updates,
                updatedAt: new Date().toISOString(),
              },
            };
          },
          false,
          'canvas/updatePageMeta',
        ),
    })),
    { name: 'NexusCanvasStore' },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Get a single node from the canvas by ID. */
export const selectNode = (nodeId: string) => (state: CanvasStore) =>
  state.page?.nodeMap[nodeId] ?? null;

/** Get the root node of the current page. */
export const selectRootNode = (state: CanvasStore) =>
  state.page ? (state.page.nodeMap[state.page.rootNodeId] ?? null) : null;

/** True when the canvas has a loaded page. */
export const selectHasPage = (state: CanvasStore) => state.page !== null;

/** Auto-save status label for the top bar. */
export const selectSaveStatus = (state: CanvasStore): 'saved' | 'saving' | 'dirty' | 'error' => {
  if (state.saveError) return 'error';
  if (state.isSaving) return 'saving';
  if (state.isDirty)  return 'dirty';
  return 'saved';
};

