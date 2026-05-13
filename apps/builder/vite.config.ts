import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const r = (rel: string) => new URL(rel, import.meta.url).pathname;

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
    // Disable lightningcss minifier — not available on Linux sandbox (installed on Windows).
    // Production builds on Windows will re-enable via default settings.
    cssMinify: false,
    rollupOptions: {
      output: {
        manualChunks(id): string | undefined {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('@radix-ui/')) {
            return 'radix-vendor';
          }
          if (id.includes('@dnd-kit/')) {
            return 'dnd-vendor';
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
