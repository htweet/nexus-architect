# ADR 001 — The Adapter Pattern

**Status:** Accepted  
**Date:** 2026-05-10  
**Deciders:** Nexus Architect Core Team

---

## Context

Nexus Architect is a WordPress plugin today. It will become a standalone SaaS application. The core builder engine must not change when the backend changes.

## Decision

All data operations (page CRUD, publishing, media, authentication) flow through a `DataAdapter` interface. The WordPress implementation (`WPAdapter`) is the only file permitted to reference WordPress globals (`wp`, `ajaxurl`, `wpApiSettings`).

The `AdapterContext` is injected at the React app root. No component imports `WPAdapter` directly.

## Consequences

- **Good:** Swapping to `SupabaseAdapter` for SaaS requires zero changes to the core engine.
- **Good:** The builder can be tested with a `MockAdapter` without a WordPress install.
- **Bad:** Requires discipline — any WordPress-specific code outside `wp-adapter/` is a violation.

## Implementation

`packages/wp-adapter/src/index.ts` — the only WP-aware file.  
`packages/core/src/types/adapter.ts` — the interface contract.
