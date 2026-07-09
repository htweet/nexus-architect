/**
 * NullAdapter — no-op observability. Used in development and test environments.
 * Zero network calls, zero side effects. Every method is a safe no-op.
 */
import type {
  ObservabilityAdapter,
  ErrorTrackingAdapter,
  AnalyticsAdapter,
  ErrorContext,
  ObsUser,
  Breadcrumb,
  AnalyticsEvent,
} from './types.js';

const nullErrors: ErrorTrackingAdapter = {
  captureException(_e: Error, _ctx?: ErrorContext) {},
  captureMessage(_msg: string, _level?: 'info' | 'warning' | 'error') {},
  setUser(_user: ObsUser | null) {},
  addBreadcrumb(_b: Breadcrumb) {},
};

const nullAnalytics: AnalyticsAdapter = {
  track(_e: AnalyticsEvent) {},
  identify(_u: ObsUser, _p?: Record<string, unknown>) {},
  setSuperProperties(_p: Record<string, unknown>) {},
  reset() {},
};

export const NullAdapter: ObservabilityAdapter = {
  errors:    nullErrors,
  analytics: nullAnalytics,
  async flush() {},
};
