# Nexus Architect — Changelog

All notable changes are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — Phase 10: Developer Experience

### Added
- **Sandbox Mode** (`VITE_SANDBOX_MODE=true`): zero-WP development with `SandboxAdapter`
  backed by localStorage; rich demo page auto-seeded on first launch
- **SandboxAdapter**: full `NexusDataAdapter` implementation using `localStorage`;
  media upload returns deterministic picsum placeholder URLs
- **Demo page seed** (`seed-demo-page.ts`): hero + feature grid + testimonial + divider sections
- **Migration System** (`packages/core/src/migration/`):
  - `Migrator` interface with `fromVersion`/`toVersion`/`migrate` contract
  - `MigrationRunner.run()` — chains migrators to latest schema version
  - `migratePageData()` — safe entry point (returns `MigrationResult` with `migrated` flag)
  - `needsMigration()` — lightweight pre-check
  - v0→v1 migrator: stamps `schemaVersion`, `_v` on all nodes, fills missing required fields
- **Observability Stack** (`packages/core/src/observability/`):
  - `ObservabilityAdapter` interface (pluggable error tracker + analytics)
  - `NullAdapter` — safe no-op for development; zero bundle cost
  - `SentryAdapter` — lazy-loads `@sentry/browser`; never enters the critical bundle
  - `PostHogAdapter` — lazy-loads `posthog-js`; queues events before init completes
  - `ObservabilityService` singleton (`obs`) with 15 convenience tracking methods
  - `NexusAnalyticsEventName` canonical event union (28 events)
- **Observability wired into builder**:
  - `Builder.tsx`: `obs.trackWidgetDragged` on palette + canvas drag start;
    `obs.trackWidgetDropped` on palette drop
  - `TopBar.tsx`: `obs.trackPublishStarted/Completed/Failed` with duration timing
  - `CanvasErrorBoundary.tsx`: `obs.trackCanvasErrorBoundary` in `componentDidCatch`
  - `WidgetErrorBoundary.tsx`: `obs.trackWidgetErrorBoundary` in `componentDidCatch`
- **`NexusDataAdapter` type alias** in `packages/core/src/types/adapter.ts`
- **API Documentation** (`docs/api/`):
  - `widget-api.md` — full Widget registration + Renderer contract + Control schema reference
  - `adapter-interface.md` — DataAdapter interface + WP/Sandbox/Mock adapters + custom adapter guide
  - `observability.md` — obs singleton usage + convenience methods + env vars
- **Tutorial** (`docs/tutorials/five-minute-setup.md`) — zero-WP local setup walkthrough

---

## [0.10.0] — Phase 9: Production Hardening

### Added
- **Vite code-splitting** (`vite.config.ts`): manual chunks for react-vendor, dnd-vendor,
  radix-vendor, editor-vendor (Tiptap/ProseMirror), icons-vendor
- **Security hardening** (`packages/core/src/security/`):
  - `NexusPageSchema` Zod validator — validates full page structure on load
  - `css-sanitizer.ts` — blocks `expression()`, `url()`, `@import`, JS in CSS values;
    sanitizes HTML Embed widget `srcDoc` content
  - `CanvasErrorBoundary.tsx` — top-level React Error Boundary for catastrophic canvas crashes
  - `WidgetErrorBoundary.tsx` — per-widget Error Boundary; invisible in preview mode
- **FPS Performance Overlay** (`PerformanceOverlay.tsx`) — dev-only; rAF-based instantaneous
  FPS + 5s rolling average; color-coded green/amber/red; live node count
- **Canvas performance**: `React.memo` audit on all renderer components; `useMemo`/`useCallback`
  hardening in hot render paths
- **Playwright E2E suite** (`e2e/nexus-critical-path.spec.ts`): 12 critical-path tests
  covering builder boot, drag-and-drop, inspector, publish, preview, error boundaries

### Changed
- `NodeRenderer.tsx` fully wrapped in `WidgetErrorBoundary` at every render path
- `Canvas.tsx` mounts `CanvasErrorBoundary` around `NodeRenderer`

---

## [0.9.0] — Phase 8: Monetisation Infrastructure

### Added
- `PremiumGate` component + `UpgradePrompt` modal
- White-Label System: `useWhiteLabelStore` + `WhiteLabelSettingsPanel`
- Dynamic Data Binding: field picker UI + `useDynamicDataStore`
- Addon Micro-Package System: `AddonManifest` type + `MarketplacePanel`
- License & Activation Panel: activation flow + tier management
- Cloud Sync Adapter + Panel (Phase 8.6)

---

## [0.8.0] — Phase 7: AI Layer + Collaboration

### Added
- AI Panel: natural-language page generation, content population, style suggestions
- Performance Advisor: Lighthouse-inspired automated recommendations
- Presence awareness: polling heartbeat + active-user avatar stack in TopBar

---

## [0.7.0] — Phase 6: Save / Preview / Publish Pipeline

### Added
- Auto-save with 30-second interval fallback (`useAutoSave`)
- New-tab preview with `localStorage` page bridge
- Static HTML + CSS compiler engine (`serialization-engine.ts`)
- Template library expansion: categories, richer content

### Fixed
- Template category pills replaced with accessible dropdown
- LeftPanel height inconsistency resolved

---

## [0.6.0] — Phase 5: Advanced Features

### Added
- Revision history: snapshots, timeline browser, one-click restore
- Page Manager: list, create, duplicate, delete pages
- Publish confirmation dialog + preview mode hardening
- Advanced Inspector: typography controls, border-radius, box-shadow, CSS animations

---

## [0.5.0] — Phase 4: Widget Expansion + Panels

### Added
- Button, Image, Video, Divider, Spacer, HTML Embed widgets
- Global Styles Panel: live design-token editor
- Template Library: save + browse + apply page templates
- Page Settings: SEO meta, Open Graph, favicon, custom CSS/JS injection

---

## [0.4.0] — Phase 3: Rich Editing

### Added
- Cross-parent drag-and-drop with visual drop indicator
- Tiptap v3 inline rich-text editing + floating toolbar
- Selection system: resize handles, context toolbar, right-click menu, multi-select
- Responsive breakpoint preview engine (desktop / tablet / mobile)

---

## [0.3.0] — Phase 2: Widget System + DnD

### Added
- `@dnd-kit`-powered drag-and-drop from palette to canvas
- Widget registry (`useWidgetRegistry`)
- `NexusWidget` / `ControlSchema` TypeScript interfaces
- `SchemaRenderer` — auto-renders Right Panel controls from schema

---

## [0.2.0] — Phase 1: WP REST API Integration

### Added
- WordPress plugin shell + REST API endpoints (`/nexus/v1/`)
- `WPAdapter` implementing `DataAdapter`
- Nonce-based authentication
- World-class security hardening (sanitization, capability checks, rate limiting)

---

## [0.1.0] — Phase 0: Foundation

### Added
- Monorepo structure: `apps/builder` (Vite/React) + `packages/core` (platform-agnostic)
- `NexusPage` / `NexusNode` data schema
- Zustand stores: `useCanvasStore`, `useUIStore`, `useHistoryStore`, `useSelectionStore`
- Initial widget palette and canvas renderer

---

*Schema versioning target: `CURRENT_SCHEMA_VERSION = 1`*  
*Next migration target: v2 (Phase 11 — advanced responsive layout breakpoint storage)*
