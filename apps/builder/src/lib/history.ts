/**
 * History helpers — push a snapshot to HistoryStore before a mutation.
 *
 * Call pushHistory(label) BEFORE the canvas mutation so undo can
 * restore the state from before the change.
 */

import { useCanvasStore } from '@nexus/core';
import { useHistoryStore } from '@nexus/core';

export function pushHistory(label: string): void {
  const page = useCanvasStore.getState().page;
  if (page) {
    useHistoryStore.getState().push(label, page);
  }
}
