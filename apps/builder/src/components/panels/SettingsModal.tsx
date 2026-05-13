/**
 * SettingsModal — Phase 8 unified settings hub.
 * Houses: License, White-Label, Addons, Cloud Sync panels.
 */
import { useState } from 'react';
import { X, Key, Brush, Package, Cloud } from 'lucide-react';
import { LicensePanel } from './LicensePanel';
import { WhiteLabelPanel } from './WhiteLabelPanel';
import { AddonsPanel } from './AddonsPanel';
import { CloudSyncPanel } from './CloudSyncPanel';
import { useUserStore, selectFlags, useCloudSyncStore, selectPendingCount, useAddonStore } from '@nexus/core';

type SettingsTab = 'license' | 'whitelabel' | 'addons' | 'cloudsync';

const TABS: Array<{ id: SettingsTab; label: string; icon: typeof Key }> = [
  { id: 'license',    label: 'License',     icon: Key     },
  { id: 'whitelabel', label: 'White Label',  icon: Brush   },
  { id: 'addons',     label: 'Addons',       icon: Package },
  { id: 'cloudsync',  label: 'Cloud Sync',   icon: Cloud   },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: SettingsTab;
}

export function SettingsModal({ isOpen, onClose, defaultTab = 'license' }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);
  const flags        = useUserStore(selectFlags);
  const pendingSync  = useCloudSyncStore(selectPendingCount);
  const installedAddons = useAddonStore((s) => s.catalogue.filter((a) => a.isInstalled).length);

  if (!isOpen) return null;

  const badges: Partial<Record<SettingsTab, string>> = {
    ...(pendingSync > 0    && { cloudsync: String(pendingSync) }),
    ...(installedAddons > 0 && { addons: String(installedAddons) }),
  };

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative flex w-full max-w-[860px] rounded-2xl overflow-hidden"
        style={{
          background: '#0e1810',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 100px rgba(0,0,0,0.7)',
          height: '82vh',
          maxHeight: '680px',
        }}
      >
        {/* Sidebar nav */}
        <div
          className="w-[188px] flex-shrink-0 flex flex-col border-r py-4"
          style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.20)' }}
        >
          {/* Header */}
          <div className="px-4 mb-4">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#50dea3' }}>
              Settings
            </p>
          </div>

          {/* Nav items */}
          <nav className="flex flex-col gap-0.5 px-2 flex-1">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive  = activeTab === id;
              const badge     = badges[id];
              const isLocked  = (id === 'whitelabel' && !flags.canWhiteLabel) ||
                                (id === 'cloudsync'  && !flags.canUseCloudSync);
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="flex items-center gap-2.5 w-full px-3 h-9 rounded-xl text-left transition-all"
                  style={{
                    background: isActive ? 'rgba(16,183,127,0.12)' : 'transparent',
                    color:      isActive ? '#dde4dd' : '#9aab9a',
                    border:     isActive ? '1px solid rgba(16,183,127,0.20)' : '1px solid transparent',
                  }}
                >
                  <Icon size={14} style={{ color: isActive ? '#10b77f' : 'inherit', flexShrink: 0 }} />
                  <span className="flex-1 text-[12px] font-medium">{label}</span>
                  {badge && (
                    <span
                      className="text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(16,183,127,0.20)', color: '#10b77f' }}
                    >
                      {badge}
                    </span>
                  )}
                  {isLocked && !isActive && (
                    <span
                      className="text-[8px] font-bold px-1 py-0.5 rounded-full"
                      style={{ background: 'rgba(16,183,127,0.10)', color: '#10b77f' }}
                    >
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Version footer */}
          <div className="px-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[10px]" style={{ color: '#4a5a4a' }}>Nexus Architect v1.0.0</p>
            <p className="text-[10px]" style={{ color: '#4a5a4a' }}>Tier: <span style={{ color: '#50dea3' }} className="capitalize">{flags.tier}</span></p>
          </div>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'license'    && <LicensePanel    />}
          {activeTab === 'whitelabel' && <WhiteLabelPanel />}
          {activeTab === 'addons'     && <AddonsPanel     />}
          {activeTab === 'cloudsync'  && <CloudSyncPanel  />}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
          style={{ color: '#9aab9a' }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
