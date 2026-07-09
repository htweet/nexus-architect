/**
 * SentryAdapter — Sentry error tracking integration.
 *
 * Lazy-loads \@sentry/browser so it never bloats the initial bundle.
 * Sentry is only initialized when createSentryAdapter() is called with a DSN.
 *
 * Environment variables:
 *   VITE_SENTRY_DSN          — Sentry project DSN
 *   VITE_SENTRY_ENVIRONMENT  — 'production' | 'staging' | 'development'
 *   VITE_SENTRY_RELEASE      — Git commit SHA or package version
 */

import type {
  ErrorTrackingAdapter,
  ErrorContext,
  ObsUser,
  Breadcrumb,
  ObservabilityAdapter,
} from './types.js';

// Self-contained Sentry shape — avoids \ which requires
// the package to be resolvable at compile time.
interface SentryScope {
  setTag(key: string, value: string): void;
  setTags(tags: Record<string, string>): void;
  setExtras(extras: Record<string, unknown>): void;
}
interface SentryInstance {
  init(options: Record<string, unknown>): void;
  captureException(error: unknown): string;
  captureMessage(message: string, level?: string): string;
  withScope(callback: (scope: SentryScope) => void): void;
  setUser(user: { id?: string; email?: string } | null): void;
  addBreadcrumb(breadcrumb: Record<string, unknown>): void;
}

interface SentryAdapterConfig {
  dsn: string;
  environment?: string;
  release?: string;
  replaySampleRate?: number;
  errorReplaySampleRate?: number;
}

class SentryErrorAdapter implements ErrorTrackingAdapter {
  private sentry: SentryInstance | null = null;

  async init(config: SentryAdapterConfig): Promise<void> {
    try {
      // @sentry/browser is an optional runtime dependency — ts-ignore prevents
      // "Cannot find module" when it is not installed as a dev dep.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // Use new Function() to hide the import from Vite's static analyzer.
      // @sentry/browser is an optional runtime dependency — not bundled.
      // eslint-disable-next-line no-new-func
      const _dyn = new Function('s', 'return import(s)') as (s: string) => Promise<unknown>;
      const Sentry = await _dyn('@sentry/browser') as SentryInstance;
      this.sentry = Sentry;
      Sentry.init({
        dsn:              config.dsn,
        environment:      config.environment ?? 'production',
        ...(config.release !== undefined ? { release: config.release } : {}),
        integrations:     [],
        tracesSampleRate: 0.1,
        beforeSend(event: Record<string, unknown>) {
          return event;
        },
      });
    } catch (err) {
      console.warn('[NexusSentry] Failed to initialize Sentry:', err);
    }
  }

  captureException(error: Error, context?: ErrorContext): void {
    if (!this.sentry) { console.error('[NexusError]', error, context); return; }
    this.sentry.withScope((scope: SentryScope) => {
      if (context?.tags)       scope.setTags(context.tags ?? {});
      if (context?.extra)      scope.setExtras(context.extra ?? {});
      if (context?.nodeId)     scope.setTag('nodeId', context.nodeId);
      if (context?.nodeType)   scope.setTag('nodeType', context.nodeType);
      if (context?.widgetType) scope.setTag('widgetType', context.widgetType);
      this.sentry!.captureException(error);
    });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (!this.sentry) { console.warn('[NexusMsg]', level, message); return; }
    this.sentry.captureMessage(message, level);
  }

  setUser(user: ObsUser | null): void {
    if (!this.sentry) return;
    this.sentry.setUser(
      user ? { id: user.id, ...(user.email ? { email: user.email } : {}) } : null,
    );
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    if (!this.sentry) return;
    this.sentry.addBreadcrumb({
      category:  breadcrumb.category,
      message:   breadcrumb.message,
      level:     breadcrumb.level ?? 'info',
      data:      breadcrumb.data,
      timestamp: breadcrumb.timestamp ?? Date.now() / 1000,
    });
  }
}

export async function createSentryAdapter(
  config: SentryAdapterConfig,
): Promise<Pick<ObservabilityAdapter, 'errors'>> {
  const adapter = new SentryErrorAdapter();
  await adapter.init(config);
  return { errors: adapter };
}
