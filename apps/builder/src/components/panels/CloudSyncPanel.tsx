/**
 * CloudSyncPanel — Phase 8.6
 * Agency tier: sync global components across all client sites.
 */
import { useState } from 'react';
import { Cloud, RefreshCw, AlertTriangle, CheckCircle, Clock, GitMerge, Wifi, WifiOff, Plus, ExternalLink } from 'lucide-react';
import { useCloudSyncStore, useUserStore, selectFlags, selectPendingCount, selectConflictCount } from '@nexus/core';
import { PremiumGate } from '@/components/premium';

const STATUS_CONFIG = {
  synced:   { color: '#10b77f', icon: CheckCircle,   label: 'Synced'    },
  pending:  { color: '#f59e0b', icon: Clock,         label: 'Pending'   },
  syncing:  { color: '#60a5fa', icon: RefreshCw,     label: 'Syncing'   },
  error:    { color: '#e07070', icon: AlertTriangle,  label: 'Error'     },
  conflict: { color: '#f97316', icon: GitMerge,      label: 'Conflict'  },
} as const;

function SiteRow({ site, onSync }: { site: any; onSync: (id: string) => void }) {
  const cfg = STATUS_CONFIG[site.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold truncate" style={{ color: '#dde4dd' }}>{site.name}</p>
        <p className="text-[10px] truncate" style={{ color: '#4a5a4a' }}>{site.url}</p>
        <p className="text-[10px] mt-0.5" style={{ color: '#4a5a4a' }}>
          {site.lastSync ? `Last sync: ${new Date(site.lastSync).toLocaleDateString()}` : 'Never synced'}
          · {site.pageCount} pages · {site.componentCount} components
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <StatusIcon size={12} style={{ color: cfg.color }} />
          <span className="text-[10px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
        {site.status !== 'synced' && (
          <button
            onClick={() => onSync(site.id)}
            className="h-6 px-2 rounded-md text-[10px] font-semibold transition-colors"
            style={{ background: 'rgba(16,183,127,0.12)', color: '#10b77f', border: '1px solid rgba(16,183,127,0.25)' }}
          >
            Sync
          </button>
        )}
      </div>
    </div>
  );
}

function ComponentRow({ component, onResolve }: { component: any; onResolve: (id: string, r: 'local' | 'remote') => void }) {
  const TYPE_COLORS: Record<string, string> = { header: '#60a5fa', footer: '#a78bfa', section: '#f59e0b', 'design-tokens': '#10b77f' };
  const color = TYPE_COLORS[component.type] ?? '#9aab9a';
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${component.hasConflict ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color }}>{component.type}</span>
          <p className="text-[12px] font-semibold" style={{ color: '#dde4dd' }}>{component.name}</p>
          {component.hasConflict && <AlertTriangle size={12} style={{ color: '#f97316' }} />}
        </div>
        <p className="text-[10px] mt-1" style={{ color: '#4a5a4a' }}>
          {component.syncedSites.length} synced · {component.pendingSites.length} pending
        </p>
      </div>
      {component.hasConflict && (
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onResolve(component.id, 'local')} className="h-6 px-2 rounded text-[10px] font-semibold" style={{ background: 'rgba(16,183,127,0.12)', color: '#10b77f' }}>Keep Local</button>
          <button onClick={() => onResolve(component.id, 'remote')} className="h-6 px-2 rounded text-[10px] font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: '#9aab9a' }}>Use Remote</button>
        </div>
      )}
    </div>
  );
}

export function CloudSyncPanel() {
  const { isConnected, cloudAccountEmail, sites, components, isSyncing, lastGlobalSync, connect, disconnect, syncAll, syncSite, resolveConflict } = useCloudSyncStore();
  const pendingCount = useCloudSyncStore(selectPendingCount);
  const conflictCount = useCloudSyncStore(selectConflictCount);
  const [connectEmail, setConnectEmail] = useState('');
  const [tab, setTab] = useState<'sites' | 'components'>('sites');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,183,127,0.12)' }}>
          <Cloud size={16} style={{ color: '#10b77f' }} />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-bold" style={{ color: '#dde4dd' }}>Cloud Sync</h2>
          <p className="text-[11px]" style={{ color: '#9aab9a' }}>Push components across all client sites</p>
        </div>
        {isConnected && (
          <div className="flex items-center gap-1.5">
            <Wifi size={12} style={{ color: '#10b77f' }} />
            <span className="text-[10px]" style={{ color: '#10b77f' }}>Connected</span>
          </div>
        )}
      </div>

      <PremiumGate flag="canUseCloudSync" mode="replace">
        {!isConnected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,183,127,0.08)', border: '1px solid rgba(16,183,127,0.20)' }}>
              <WifiOff size={24} style={{ color: '#10b77f', opacity: 0.5 }} />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-bold mb-1" style={{ color: '#dde4dd' }}>Connect Your Cloud Account</p>
              <p className="text-[12px]" style={{ color: '#9aab9a' }}>Enter your Nexus Cloud email to start syncing components across sites.</p>
            </div>
            <div className="w-full max-w-[300px] flex flex-col gap-2">
              <input
                value={connectEmail}
                onChange={(e) => setConnectEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-9 w-full rounded-lg px-3 text-[12px] outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: '#dde4dd' }}
              />
              <button
                onClick={() => connectEmail && connect(connectEmail)}
                className="h-9 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #10b77f, #0ea068)', color: '#fff' }}
              >
                Connect Cloud Account
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="flex items-center gap-4 px-5 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="text-center">
                <p className="text-[18px] font-black" style={{ color: '#dde4dd' }}>{sites.length}</p>
                <p className="text-[10px]" style={{ color: '#9aab9a' }}>Sites</p>
              </div>
              <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <div className="text-center">
                <p className="text-[18px] font-black" style={{ color: pendingCount > 0 ? '#f59e0b' : '#dde4dd' }}>{pendingCount}</p>
                <p className="text-[10px]" style={{ color: '#9aab9a' }}>Pending</p>
              </div>
              <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <div className="text-center">
                <p className="text-[18px] font-black" style={{ color: conflictCount > 0 ? '#f97316' : '#dde4dd' }}>{conflictCount}</p>
                <p className="text-[10px]" style={{ color: '#9aab9a' }}>Conflicts</p>
              </div>
              <button
                onClick={syncAll}
                disabled={isSyncing}
                className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #10b77f, #0ea068)', color: '#fff' }}
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing…' : 'Sync All'}
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-5 py-2 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              {(['sites', 'components'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className="px-3 h-7 rounded-lg text-[11px] font-medium transition-colors capitalize" style={{ background: tab === t ? 'rgba(16,183,127,0.12)' : 'transparent', color: tab === t ? '#10b77f' : '#9aab9a' }}>
                  {t}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-2">
              {tab === 'sites'
                ? sites.map((site) => <SiteRow key={site.id} site={site} onSync={syncSite} />)
                : components.map((comp) => <ComponentRow key={comp.id} component={comp} onResolve={resolveConflict} />)}
            </div>

            {/* Account footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div>
                <p className="text-[11px]" style={{ color: '#9aab9a' }}>{cloudAccountEmail}</p>
                {lastGlobalSync && <p className="text-[10px]" style={{ color: '#4a5a4a' }}>Last sync: {new Date(lastGlobalSync).toLocaleString()}</p>}
              </div>
              <button onClick={disconnect} className="text-[11px] transition-opacity hover:opacity-70" style={{ color: '#e07070' }}>Disconnect</button>
            </div>
          </>
        )}
      </PremiumGate>
    </div>
  );
}
