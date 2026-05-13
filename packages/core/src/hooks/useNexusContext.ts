/**
 * useNexusContext — The "Component Context" hook.
 *
 * Any widget (including third-party addons) can call this hook to determine
 * whether it is currently being rendered inside the visual builder (edit mode)
 * or in the final published page (preview mode).
 *
 * This is the architectural boundary that allows "Smart Components" like
 * AuthWidget and ChatWidget to disable real API calls while a designer is
 * styling them, and re-enable full functionality at preview/publish time.
 *
 * Usage inside any widget:
 *   const { isEdit, isPreview } = useNexusContext();
 *   if (isPreview) { // run real form submission }
 */

import { useUIStore } from '../store/ui.store.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NexusMode = 'edit' | 'preview';

export interface NexusContext {
  /** The current render mode. */
  mode: NexusMode;
  /** True when the widget is inside the visual builder canvas. */
  isEdit: boolean;
  /** True when the widget is being previewed or published. */
  isPreview: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNexusContext(): NexusContext {
  const isPreviewMode = useUIStore((s) => s.isPreviewMode);

  return {
    mode:      isPreviewMode ? 'preview' : 'edit',
    isEdit:    !isPreviewMode,
    isPreview: isPreviewMode,
  };
}
