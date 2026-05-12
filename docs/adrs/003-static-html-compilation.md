# ADR 003 — Static HTML Compilation at Publish Time

**Status:** Accepted  
**Date:** 2026-05-10

---

## Context

Elementor renders published pages by executing PHP functions and querying the database on every page load, producing 200–500 KB of inline CSS. This is why Elementor pages score poorly on Lighthouse.

## Decision

At publish time, the page JSON is compiled into a static HTML file with a scoped, minimal CSS file (typically 2–8 KB). WordPress serves the static file directly. PHP only runs to check cache validity.

The compiler is implemented in the `WPAdapter` (Phase 6) and is platform-agnostic — the same compiler runs in the `SupabaseAdapter` for the SaaS version.

## Consequences

- **Good:** Sub-100ms TTFB on shared hosting. Lighthouse 95+ is achievable by default.
- **Good:** The front-end has zero runtime JavaScript overhead — pure HTML + CSS.
- **Good:** This is the primary technical marketing claim: "Pages that actually load fast."
- **Bad:** Cache invalidation adds complexity. A robust invalidation strategy is required.

## Cache Strategy

On each `publishPage()` call, only the modified page's cache is invalidated. All other pages remain cached. Related pages (pages that include synced components) are also invalidated.
