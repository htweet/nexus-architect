/**
 * DragOverContext — Tracks which node the cursor is hovering during a drag.
 *
 * This is transient UI state (not persisted) so we use React Context
 * rather than Zustand. The DndContext in Builder.tsx is the producer;
 * container/root renderers are the consumers to show drop indicators.
 */

import { createContext, useContext } from 'react';

export interface DragOverState {
  /** The dnd-kit `over.id` — could be a sortable node ID or "drop:containerId" */
  overId: string | null;
  /** The ID of the node currently being dragged */
  activeId: string | null;
}

const DragOverContext = createContext<DragOverState>({
  overId: null,
  activeId: null,
});

export const DragOverProvider = DragOverContext.Provider;
export const useDragOver = () => useContext(DragOverContext);
