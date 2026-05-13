/**
 * UpgradePrompt — the most financially important screen in the builder.
 * Blueprint spec: polished, non-intrusive, names exact tier + price, links to checkout.
 */

import { Sparkles, Lock, ArrowRight, Zap, Building2 } from 'lucide-react';
import { useUserStore, selectFlags, UPGRADE_CONTEXTS } from '@nexus/core';
import type { FeatureFlags } from '@nexus/core';

const TIER_PRICES: Record<string, { monthly: number; annual: number; label: string }> = {
  personal:     { monthly: 9,  annual: 79,  label: 'Personal'     },
  professional: { monthly: 29, annual: 249, label: 'Professional' },
  agency:       { monthly: 79, annual: 699, label: 'Agency'       },
};

const TIER_ICONS: Record<string, typeof Sparkles> = {
  personal:     Zap,
  professional: Sparkles,
  agency:       Building2,
};

interface UpgradePromptProps {
  flag: keyof FeatureFlags;
  headline?: string;
  description?: string;
  /** Compact mode for overlay inside other UI. */
  compact?: boolean;
}

export function UpgradePrompt({ flag, headline, description, compact = false }: UpgradePromptProps) {
  const ctx = UPGRADE_CONTEXTS[flag as keyof typeof UPGRADE_CONTEXTS];
  const tier = ctx?.requiredTier ?? 'professional';
  const pricing = TIER_PRICES[tier];
  const TierIcon = TIER_ICONS[tier] ?? Sparkles;

  const title = headline ?? ctx?.headline ?? 'Upgrade to unlock this feature';
  const desc  = description ?? ctx?.description ?? 'This feature requires a paid plan.';

  const checkoutUrl = `https://nexus-architect.com/pricing?plan=${tier}&ref=builder_gate`;

  if (compact) {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-xl px-4 py-3 text-center max-w-[220px] mx-auto"
        style={{
          background: 'rgba(16,183,127,0.08)',
          border: '1px solid rgba(16,183,127,0.25)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-center gap-1.5">
          <TierIcon size={13} style={{ color: '#10b77f' }} />
          <span className="text-[11px] font-bold tracking-wide uppercase" style={{ color: '#10b77f' }}>
            {pricing?.label ?? 'Pro'} Feature
          </span>
        </div>
        <p className="text-[11px] leading-snug" style={{ color: '#bbcabf' }}>{title}</p>
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] font-semibold rounded-md px-3 py-1.5 transition-all"
          style={{
            background: 'linear-gradient(135deg, #10b77f, #0ea068)',
            color: '#fff',
          }}
        >
          Upgrade <ArrowRight size={10} />
        </a>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-6"
      style={{
        background: 'linear-gradient(145deg, rgba(16,183,127,0.06), rgba(16,183,127,0.02))',
        border: '1px solid rgba(16,183,127,0.20)',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(16,183,127,0.12)' }}
        >
          <Lock size={18} style={{ color: '#10b77f' }} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <TierIcon size={13} style={{ color: '#10b77f' }} />
            <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: '#10b77f' }}>
              {pricing?.label ?? 'Pro'} Plan
            </span>
          </div>
          <h3 className="text-[14px] font-bold leading-snug" style={{ color: '#dde4dd' }}>{title}</h3>
        </div>
      </div>

      {/* Description */}
      <p className="text-[12px] leading-relaxed" style={{ color: '#9aab9a' }}>{desc}</p>

      {/* Pricing pill */}
      {pricing && (
        <div
          className="flex items-baseline gap-1.5 rounded-lg px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="text-[22px] font-black" style={{ color: '#dde4dd' }}>
            ${pricing.annual}
          </span>
          <span className="text-[12px]" style={{ color: '#9aab9a' }}>/year</span>
          <span
            className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(16,183,127,0.12)', color: '#10b77f' }}
          >
            Save {Math.round((1 - pricing.annual / (pricing.monthly * 12)) * 100)}%
          </span>
        </div>
      )}

      {/* CTA */}
      <a
        href={checkoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 h-10 rounded-xl font-bold text-[13px] transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg, #10b77f, #0ea068)', color: '#fff' }}
      >
        <TierIcon size={15} />
        Upgrade to {pricing?.label ?? 'Pro'}
        <ArrowRight size={14} />
      </a>

      <p className="text-center text-[11px]" style={{ color: 'rgba(154,171,154,0.6)' }}>
        14-day money-back guarantee · No questions asked
      </p>
    </div>
  );
}
