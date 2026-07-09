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

// ─── Optional observability package stubs ────────────────────────────────────
// These are lazy-loaded at runtime; TypeScript only needs the ambient shape.

declare module '@sentry/browser' {
  export interface SentryScope {
    setTag(key: string, value: string): void;
    setTags(tags: Record<string, string>): void;
    setExtras(extras: Record<string, unknown>): void;
  }
  export function init(options: Record<string, unknown>): void;
  export function captureException(error: unknown): string;
  export function captureMessage(message: string, level?: string): string;
  export function withScope(callback: (scope: SentryScope) => void): void;
  export function setUser(user: { id?: string; email?: string } | null): void;
  export function addBreadcrumb(breadcrumb: Record<string, unknown>): void;
}

declare module 'posthog-js' {
  export interface PostHog {
    init(apiKey: string, options?: Record<string, unknown>): void;
    capture(eventName: string, properties?: Record<string, unknown>): void;
    identify(id: string, properties?: Record<string, unknown>): void;
    register(properties: Record<string, unknown>): void;
    reset(): void;
  }
  const posthog: PostHog;
  export default posthog;
}
