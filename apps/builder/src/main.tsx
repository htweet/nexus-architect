import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Register all widgets with the global registry before the app renders.
import './widgets/index';

// Wire the addon loader into the core store so installAddon() uses real bundles.
import { setAddonLoader } from '@nexus/core';
import { loadAddon, unloadAddon } from '@/lib/addon-loader';
setAddonLoader({ loadAddon, unloadAddon });

// ── Dev tool: expose stores on window for E2E testing / browser console ──────
// Only active when Vite sets MODE to development (stripped in production builds).
if (import.meta.env.DEV) {
  import('@nexus/core').then((core) => {
    (window as unknown as Record<string, unknown>).__nexus = {
      canvas:      core.useCanvasStore,
      ui:          core.useUIStore,
      selection:   core.useSelectionStore,
      history:     core.useHistoryStore,
      user:        core.useUserStore,
      createPage:  core.createPage,
      createNode:  core.createNode,
    };
    console.info('[Nexus] Dev stores exposed on window.__nexus');
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
