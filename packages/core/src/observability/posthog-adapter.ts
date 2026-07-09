/**
 * PostHogAdapter — Product analytics integration.
 *
 * Lazy-loads posthog-js so it never bloats the initial bundle.
 * All Nexus canonical events are tracked through this adapter.
 *
 * Environment variables:
 *   VITE_POSTHOG_KEY    — PostHog project API key
 *   VITE_POSTHOG_HOST   — PostHog host (default: https://app.posthog.com)
 */

import type { AnalyticsAdapter, ObsUser, AnalyticsEvent, ObservabilityAdapter } from './types.js';

interface PostHogConfig {
  apiKey: string;
  host?: string;
  disabled?: boolean;
}

interface PostHogInstance {
  init(apiKey: string, config: Record<string, unknown>): void;
  capture(event: string, properties?: Record<string, unknown>): void;
  identify(id: string, properties?: Record<string, unknown>): void;
  register(properties: Record<string, unknown>): void;
  reset(): void;
}

class PostHogAnalyticsAdapter implements AnalyticsAdapter {
  private ph: PostHogInstance | null = null;
  private queue: Array<() => void> = [];
  private initialized = false;

  async init(config: PostHogConfig): Promise<void> {
    if (config.disabled) return;
    try {
      // Use new Function() to hide the import from Vite's static analyzer.
      // posthog-js is an optional runtime dependency — not bundled.
      // eslint-disable-next-line no-new-func
      const _dyn = new Function('s', 'return import(s)') as (s: string) => Promise<unknown>;
      const mod = await _dyn('posthog-js') as { default: PostHogInstance };
      const posthog = mod.default;
      posthog.init(config.apiKey, {
        api_host:                  config.host ?? 'https://app.posthog.com',
        capture_pageview:          false,
        capture_pageleave:         true,
        autocapture:               false,
        persistence:               'localStorage',
        disable_session_recording: false,
        session_recording: {
          maskAllInputs:    true,
          maskInputOptions: { password: true },
        },
      });
      this.ph = posthog;
      this.initialized = true;
      for (const fn of this.queue) fn();
      this.queue = [];
    } catch (err) {
      console.warn('[NexusPostHog] Failed to initialize PostHog:', err);
    }
  }

  track(event: AnalyticsEvent): void {
    const fn = () => this.ph?.capture(event.name, {
      ...event.properties,
      $lib: 'nexus-architect',
    });
    if (!this.initialized) this.queue.push(fn);
    else fn();
  }

  identify(user: ObsUser, properties?: Record<string, unknown>): void {
    const fn = () => this.ph?.identify(user.id, {
      email: user.email,
      tier:  user.tier,
      ...properties,
    });
    if (!this.initialized) this.queue.push(fn);
    else fn();
  }

  setSuperProperties(properties: Record<string, unknown>): void {
    const fn = () => this.ph?.register(properties);
    if (!this.initialized) this.queue.push(fn);
    else fn();
  }

  reset(): void {
    this.ph?.reset();
  }
}

export async function createPostHogAdapter(
  config: PostHogConfig,
): Promise<Pick<ObservabilityAdapter, 'analytics'>> {
  const adapter = new PostHogAnalyticsAdapter();
  await adapter.init(config);
  return { analytics: adapter };
}
