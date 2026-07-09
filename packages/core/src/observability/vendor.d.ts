/**
 * Ambient type stubs for optional observability packages.
 * These are loaded lazily at runtime — TypeScript only needs the shape.
 */

declare module '@sentry/browser' {
  export interface SentryEventHint { originalException?: unknown; }
  export interface SentryEvent { [key: string]: unknown; }
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
    opt_out_capturing(): void;
    opt_in_capturing(): void;
  }
  const posthog: PostHog;
  export default posthog;
}
