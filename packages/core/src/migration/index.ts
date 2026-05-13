/**
 * Nexus Architect — Schema Migration System (Phase 10.3)
 *
 * Architecture:
 *   Every NexusPage carries a `schemaVersion` integer.
 *   Every NexusNode carries a `_v` integer.
 *   When a page is loaded from storage, `migratePageData()` is called.
 *   It runs every registered migrator whose `fromVersion` matches the
 *   current version, in order, until the page reaches CURRENT_SCHEMA_VERSION.
 *
 *   Adding a breaking schema change:
 *     1. Bump CURRENT_SCHEMA_VERSION in schema.ts.
 *     2. Add a new Migrator object to the MIGRATORS array below.
 *     3. The runner handles everything else.
 *
 *   This keeps old page data in localStorage / WordPress DB working after
 *   any schema evolution, with zero manual intervention required.
 */

import type { NexusPage, NexusNode } from '../types/schema.js';
import { CURRENT_SCHEMA_VERSION } from '../types/schema.js';

// ─── Migrator Interface ───────────────────────────────────────────────────────

export interface Migrator {
  /** Schema version this migrator reads FROM. */
  fromVersion: number;
  /** Schema version this migrator produces. */
  toVersion: number;
  /** Human-readable description for the changelog. */
  description: string;
  /** Transform a page from fromVersion to toVersion. */
  migrate(page: RawPage): RawPage;
}

/**
 * RawPage is a looser type used during migration — fields may be missing
 * or have legacy shapes. Each migrator normalises toward NexusPage.
 */
export type RawPage = Record<string, unknown>;

// ─── Migration Result ─────────────────────────────────────────────────────────

export interface MigrationResult {
  /** The migrated page, safe to use as NexusPage. */
  page: NexusPage;
  /** True if any migrators were applied. */
  migrated: boolean;
  /** Ordered list of migrators that ran. */
  appliedMigrations: string[];
}

// ─── Registered Migrators ─────────────────────────────────────────────────────
//
//   HISTORY:
//   v0 → v1 (Phase 10): Initial schema version stamp.
//                        Adds schemaVersion, _v to legacy data that pre-dates versioning.
//   v1 → v2 (future): placeholder — extend here as needed.

const MIGRATORS: Migrator[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    description: 'v0→v1: Stamp schemaVersion + _v on all nodes. Add missing seoMeta, globalStyles.',
    migrate(raw: RawPage): RawPage {
      const page = { ...raw };

      // Stamp page-level version
      page['schemaVersion'] = 1;

      // Ensure required page fields exist
      if (!page['globalStyles']) page['globalStyles'] = {};
      if (!page['seoMeta'])      page['seoMeta']      = {};
      if (page['customCss'] === undefined) page['customCss'] = '';
      if (page['customJs']  === undefined) page['customJs']  = '';
      if (!page['createdAt']) page['createdAt'] = new Date().toISOString();
      if (!page['updatedAt']) page['updatedAt'] = new Date().toISOString();

      // Stamp every node
      const nodeMap = page['nodeMap'] as Record<string, Record<string, unknown>> | undefined;
      if (nodeMap && typeof nodeMap === 'object') {
        for (const nodeId of Object.keys(nodeMap)) {
          const node = { ...nodeMap[nodeId] };
          if (node['_v'] === undefined) node['_v'] = 1;
          if (!Array.isArray(node['_ops'])) node['_ops'] = [];
          if (!node['interactions']) node['interactions'] = {};
          if (!node['visibility'])   node['visibility']   = {};
          if (!node['styles'])       node['styles']       = {};
          if (node['locked']  === undefined) node['locked']  = false;
          if (node['hidden']  === undefined) node['hidden']  = false;
          nodeMap[nodeId] = node;
        }
        page['nodeMap'] = nodeMap;
      }

      return page;
    },
  },
  // ── v1 → v2 — future placeholder ────────────────────────────────────────
  // {
  //   fromVersion: 1,
  //   toVersion: 2,
  //   description: 'v1→v2: Example — rename "container" widget type to "section".',
  //   migrate(raw: RawPage): RawPage { ... }
  // },
];

// ─── Migration Runner ─────────────────────────────────────────────────────────

export class MigrationRunner {
  private readonly migrators: Migrator[];
  private readonly targetVersion: number;

  constructor(migrators: Migrator[] = MIGRATORS, targetVersion = CURRENT_SCHEMA_VERSION) {
    // Sort ascending so v0→v1 always runs before v1→v2
    this.migrators    = [...migrators].sort((a, b) => a.fromVersion - b.fromVersion);
    this.targetVersion = targetVersion;
  }

  /**
   * Run all applicable migrators on raw page data until it reaches
   * CURRENT_SCHEMA_VERSION. Safe to call on pages that are already
   * at the current version — it becomes a cheap no-op.
   */
  run(raw: RawPage): MigrationResult {
    let current     = { ...raw } as RawPage;
    const applied:  string[] = [];
    let version     = (current['schemaVersion'] as number | undefined) ?? 0;

    while (version < this.targetVersion) {
      const migrator = this.migrators.find((m) => m.fromVersion === version);
      if (!migrator) {
        // No migrator found — skip ahead to avoid infinite loop
        console.warn(
          `[NexusMigration] No migrator found for version ${version}. ` +
          `Skipping to target ${this.targetVersion}.`,
        );
        break;
      }

      try {
        current = migrator.migrate(current);
        applied.push(`${migrator.fromVersion}→${migrator.toVersion}: ${migrator.description}`);
        version = migrator.toVersion;
      } catch (err) {
        console.error(
          `[NexusMigration] Migrator ${migrator.fromVersion}→${migrator.toVersion} failed:`,
          err,
        );
        break;
      }
    }

    return {
      page:    current as unknown as NexusPage,
      migrated: applied.length > 0,
      appliedMigrations: applied,
    };
  }
}

// ─── Singleton runner (use this throughout the app) ───────────────────────────

export const migrationRunner = new MigrationRunner();

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Run migrations on raw page data from storage and return a valid NexusPage.
 * Call this whenever loading a page from localStorage, WP REST API, or cloud sync.
 */
export function migratePageData(raw: unknown): MigrationResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('[NexusMigration] migratePageData received non-object input.');
  }
  return migrationRunner.run(raw as RawPage);
}

/**
 * Quick check — returns true if the page needs migration.
 */
export function needsMigration(page: unknown): boolean {
  if (!page || typeof page !== 'object') return true;
  const v = (page as Record<string, unknown>)['schemaVersion'];
  return typeof v !== 'number' || v < CURRENT_SCHEMA_VERSION;
}
