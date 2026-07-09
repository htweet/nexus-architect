# Nexus Architect — Observability API Reference

> **Version:** 1.0 (Phase 10)  
> **Package:** `@nexus/core`  
> **Export:** `obs` (alias for `ObservabilityService`)

---

## Overview

The observability stack provides a unified interface for error tracking and
product analytics. All instrumentation flows through the `obs` singleton —
never import Sentry or PostHog directly.

The adapter is swappable: in development, a `NullAdapter` silently discards
all events. In production, real adapters lazy-load Sentry and PostHog so they
never enter the critical bundle path.

---

## Quick Start

```ts
import { obs } from '@nexus/core';

// Track a custom event
obs.track({ name: 'panel_opened', properties: { panel: 'ai' } });

// Capture an exception
obs.captureException(new Error('Widget failed'), { nodeType: 'image' });

// Use a convenience method
obs.trackWidgetDragged('button');
obs.trackPublishStarted(page.id);
```

---

## Initialization

```ts
import { ObservabilityService, NullAdapter } from '@nexus/core';
import { createSentryAdapter } from '@nexus/core';
import { createPostHogAdapter } from '@nexus/core';

// Always initialize with NullAdapter first (synchronous, zero cost)
ObservabilityService.init(NullAdapter);

// Upgrade to real adapters asynchronously
const errorAdapter    = await createSentryAdapter({ dsn: import.meta.env.VITE_SENTRY_DSN });
const analyticsAdapter = await createPostHogAdapter({ apiKey: import.meta.env.VITE_POSTHOG_KEY });

ObservabilityService.init({ errors: errorAdapter, analytics: analyticsAdapter });
```

---

## Convenience Methods

| Method | Fires event |
|---|---|
| `obs.trackWidgetDragged(type)` | `widget_dragged` |
| `obs.trackWidgetDropped(type, targetId?)` | `widget_dropped` |
| `obs.trackPublishStarted(pageId)` | `publish_started` |
| `obs.trackPublishCompleted(pageId, durationMs)` | `publish_completed` |
| `obs.trackPublishFailed(pageId, errorMessage)` | `publish_failed` |
| `obs.trackWidgetErrorBoundary(nodeId, nodeType, error)` | `widget_error_boundary_triggered` + Sentry |
| `obs.trackCanvasErrorBoundary(error)` | `canvas_error_boundary_triggered` + Sentry |
| `obs.trackUpgradePromptShown(feature, tier)` | `upgrade_prompt_shown` |
| `obs.trackUpgradePromptClicked(feature, tier)` | `upgrade_prompt_clicked` |
| `obs.trackPanelOpened(panelName)` | `panel_opened` |
| `obs.trackAiRequest(prompt, success, fallback?)` | `ai_request_made` |
| `obs.trackTemplateApplied(id, name)` | `template_applied` |
| `obs.trackSandboxLoaded()` | `sandbox_loaded` |

---

## Custom Events

For events not covered by convenience methods, use `obs.track` directly:

```ts
obs.track({
  name: 'my_custom_event',    // must be in NexusAnalyticsEventName union or cast
  properties: {
    key: 'value',
  },
});
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_SENTRY_DSN` | Sentry Data Source Name — enables error tracking |
| `VITE_POSTHOG_KEY` | PostHog project API key — enables product analytics |
| `VITE_POSTHOG_HOST` | PostHog host (default: `https://app.posthog.com`) |

Leave these unset in development; the `NullAdapter` will silently absorb all calls.

---

*Last updated: Phase 10 — Developer Experience*
