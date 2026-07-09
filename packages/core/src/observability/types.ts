/**
 * Nexus Architect — Observability Adapter Interface (Phase 10.4)
 *
 * Unified interface for error tracking (Sentry) + product analytics (PostHog).
 * All telemetry flows through a single ObservabilityService facade.
 * Swap adapters by calling ObservabilityService.init() with a different adapter.
 *
 * Production: SentryAdapter + PostHogAdapter
 * Development: NullAdapter (no-op, zero network calls)
 * Testing:     SpyAdapter (records calls for assertions)
 */

// ─── Error Tracking ───────────────────────────────────────────────────────────

export interface ErrorTrackingAdapter {
  /** Capture an exception with optional context. */
  captureException(error: Error, context?: ErrorContext): void;
  /** Capture a non-fatal message. */
  captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void;
  /** Set the current user context for subsequent events. */
  setUser(user: ObsUser | null): void;
  /** Add a breadcrumb trail entry. */
  addBreadcrumb(breadcrumb: Breadcrumb): void;
}

export interface ErrorContext {
  nodeId?: string;
  nodeType?: string;
  widgetType?: string;
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export interface ObsUser {
  id: string;
  email?: string;
  tier?: string;
}

export interface Breadcrumb {
  category: string;
  message: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
  timestamp?: number;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsAdapter {
  /** Track a discrete event. */
  track(event: AnalyticsEvent): void;
  /** Identify the current user. */
  identify(user: ObsUser, properties?: Record<string, unknown>): void;
  /** Set a persistent super-property on all future events. */
  setSuperProperties(properties: Record<string, unknown>): void;
  /** Reset identity (call on sign-out). */
  reset(): void;
}

// ─── Canonical Events ─────────────────────────────────────────────────────────
//
//   These are the events PostHog (or any analytics backend) receives.
//   Keeping them in one place prevents event name drift across the codebase.

export type NexusAnalyticsEventName =
  // Canvas
  | 'widget_dragged'
  | 'widget_dropped'
  | 'widget_selected'
  | 'widget_deleted'
  | 'widget_duplicated'
  // Publish
  | 'publish_started'
  | 'publish_completed'
  | 'publish_failed'
  // Preview
  | 'preview_opened'
  | 'preview_closed'
  // AI
  | 'ai_generation_requested'
  | 'ai_generation_succeeded'
  | 'ai_generation_failed'
  | 'ai_content_applied'
  // Premium
  | 'upgrade_prompt_shown'
  | 'upgrade_prompt_clicked'
  | 'license_activated'
  // Settings / Panels
  | 'panel_opened'
  | 'style_control_changed'
  | 'template_applied'
  | 'revision_restored'
  // Sandbox / Onboarding
  | 'sandbox_loaded'
  | 'demo_page_seeded'
  // Errors
  | 'widget_error_boundary_triggered'
  | 'canvas_error_boundary_triggered';

export interface AnalyticsEvent {
  name: NexusAnalyticsEventName;
  properties?: Record<string, unknown>;
}

// ─── Combined Adapter ─────────────────────────────────────────────────────────

export interface ObservabilityAdapter {
  readonly errors:    ErrorTrackingAdapter;
  readonly analytics: AnalyticsAdapter;
  /** Optional: flush queued events (call before page unload). */
  flush?(): Promise<void>;
}
