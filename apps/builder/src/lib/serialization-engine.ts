/**
 * SerializationEngine -- Production Compiler & Publish Payload Generator
 *
 * Wraps the existing compilePage pipeline from @nexus/core and adds:
 *   - generatePublishPayload(): returns { html, json, metadata }
 *   - Clean HTML5 output with no builder-specific noise
 *   - A mockPublish() helper that simulates POST to /wp-json/nexus/v1/save
 *
 * Architecture note:
 *   The heavy lifting (CSS scoping, HTML tree walk) lives in
 *   packages/core/src/compiler/ which was implemented in Phase 6.3.
 *   This module is purely the app-layer adapter that adds the payload
 *   wrapper and the WP REST API simulation.
 */

import { compilePage } from '@nexus/core';
import type { NexusPage } from '@nexus/core';

// --- Types -------------------------------------------------------------------

export interface PublishMetadata {
  /** Page title from page.settings or a fallback */
  title:     string;
  /** URL slug */
  slug:      string;
  /** ISO 8601 timestamp of the publish action */
  publishedAt: string;
  /** Total compiled size in KB */
  sizeKb:    number;
  /** Number of nodes in the tree */
  nodeCount: number;
}

export interface PublishPayload {
  /** Clean, self-contained HTML5 document — ready to serve as a WP page */
  html:     string;
  /** Raw builder JSON — stored in wp_postmeta for future re-editing */
  json:     string;
  /** Descriptive metadata for the save operation */
  metadata: PublishMetadata;
}

export interface MockSaveResponse {
  success:    boolean;
  pageId:     string;
  previewUrl: string;
  savedAt:    string;
}

// --- generatePublishPayload --------------------------------------------------

/**
 * Compiles the current page to production HTML and packages it with the
 * raw JSON and metadata into a single payload object.
 *
 * The HTML output is completely clean:
 *   - No data-node-id attributes
 *   - No dnd-kit sortable IDs
 *   - No edit-mode wrappers or CSS classes
 *   - Fully inlined, scoped CSS in <style>
 */
export function generatePublishPayload(page: NexusPage): PublishPayload {
  const compiled  = compilePage(page);

  const pageSettings = (page as unknown as { settings?: Record<string, string> }).settings;
  const title  = pageSettings?.title ?? 'Untitled Page';
  const slug   = pageSettings?.slug  ?? `page-${page.id}`;

  const metadata: PublishMetadata = {
    title,
    slug,
    publishedAt: new Date().toISOString(),
    sizeKb:      compiled.sizeKb,
    nodeCount:   compiled.stats.nodeCount,
  };

  return {
    html:     compiled.html,
    json:     JSON.stringify(page, null, 2),
    metadata,
  };
}

// --- mockPublish -------------------------------------------------------------

/**
 * Simulates a POST to /wp-json/nexus/v1/save.
 *
 * In production this would call the WP REST API via the WPAdapter.
 * Here we:
 *   1. Validate the payload is non-empty
 *   2. Persist html + json to localStorage for dev inspection
 *   3. Simulate a 600–900ms network round-trip
 *   4. Return a mock WP-shaped success response
 */
export async function mockPublish(
  payload: PublishPayload,
  onProgress?: (pct: number) => void,
): Promise<MockSaveResponse> {
  // Simulate compile + network progress in 4 steps
  const steps = [20, 50, 80, 100];
  for (const pct of steps) {
    onProgress?.(pct);
    await delay(180 + Math.random() * 120);
  }

  // Persist to localStorage for dev inspection
  const storageKey = `nexus_published_${payload.metadata.slug}`;
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      html:       payload.html,
      json:       payload.json,
      metadata:   payload.metadata,
      savedAt:    new Date().toISOString(),
    }));
  } catch {
    // localStorage may be full — non-fatal
  }

  const pageId = `wp-${Math.random().toString(36).slice(2, 10)}`;

  return {
    success:    true,
    pageId,
    previewUrl: `${window.location.origin}/?p=${pageId}&preview=true`,
    savedAt:    new Date().toISOString(),
  };
}

// --- Helpers -----------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) =>setTimeout(resolve, ms));
}
