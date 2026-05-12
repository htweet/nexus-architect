/**
 * Nexus Architect — Feature Flag System
 *
 * All premium gates flow through this single service.
 * No component ever hardcodes tier checks inline — it reads from
 * useFeatureFlags() which reads from the UserStore which reads from
 * the adapter's getCurrentUser() response.
 *
 * Adding a new premium feature = add a flag here + gate in the component.
 * No other changes needed.
 */

import type { AdapterUser } from './adapter.js';

// ─── Tier ────────────────────────────────────────────────────────────────────

export type PlanTier = AdapterUser['tier'];

// ─── Flag Shape ──────────────────────────────────────────────────────────────

export interface FeatureFlags {
  tier: PlanTier;
  isFreeTier: boolean;

  // ── Professional tier ────────────────────────────────────────────────────
  /** Remove all Nexus Architect branding for client handovers. */
  canWhiteLabel: boolean;
  /** Bind widget props to ACF fields, WooCommerce data, REST endpoints. */
  canUseDynamicData: boolean;
  /** Access premium addon packages from the marketplace. */
  canAccessPremiumAddons: boolean;
  /** SLA-backed support queue. */
  hasPrioritySupport: boolean;

  // ── Agency tier ──────────────────────────────────────────────────────────
  /** Sync global components across multiple sites. */
  canUseCloudSync: boolean;
  /** Up to 5 team members share the builder account. */
  hasTeamSeats: boolean;
  /** Restricted client-facing builder view. */
  hasClientPortal: boolean;

  // ── AI features (metered) ────────────────────────────────────────────────
  /**
   * Remaining AI layout generation requests this billing period.
   * -1 = unlimited (Agency tier).
   */
  aiGenerationsRemaining: number;
  /** All tiers can see the performance advisor. It's a marketing asset. */
  canUseAiAdvisor: boolean;
  /** AI content population (placeholder copy, SEO headings). */
  canUseAiContent: boolean;

  // ── Collaboration (Phase 13) ─────────────────────────────────────────────
  /** Presence awareness: see who else is editing the page. */
  hasPresenceAwareness: boolean;
  /** Full simultaneous co-editing (Figma-style). Agency tier only. */
  hasRealtimeCollaboration: boolean;
}

// ─── Flag Resolver ───────────────────────────────────────────────────────────

const FREE_FLAGS: FeatureFlags = {
  tier: 'free',
  isFreeTier: true,
  canWhiteLabel: false,
  canUseDynamicData: false,
  canAccessPremiumAddons: false,
  hasPrioritySupport: false,
  canUseCloudSync: false,
  hasTeamSeats: false,
  hasClientPortal: false,
  aiGenerationsRemaining: 10,
  canUseAiAdvisor: true,
  canUseAiContent: false,
  hasPresenceAwareness: false,
  hasRealtimeCollaboration: false,
};

const TIER_OVERRIDES: Record<Exclude<PlanTier, 'free'>, Partial<FeatureFlags>> = {
  personal: {
    tier: 'personal',
    isFreeTier: false,
    aiGenerationsRemaining: 50,
    canUseAiContent: true,
  },
  professional: {
    tier: 'professional',
    isFreeTier: false,
    canWhiteLabel: true,
    canUseDynamicData: true,
    canAccessPremiumAddons: true,
    hasPrioritySupport: true,
    aiGenerationsRemaining: 200,
    canUseAiContent: true,
    hasPresenceAwareness: true,
  },
  agency: {
    tier: 'agency',
    isFreeTier: false,
    canWhiteLabel: true,
    canUseDynamicData: true,
    canAccessPremiumAddons: true,
    hasPrioritySupport: true,
    canUseCloudSync: true,
    hasTeamSeats: true,
    hasClientPortal: true,
    aiGenerationsRemaining: -1,
    canUseAiContent: true,
    hasPresenceAwareness: true,
    hasRealtimeCollaboration: true,
  },
};

export function resolveFeatureFlags(tier: PlanTier): FeatureFlags {
  if (tier === 'free') return FREE_FLAGS;
  return { ...FREE_FLAGS, ...TIER_OVERRIDES[tier] };
}

// ─── Upgrade Context ─────────────────────────────────────────────────────────

/** Shown in upgrade prompts so users know exactly what they're unlocking. */
export interface UpgradeContext {
  feature: keyof FeatureFlags;
  requiredTier: Exclude<PlanTier, 'free'>;
  headline: string;
  description: string;
}

export const UPGRADE_CONTEXTS: Partial<Record<keyof FeatureFlags, UpgradeContext>> = {
  canWhiteLabel: {
    feature: 'canWhiteLabel',
    requiredTier: 'professional',
    headline: 'Remove Nexus Architect Branding',
    description:
      'Present the builder under your own brand. Remove all Nexus Architect logos and labels for client handovers.',
  },
  canUseDynamicData: {
    feature: 'canUseDynamicData',
    requiredTier: 'professional',
    headline: 'Unlock Dynamic Data Binding',
    description:
      'Bind widget content to ACF fields, WooCommerce product data, and custom REST endpoints.',
  },
  canUseCloudSync: {
    feature: 'canUseCloudSync',
    requiredTier: 'agency',
    headline: 'Sync Across All Client Sites',
    description:
      'Update a header component once and push it to every connected client site instantly.',
  },
  hasRealtimeCollaboration: {
    feature: 'hasRealtimeCollaboration',
    requiredTier: 'agency',
    headline: 'Real-Time Co-Editing',
    description:
      'Edit pages simultaneously with your team. See live cursors, changes sync instantly.',
  },
};
