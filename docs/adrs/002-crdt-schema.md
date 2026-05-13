# ADR 002 — CRDT-Ready Schema Design

**Status:** Accepted  
**Date:** 2026-05-10

---

## Context

Real-time collaboration (Figma-style co-editing) is a Phase 13 feature. The question is whether to design for it now or retrofit later.

## Decision

Every `NexusNode` carries two forward-compatibility fields from Phase 0:

1. **`_v: number`** — Schema version stamp. Powers the migrator (Phase 10) to transform old page data to new schema versions without data loss.

2. **`_ops: CRDTOperation[]`** — An append-only operation log, initially empty. When Phase 13 activates Yjs/Automerge, this log becomes the collaborative operation history. The Zustand `CollaborationStore` is also defined as a stub now for the same reason.

## The Alternative Rejected

Designing last-write-wins now and retrofitting CRDT later. Rejected because: retrofitting CRDT onto a non-CRDT state architecture requires rewriting the node schema, the CanvasStore mutation model, and the save pipeline simultaneously — a near-total rewrite at exactly the wrong moment (when users already have saved page data in the old schema).

## Consequences

- **Good:** Phase 13 activation is a feature flag flip + transport layer wire-up, not a rewrite.
- **Good:** `_v` enables safe schema migrations from day one.
- **Bad:** Marginal JSON payload increase (~30 bytes per node for empty `_ops`). Acceptable.
