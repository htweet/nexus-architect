/**
 * AI Layer Types — Phase 7
 *
 * All AI-related types used across the core engine, adapter, and builder UI.
 * The AiAdapter interface follows the same pattern as DataAdapter — the core
 * engine calls it; the WP Adapter implements it.
 */

import type { NexusPage } from './schema.js';

// ─── Settings ────────────────────────────────────────────────────────────────

export interface AiSettings {
  provider:  string;
  model:     string;
  hasApiKey: boolean;
  models:    AiModelOption[];
}

export interface AiModelOption {
  id:       string;
  name:     string;
  provider: string;
}

// ─── Generation ──────────────────────────────────────────────────────────────

export interface GenerateLayoutResult {
  rootNodeId: string;
  nodeMap:    Record<string, unknown>;
}

// ─── Performance Audit ───────────────────────────────────────────────────────

export type FindingSeverity = 'high' | 'medium' | 'low';
export type FindingCategory = 'performance' | 'seo' | 'accessibility' | 'best-practices';
export type FindingImpact   = 'High' | 'Medium' | 'Low';

export interface AuditFinding {
  id:             string;
  severity:       FindingSeverity;
  category:       FindingCategory;
  title:          string;
  description:    string;
  recommendation: string;
  impact:         FindingImpact;
}

export interface PerformanceAudit {
  auditId:  string;
  score:    number;
  findings: AuditFinding[];
  htmlSize: number;
  cssSize:  number;
}

export interface AuditHistoryEntry {
  id:         string;
  score:      number;
  htmlSize:   number;
  cssSize:    number;
  created_at: string;
}

export interface AuditResult {
  latest:  PerformanceAudit | null;
  history: AuditHistoryEntry[];
}

// ─── Presence ────────────────────────────────────────────────────────────────

export interface PresencePeer {
  user_id:    string;
  user_name:  string;
  avatar_url: string;
  color:      string;
  last_seen:  string;
}

// ─── AI Adapter Interface ─────────────────────────────────────────────────────

/**
 * Platform-agnostic AI adapter interface.
 * WP implementation calls /nexus/v1/ai/* endpoints.
 * SaaS implementation calls Supabase Edge Functions.
 */
export interface AiAdapter {
  // Settings
  getSettings(): Promise<AiSettings>;
  saveSettings(provider: string, model: string, apiKey: string): Promise<void>;

  // 7.1 — Natural Language Layout Generation
  generateLayout(prompt: string, pageId: string): Promise<GenerateLayoutResult>;

  // 7.2 — Content Population
  populateContent(nodeMap: Record<string, unknown>, context: string, pageId: string): Promise<Record<string, unknown>>;

  // 7.3 — Style Suggestions
  suggestStyles(currentTokens: Record<string, string>, changedToken: string): Promise<Record<string, string>>;

  // 7.4 — Performance Audit
  auditPage(pageId: string): Promise<PerformanceAudit>;
  getAudit(pageId: string): Promise<AuditResult>;

  // 7.5 — Presence
  heartbeat(pageId: string, color: string): Promise<PresencePeer[]>;
  getPresence(pageId: string): Promise<PresencePeer[]>;
}
