/**
 * ObservabilityService — the unified telemetry facade.
 *
 * All error tracking and analytics in the builder flows through this singleton.
 * Components never import Sentry or PostHog directly — they call obs.errors.*
 * and obs.analytics.track(). This makes the observability stack swappable
 * with zero component changes.
 *
 * Initialization (call once in main.tsx before React renders):
 *
 *   import { ObservabilityService } from '@nexus/core';
 *
 *   // Production:
 *   ObservabilityService.init({
 *     errors:    sentryAdapter.errors,
 *     analytics: postHogAdapter.analytics,
 *   });
 *
 *   // Development (no-op):
 *   ObservabilityService.init(NullAdapter);
 *
 * Usage anywhere:
 *   import { obs } from '@nexus/core';
 *   obs.errors.captureException(err, { nodeType: 'heading' });
 *   obs.analytics.track({ name: 'widget_dragged', properties: { type: 'heading' } });
 */

import type { ObservabilityAdapter, AnalyticsEvent, ErrorContext, ObsUser, Breadcrumb } from './types.js';
import { NullAdapter } from './null-adapter.js';

class _ObservabilityService {
  private adapter: ObservabilityAdapter = NullAdapter;
  private _ready = false;

  /**
   * Call once at application startup before any components mount.
   * Safe to call multiple times — subsequent calls replace the adapter.
   */
  init(adapter: ObservabilityAdapter): void {
    this.adapter = adapter;
    this._ready  = true;
  }

  get ready(): boolean { return this._ready; }

  // ── Error tracking shortcuts ────────────────────────────────────────────

  captureException(error: Error, context?: ErrorContext): void {
    this.adapter.errors.captureException(error, context);
  }

  captureMessage(msg: string, level?: 'info' | 'warning' | 'error'): void {
    this.adapter.errors.captureMessage(msg, level);
  }

  setUser(user: ObsUser | null): void {
    this.adapter.errors.setUser(user);
    if (user) {
      this.adapter.analytics.identify(user, { tier: user.tier });
      this.adapter.analytics.setSuperProperties({ user_tier: user.tier });
    } else {
      this.adapter.analytics.reset();
    }
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.adapter.errors.addBreadcrumb(breadcrumb);
  }

  // ── Analytics shortcuts ─────────────────────────────────────────────────

  track(event: AnalyticsEvent): void {
    this.adapter.analytics.track(event);
  }

  identify(user: ObsUser, properties?: Record<string, unknown>): void {
    this.adapter.analytics.identify(user, properties);
  }

  setSuperProperties(props: Record<string, unknown>): void {
    this.adapter.analytics.setSuperProperties(props);
  }

  // ── Convenience helpers ─────────────────────────────────────────────────

  trackWidgetDragged(widgetType: string): void {
    this.track({ name: 'widget_dragged', properties: { widget_type: widgetType } });
    this.addBreadcrumb({ category: 'dnd', message: `Dragging ${widgetType}` });
  }

  trackWidgetDropped(widgetType: string, targetId?: string): void {
    this.track({ name: 'widget_dropped', properties: { widget_type: widgetType, target_id: targetId } });
  }

  trackPublishStarted(pageId: string): void {
    this.track({ name: 'publish_started', properties: { page_id: pageId } });
    this.addBreadcrumb({ category: 'publish', message: `Publish started for ${pageId}` });
  }

  trackPublishCompleted(pageId: string, durationMs: number): void {
    this.track({ name: 'publish_completed', properties: { page_id: pageId, duration_ms: durationMs } });
  }

  trackPublishFailed(pageId: string, errorMessage: string): void {
    this.track({ name: 'publish_failed', properties: { page_id: pageId, error: errorMessage } });
    this.captureMessage(`Publish failed for ${pageId}: ${errorMessage}`, 'error');
  }

  trackWidgetErrorBoundary(nodeId: string, nodeType: string, error: Error): void {
    this.track({ name: 'widget_error_boundary_triggered', properties: { node_id: nodeId, node_type: nodeType, error_message: error.message } });
    this.captureException(error, { nodeId, nodeType });
  }

  trackCanvasErrorBoundary(error: Error): void {
    this.track({ name: 'canvas_error_boundary_triggered', properties: { error_message: error.message } });
    this.captureException(error, { extra: { location: 'canvas_root' } });
  }

  trackUpgradePromptShown(feature: string, tier: string): void {
    this.track({ name: 'upgrade_prompt_shown', properties: { feature, required_tier: tier } });
  }

  trackUpgradePromptClicked(feature: string, tier: string): void {
    this.track({ name: 'upgrade_prompt_clicked', properties: { feature, required_tier: tier } });
  }

  trackPanelOpened(panelName: string): void {
    this.track({ name: 'panel_opened', properties: { panel: panelName } });
  }

  trackAiRequest(prompt: string, success: boolean, fallback = false): void {
    this.track({
      name: success ? 'ai_generation_succeeded' : 'ai_generation_failed',
      properties: { prompt_length: prompt.length, used_fallback: fallback },
    });
  }

  trackTemplateApplied(templateId: string, templateName: string): void {
    this.track({ name: 'template_applied', properties: { template_id: templateId, template_name: templateName } });
  }

  trackSandboxLoaded(): void {
    this.track({ name: 'sandbox_loaded', properties: { timestamp: Date.now() } });
  }

  async flush(): Promise<void> {
    await this.adapter.flush?.();
  }
}

/** The global observability service. Import `obs` anywhere in the builder. */
export const ObservabilityService = new _ObservabilityService();

/** Alias for brevity. */
export const obs = ObservabilityService;
