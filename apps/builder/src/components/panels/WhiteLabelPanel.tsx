/**
 * WhiteLabelPanel — Phase 8.2
 * Professional & Agency tiers. Remove all Nexus Architect branding.
 */
import { useRef } from 'react';
import { Brush, Upload, X, Eye, EyeOff, Users } from 'lucide-react';
import { useWhiteLabelStore, useUserStore, selectFlags } from '@nexus/core';
import { PremiumGate } from '@/components/premium';

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: '#9aab9a' }}>{label}</label>
      {children}
      {hint && <p className="text-[10px]" style={{ color: '#4a5a4a' }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-8 w-full rounded-lg px-3 text-[12px] outline-none transition-colors"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#dde4dd',
      }}
    />
  );
}

export function WhiteLabelPanel() {
  const { config, updateConfig } = useWhiteLabelStore();
  const flags = useUserStore(selectFlags);
  const logoRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') updateConfig({ logoUrl: result });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,183,127,0.12)' }}>
          <Brush size={16} style={{ color: '#10b77f' }} />
        </div>
        <div>
          <h2 className="text-[14px] font-bold" style={{ color: '#dde4dd' }}>White Label</h2>
          <p className="text-[11px]" style={{ color: '#9aab9a' }}>Brand the builder as your own</p>
        </div>
      </div>

      <PremiumGate flag="canWhiteLabel" mode="replace">
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {/* Master toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(16,183,127,0.06)', border: '1px solid rgba(16,183,127,0.15)' }}>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: '#dde4dd' }}>Enable White Label</p>
              <p className="text-[11px]" style={{ color: '#9aab9a' }}>Apply custom branding across the builder</p>
            </div>
            <button
              onClick={() => updateConfig({ enabled: !config.enabled })}
              className="relative h-6 w-11 rounded-full transition-colors"
              style={{ background: config.enabled ? '#10b77f' : 'rgba(255,255,255,0.10)' }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                style={{ left: config.enabled ? '22px' : '2px' }}
              />
            </button>
          </div>

          {/* Brand Identity */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#50dea3' }}>Brand Identity</h3>
            <FieldRow label="Brand Name" hint="Replaces 'Nexus Architect' in all UI text">
              <TextInput value={config.brandName} onChange={(v) => updateConfig({ brandName: v })} placeholder="Your Agency Name" />
            </FieldRow>
            <FieldRow label="Logo" hint="SVG or PNG recommended. Max 120px height.">
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <div className="flex gap-2">
                <button
                  onClick={() => logoRef.current?.click()}
                  className="flex items-center gap-2 h-9 px-3 rounded-lg text-[12px] font-medium transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: '#dde4dd' }}
                >
                  <Upload size={13} /> Upload Logo
                </button>
                {config.logoUrl && (
                  <>
                    <img src={config.logoUrl} alt="Brand logo" className="h-9 rounded-lg object-contain px-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <button onClick={() => updateConfig({ logoUrl: '' })} className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#9aab9a' }}>
                      <X size={13} />
                    </button>
                  </>
                )}
              </div>
            </FieldRow>
            <FieldRow label="Primary Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                  className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <TextInput value={config.primaryColor} onChange={(v) => updateConfig({ primaryColor: v })} placeholder="#10b77f" />
              </div>
            </FieldRow>
          </div>

          {/* Admin */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#50dea3' }}>Admin URL</h3>
            <FieldRow label="Admin Slug" hint="The builder opens at /wp-admin/admin.php?page={slug}">
              <TextInput value={config.adminSlug} onChange={(v) => updateConfig({ adminSlug: v })} placeholder="my-builder" />
            </FieldRow>
          </div>

          {/* Output */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#50dea3' }}>Front-end Output</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium" style={{ color: '#dde4dd' }}>Hide Footer Credit</p>
                <p className="text-[10px]" style={{ color: '#9aab9a' }}>Remove "Built with Nexus Architect"</p>
              </div>
              <button
                onClick={() => updateConfig({ hideFooterCredit: !config.hideFooterCredit })}
                className="relative h-5 w-10 rounded-full transition-colors"
                style={{ background: config.hideFooterCredit ? '#10b77f' : 'rgba(255,255,255,0.10)' }}
              >
                <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform" style={{ left: config.hideFooterCredit ? '18px' : '2px' }} />
              </button>
            </div>
          </div>

          {/* Client Mode (Agency only) */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#50dea3' }}>Client Mode</h3>
            <PremiumGate flag="hasClientPortal" mode="replace">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Users size={13} style={{ color: '#9aab9a' }} />
                    <p className="text-[12px] font-medium" style={{ color: '#dde4dd' }}>Restricted Client View</p>
                  </div>
                  <p className="text-[10px]" style={{ color: '#9aab9a' }}>Hide advanced controls from non-technical clients</p>
                </div>
                <button
                  onClick={() => updateConfig({ clientModeEnabled: !config.clientModeEnabled })}
                  className="relative h-5 w-10 rounded-full transition-colors"
                  style={{ background: config.clientModeEnabled ? '#10b77f' : 'rgba(255,255,255,0.10)' }}
                >
                  <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform" style={{ left: config.clientModeEnabled ? '18px' : '2px' }} />
                </button>
              </div>
            </PremiumGate>
          </div>
        </div>
      </PremiumGate>
    </div>
  );
}
