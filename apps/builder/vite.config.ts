import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const r = (rel: string) => new URL(rel, import.meta.url).pathname;

// ---------------------------------------------------------------------------
// Phase 9.1 — Code Splitting Strategy
//
// Chunks are designed so the initial JS payload is as small as possible.
// The canvas renderer (react + zustand) loads immediately; heavy panels
// (AI, CloudSync, Settings, Templates) are lazy-loaded on first open.
//
// Target budgets (gzip):
//   react-vendor   ~45 KB  — React + ReactDOM (CDN cacheable)
//   dnd-vendor     ~25 KB  — @dnd-kit (canvas only)
//   radix-vendor   ~30 KB  — Radix UI primitives
//   editor-vendor  ~80 KB  — Tiptap rich-text engine (lazy)
//   panels         ~60 KB  — Heavy side-panels (lazy)
//   icons          ~20 KB  — Lucide icon subset
// ---------------------------------------------------------------------------

export default defineConfig({
  plugins: [react()],
  // Redirect dep-optimisation cache to /tmp so the Linux sandbox
  // does not try to unlink NTFS-locked files in node_modules/.vite/deps.
  cacheDir: '/tmp/vite-nexus-cache',
  resolve: {
    alias: {
      '@':                 r('./src'),
      '@nexus/core':       r('../../packages/core/src/index.ts'),
      '@nexus/wp-adapter': r('../../packages/wp-adapter/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    emptyOutDir: false,
    // Disable lightningcss minifier — not available on Linux sandbox.
    cssMinify: false,
    // Warn when any single chunk exceeds 500 KB (unminified).
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id): string | undefined {
          // ── Vendor splits (cache-stable; versioned by lockfile) ────────────
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('@radix-ui/')) {
            return 'radix-vendor';
          }
          if (id.includes('@dnd-kit/')) {
            return 'dnd-vendor';
          }
          if (id.includes('lucide-react')) {
            return 'icons-vendor';
          }
          // Tiptap (rich-text editor) — heavy, only needed for inline editing
          if (id.includes('@tiptap/') || id.includes('prosemirror')) {
            return 'editor-vendor';
          }
          // ── App-level panel chunk (lazy-imported at runtime) ───────────────
          if (
            id.includes('components/panels/AiPanel') ||
            id.includes('components/panels/CloudSyncPanel') ||
            id.includes('components/panels/TemplatesModal') ||
            id.includes('components/panels/TemplatesPanel') ||
            id.includes('components/panels/AddonsPanel') ||
            id.includes('components/panels/LicensePanel') ||
            id.includes('components/panels/WhiteLabelPanel') ||
            id.includes('components/panels/SettingsModal') ||
            id.includes('components/panels/RevisionHistoryPanel')
          ) {
            return 'panels';
          }
          return undefined;
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'lucide-react'],
  },
});
