# ADR 004 — WordPress Adapter Boot Strategy

**Status:** Accepted  
**Date:** 2026-05-10

---

## Context

The React builder needs to connect to a DataAdapter at startup. In WordPress mode, the adapter reads `window.__NEXUS_CONFIG__` (injected by PHP). In dev/test mode, a mock adapter is used. The question is: where does this decision live?

## Decision

The adapter resolution lives exclusively in `App.tsx` using a simple runtime check:

```ts
if (typeof window.__NEXUS_CONFIG__ !== 'undefined') {
  // WordPress runtime
  return createWPAdapterContext();
}
// Dev / E2E
return createMockAdapterContext();
```

The WPAdapter is **dynamically imported** (`await import('@nexus/wp-adapter')`) so that WP-specific code is code-split out of the primary bundle in dev mode. This keeps the dev bundle fast and free of WP globals.

## Consequences

- **Good:** Zero WP code in the dev bundle unless running inside WordPress.
- **Good:** E2E tests use `createMockAdapterContext()` — no WP install required.
- **Good:** The switch is transparent to all components below App.tsx.
- **Bad:** Dynamic import adds ~1 async tick at boot time. Acceptable — it's a one-time startup cost.
