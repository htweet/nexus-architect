/**
 * AddonsPanel — Phase 8.4 Addon Marketplace
 */
import { useState } from 'react';
import { Package, Star, Download, Check, Loader2, Lock } from 'lucide-react';
import { useAddonStore, useUserStore, selectFlags } from '@nexus/core';
import { PremiumBadge } from '@/components/premium';
import type { AddonManifest, AddonCategory } from '@nexus/core';

const CATEGORY_LABELS: Record<AddonCategory, string> = {
  widgets:      'Widgets',
  integrations: 'Integrations',
  templates:    'Templates',
  utilities:    'Utilities',
};

const TIER_COLORS: Record<string, string> = {
  free:         'rgba(255,255,255,0.15)',
  professional: 'rgba(16,183,127,0.20)',
  agency:       'rgba(139,92,246,0.20)',
};

function AddonCard({ addon }: { addon: AddonManifest }) {
  const { installAddon, uninstallAddon, toggleAddon, installingId } = useAddonStore();
  const flags = useUserStore(selectFlags);
  const isInstalling = installingId === addon.id;

  const tierMap: Record<string, boolean> = {
    free: true,
    professional: flags.canAccessPremiumAddons,
    agency: flags.canUseCloudSync,
  };
  const canInstall = tierMap[addon.requiredTier] ?? false;

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl transition-colors"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg"
          style={{ background: TIER_COLORS[addon.requiredTier] || 'rgba(255,255,255,0.07)' }}>
          <Package size={18} style={{ color: '#dde4dd' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-bold" style={{ color: '#dde4dd' }}>{addon.name}</span>
            {addon.requiredTier !== 'free' && (
              <PremiumBadge tier={addon.requiredTier === 'agency' ? 'agency' : 'pro'} />
            )}
            {addon.isActive && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                style={{ background: 'rgba(16,183,127,0.15)', color: '#10b77f' }}>Active</span>
            )}
          </div>
          <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: '#9aab9a' }}>{addon.description}</p>
        </div>
      </div>

      {/* Stats */}
      {(addon.rating || addon.installCount) && (
        <div className="flex items-center gap-3 text-[10px]" style={{ color: '#4a5a4a' }}>
          {addon.rating && (
            <span className="flex items-center gap-0.5">
              <Star size={10} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
              {addon.rating}
              {addon.reviewCount && <span>({addon.reviewCount})</span>}
            </span>
          )}
          {addon.installCount && (
            <span className="flex items-center gap-0.5">
              <Download size={10} /> {addon.installCount.toLocaleString()} installs
            </span>
          )}
        </div>
      )}

      {/* Action */}
      <div className="flex gap-2 mt-auto">
        {!canInstall ? (
          <button disabled className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg text-[11px] font-semibold opacity-50 cursor-not-allowed"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#9aab9a', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Lock size={11} /> Requires {addon.requiredTier === 'agency' ? 'Agency' : 'Pro'}
          </button>
        ) : addon.isInstalled ? (
          <>
            <button
              onClick={() => toggleAddon(addon.id, !addon.isActive)}
              className="flex-1 h-7 rounded-lg text-[11px] font-semibold transition-colors"
              style={{ background: addon.isActive ? 'rgba(16,183,127,0.12)' : 'rgba(255,255,255,0.05)', color: addon.isActive ? '#10b77f' : '#9aab9a', border: `1px solid ${addon.isActive ? 'rgba(16,183,127,0.25)' : 'rgba(255,255,255,0.08)'}` }}
            >
              {addon.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => uninstallAddon(addon.id)}
              className="h-7 px-2 rounded-lg text-[11px] transition-colors hover:bg-red-900/20"
              style={{ color: '#e07070', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Remove
            </button>
          </>
        ) : (
          <button
            onClick={() => installAddon(addon.id)}
            disabled={isInstalling}
            className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg text-[11px] font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg, #10b77f, #0ea068)', color: '#fff', opacity: isInstalling ? 0.7 : 1 }}
          >
            {isInstalling ? <><Loader2 size={11} className="animate-spin" /> Installing…</> : <><Download size={11} /> Install</>}
          </button>
        )}
      </div>
    </div>
  );
}

export function AddonsPanel() {
  const { catalogue } = useAddonStore();
  const [activeCategory, setActiveCategory] = useState<AddonCategory | 'all'>('all');

  const categories: Array<AddonCategory | 'all'> = ['all', 'widgets', 'integrations', 'templates', 'utilities'];
  const filtered = activeCategory === 'all' ? catalogue : catalogue.filter((a) => a.category === activeCategory);
  const installedCount = catalogue.filter((a) => a.isInstalled).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,183,127,0.12)' }}>
          <Package size={16} style={{ color: '#10b77f' }} />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-bold" style={{ color: '#dde4dd' }}>Addons</h2>
          <p className="text-[11px]" style={{ color: '#9aab9a' }}>{installedCount} installed · {catalogue.length} available</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 px-5 py-3 border-b overflow-x-auto flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="flex-shrink-0 px-3 h-6 rounded-full text-[11px] font-medium transition-colors capitalize"
            style={{
              background: activeCategory === cat ? 'rgba(16,183,127,0.15)' : 'rgba(255,255,255,0.05)',
              color: activeCategory === cat ? '#10b77f' : '#9aab9a',
              border: `1px solid ${activeCategory === cat ? 'rgba(16,183,127,0.30)' : 'transparent'}`,
            }}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 grid grid-cols-1 gap-3 content-start">
        {filtered.map((addon) => <AddonCard key={addon.id} addon={addon} />)}
      </div>
    </div>
  );
}
