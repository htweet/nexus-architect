/// <reference types="vite/client" />

/**
 * Global type augmentations for the builder app.
 *
 * The window.__NEXUS_CONFIG__ shape is injected by PHP (Loader::render_builder_page).
 * We declare it here so App.tsx can reference it without importing from wp-adapter
 * (which would break the dynamic import code-splitting strategy).
 */

interface NexusWindowConfig {
  apiUrl: string;
  nonce: string;
  siteUrl: string;
  version: string;
  userEmail: string;
}

declare global {
  interface Window {
    __NEXUS_CONFIG__?: NexusWindowConfig;
  }
}

export {};
