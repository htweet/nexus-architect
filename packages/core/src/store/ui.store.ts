/**
 * UIStore — Pure UI state. Zero business logic.
 *
 * Covers: active breakpoint, panel visibility, zoom level, preview mode.
 * Nothing in this store touches the page data — that lives in CanvasStore.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActiveBreakpoint = 'desktop' | 'tablet' | 'mobile';
export type LeftPanelTab = 'widgets' | 'layers' | 'templates' | 'ai' | 'marketplace';

export const BREAKPOINT_CANVAS_WIDTHS: Record<ActiveBreakpoint, number | null> = {
  desktop: null,
  tablet: 768,
  mobile: 390,
};

// ─── State ───────────────────────────────────────────────────────────────────

interface UIState {
  activeBreakpoint: ActiveBreakpoint;
  activeLeftTab: LeftPanelTab;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  zoomLevel: number;
  isPreviewMode: boolean;
  isPublishing: boolean;
  showUpgradeModal: boolean;
  upgradeModalFeature: string | null;
}

interface UIActions {
  setBreakpoint: (bp: ActiveBreakpoint) => void;
  setLeftTab: (tab: LeftPanelTab) => void;
  openLeftPanel: (tab?: LeftPanelTab) => void;
  closeLeftPanel: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setZoom: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  enterPreview: () => void;
  exitPreview: () => void;
  setPublishing: (val: boolean) => void;
  openUpgradeModal: (feature: string) => void;
  closeUpgradeModal: () => void;
}

export type UIStore = UIState & UIActions;

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
const clampZoom = (v: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, parseFloat(v.toFixed(2))));

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        activeBreakpoint: 'desktop',
        activeLeftTab: 'widgets',
        leftPanelOpen: true,
        rightPanelOpen: true,
        zoomLevel: 1,
        isPreviewMode: false,
        isPublishing: false,
        showUpgradeModal: false,
        upgradeModalFeature: null,

        setBreakpoint: (bp) => set({ activeBreakpoint: bp }, false, 'ui/setBreakpoint'),

        setLeftTab: (tab) => set({ activeLeftTab: tab }, false, 'ui/setLeftTab'),

        openLeftPanel: (tab) =>
          set(
            (s) => ({ leftPanelOpen: true, activeLeftTab: tab ?? s.activeLeftTab }),
            false,
            'ui/openLeftPanel',
          ),

        closeLeftPanel: () => set({ leftPanelOpen: false }, false, 'ui/closeLeftPanel'),

        toggleLeftPanel: () =>
          set((s) => ({ leftPanelOpen: !s.leftPanelOpen }), false, 'ui/toggleLeftPanel'),

        toggleRightPanel: () =>
          set((s) => ({ rightPanelOpen: !s.rightPanelOpen }), false, 'ui/toggleRightPanel'),

        setZoom: (level) => set({ zoomLevel: clampZoom(level) }, false, 'ui/setZoom'),

        zoomIn: () =>
          set((s) => ({ zoomLevel: clampZoom(s.zoomLevel + ZOOM_STEP) }), false, 'ui/zoomIn'),

        zoomOut: () =>
          set((s) => ({ zoomLevel: clampZoom(s.zoomLevel - ZOOM_STEP) }), false, 'ui/zoomOut'),

        resetZoom: () => set({ zoomLevel: 1 }, false, 'ui/resetZoom'),

        enterPreview: () =>
          set(
            { isPreviewMode: true, leftPanelOpen: false, rightPanelOpen: false },
            false,
            'ui/enterPreview',
          ),

        exitPreview: () =>
          set(
            { isPreviewMode: false, leftPanelOpen: true, rightPanelOpen: true },
            false,
            'ui/exitPreview',
          ),

        setPublishing: (val) => set({ isPublishing: val }, false, 'ui/setPublishing'),

        openUpgradeModal: (feature) =>
          set(
            { showUpgradeModal: true, upgradeModalFeature: feature },
            false,
            'ui/openUpgradeModal',
          ),

        closeUpgradeModal: () =>
          set(
            { showUpgradeModal: false, upgradeModalFeature: null },
            false,
            'ui/closeUpgradeModal',
          ),
      }),
      {
        name: 'nexus-ui-preferences',
        partialize: (state) => ({
          activeBreakpoint: state.activeBreakpoint,
          activeLeftTab: state.activeLeftTab,
          leftPanelOpen: state.leftPanelOpen,
          rightPanelOpen: state.rightPanelOpen,
          zoomLevel: state.zoomLevel,
        }),
      },
    ),
    { name: 'NexusUIStore' },
  ),
);
