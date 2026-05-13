/**
 * PremiumGate — wraps any UI surface that requires a paid tier.
 *
 * Usage:
 *   <PremiumGate flag="canUseDynamicData">
 *     <DynamicDataPicker />          ← only rendered when flag is true
 *   </PremiumGate>
 *
 * When the user lacks the flag, renders an UpgradePrompt overlay instead.
 * NEVER hard-blocks — the user's existing content is always safe.
 */

import { type ReactNode } from 'react';
import { useUserStore, selectFlags } from '@nexus/core';
import { UpgradePrompt } from './UpgradePrompt';
import { PremiumBadge } from './PremiumBadge';
import type { FeatureFlags } from '@nexus/core';

interface PremiumGateProps {
  /** Feature flag key from FeatureFlags interface. */
  flag: keyof FeatureFlags;
  children: ReactNode;
  /**
   * 'overlay'  — renders children beneath a translucent upgrade overlay (default).
   * 'replace'  — hides children entirely and shows the prompt inline.
   * 'badge'    — renders children normally but adds a 'Pro' badge.
   */
  mode?: 'overlay' | 'replace' | 'badge';
  /** Custom title for the upgrade prompt. Falls back to UPGRADE_CONTEXTS lookup. */
  headline?: string;
  /** Custom description for the upgrade prompt. */
  description?: string;
}

export function PremiumGate({
  flag,
  children,
  mode = 'overlay',
  headline,
  description,
}: PremiumGateProps) {
  const flags = useUserStore(selectFlags);
  const hasAccess = Boolean(flags[flag]);

  if (hasAccess) return <>{children}</>;

  if (mode === 'badge') {
    return (
      <div className="relative">
        {children}
        <PremiumBadge className="absolute top-1 right-1" />
      </div>
    );
  }

  if (mode === 'replace') {
    return (
      <UpgradePrompt
        flag={flag}
        {...(headline    !== undefined && { headline })}
        {...(description !== undefined && { description })}
      />
    );
  }

  // overlay mode (default)
  return (
    <div className="relative">
      <div className="opacity-30 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center rounded-lg">
        <UpgradePrompt
          flag={flag}
          {...(headline    !== undefined && { headline })}
          {...(description !== undefined && { description })}
          compact
        />
      </div>
    </div>
  );
}
