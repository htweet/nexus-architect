/**
 * LicensePanel — Phase 8.5
 * Activation code input, tier display, Lemon Squeezy checkout links.
 */
import { useState } from 'react';
import { Key, CheckCircle, AlertCircle, ArrowRight, Zap, Sparkles, Building2, Loader2, ExternalLink } from 'lucide-react';
import { useUserStore, selectUser, selectFlags } from '@nexus/core';

const PLANS = [
  {
    id: 'personal',
    name: 'Personal',
    icon: Zap,
    price: { monthly: 9, annual: 79 },
    color: '#60a5fa',
    features: ['Unlimited pages', '50 AI generations/mo', 'AI content population', 'All core widgets', 'Priority email support'],
  },
  {
    id: 'professional',
    name: 'Professional',
    icon: Sparkles,
    price: { monthly: 29, annual: 249 },
    color: '#10b77f',
    features: ['Everything in Personal', 'White-label branding', 'Dynamic data binding', 'Premium addon access', '200 AI generations/mo', 'Presence awareness'],
    popular: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    icon: Building2,
    price: { monthly: 79, annual: 699 },
    color: '#a78bfa',
    features: ['Everything in Pro', 'Cloud sync (all sites)', '5 team seats', 'Client portal mode', 'Unlimited AI generations', 'Real-time co-editing'],
  },
];

export function LicensePanel() {
  const user = useUserStore(selectUser);
  const flags = useUserStore(selectFlags);
  const { setUser } = useUserStore();

  const [activationCode, setActivationCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<'success' | 'error' | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const currentTier = flags.tier;

  const handleActivate = async () => {
    if (!activationCode.trim()) return;
    setIsActivating(true);
    setActivationResult(null);
    // Mock activation — real impl calls licensing server (Lemon Squeezy)
    await new Promise((r) => setTimeout(r, 1500));
    // Demo: any code starting with "PRO-" activates professional tier
    if (activationCode.toUpperCase().startsWith('PRO-')) {
      setUser({ ...(user ?? { id: '1', name: 'User', email: '', siteCount: 1 }), tier: 'professional' });
      setActivationResult('success');
    } else if (activationCode.toUpperCase().startsWith('AGY-')) {
      setUser({ ...(user ?? { id: '1', name: 'User', email: '', siteCount: 1 }), tier: 'agency' });
      setActivationResult('success');
    } else {
      setActivationResult('error');
    }
    setIsActivating(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,183,127,0.12)' }}>
          <Key size={16} style={{ color: '#10b77f' }} />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-bold" style={{ color: '#dde4dd' }}>License</h2>
          <p className="text-[11px]" style={{ color: '#9aab9a' }}>
            Current plan: <span className="font-semibold capitalize" style={{ color: '#50dea3' }}>{currentTier}</span>
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        {/* Activation */}
        <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-[12px] font-bold" style={{ color: '#dde4dd' }}>Activate License</h3>
          <p className="text-[11px]" style={{ color: '#9aab9a' }}>Enter your license key from your Nexus Architect purchase email.</p>
          <div className="flex gap-2">
            <input
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="flex-1 h-9 rounded-lg px-3 text-[12px] font-mono outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${activationResult === 'error' ? 'rgba(224,112,112,0.40)' : 'rgba(255,255,255,0.10)'}`, color: '#dde4dd' }}
            />
            <button
              onClick={handleActivate}
              disabled={isActivating || !activationCode.trim()}
              className="h-9 px-4 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #10b77f, #0ea068)', color: '#fff' }}
            >
              {isActivating ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
              Activate
            </button>
          </div>
          {activationResult === 'success' && (
            <div className="flex items-center gap-2 text-[11px]" style={{ color: '#10b77f' }}>
              <CheckCircle size={13} /> License activated successfully!
            </div>
          )}
          {activationResult === 'error' && (
            <div className="flex items-center gap-2 text-[11px]" style={{ color: '#e07070' }}>
              <AlertCircle size={13} /> Invalid license key. Check your purchase email or contact support.
            </div>
          )}
          <p className="text-[10px]" style={{ color: '#4a5a4a' }}>
            Demo: use <code className="font-mono" style={{ color: '#50dea3' }}>PRO-DEMO</code> for Professional or <code className="font-mono" style={{ color: '#50dea3' }}>AGY-DEMO</code> for Agency.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(['monthly', 'annual'] as const).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className="px-3 h-6 rounded-md text-[11px] font-semibold transition-all capitalize"
                style={{
                  background: billingCycle === cycle ? 'rgba(16,183,127,0.15)' : 'transparent',
                  color: billingCycle === cycle ? '#10b77f' : '#9aab9a',
                }}
              >
                {cycle}
              </button>
            ))}
          </div>
          {billingCycle === 'annual' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,183,127,0.15)', color: '#10b77f' }}>
              Save up to 30%
            </span>
          )}
        </div>

        {/* Plan cards */}
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentTier === plan.id;
          const price = billingCycle === 'annual' ? plan.price.annual : plan.price.monthly;
          const checkoutUrl = `https://nexus-architect.com/pricing?plan=${plan.id}&cycle=${billingCycle}&ref=builder_license`;
          return (
            <div
              key={plan.id}
              className="flex flex-col gap-3 p-4 rounded-xl relative"
              style={{
                background: isCurrent ? `rgba(${plan.id === 'agency' ? '167,139,250' : '16,183,127'},0.06)` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isCurrent ? `${plan.color}40` : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              {plan.popular && !isCurrent && (
                <span className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,183,127,0.15)', color: '#10b77f' }}>
                  Most Popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${plan.color}20`, color: plan.color }}>
                  <CheckCircle size={9} /> Current Plan
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${plan.color}15` }}>
                  <Icon size={16} style={{ color: plan.color }} />
                </div>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: '#dde4dd' }}>{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[20px] font-black" style={{ color: '#dde4dd' }}>${price}</span>
                    <span className="text-[11px]" style={{ color: '#9aab9a' }}>/{billingCycle === 'annual' ? 'year' : 'mo'}</span>
                  </div>
                </div>
              </div>
              <ul className="flex flex-col gap-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[11px]" style={{ color: '#9aab9a' }}>
                    <CheckCircle size={11} style={{ color: plan.color, flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              {!isCurrent && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 h-8 rounded-lg text-[12px] font-semibold transition-all hover:opacity-90"
                  style={{ background: `${plan.color}20`, color: plan.color, border: `1px solid ${plan.color}30` }}
                >
                  Upgrade to {plan.name} <ArrowRight size={12} />
                </a>
              )}
            </div>
          );
        })}

        {/* Support link */}
        <a
          href="https://nexus-architect.com/support"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-[11px] py-2 transition-opacity hover:opacity-70"
          style={{ color: '#9aab9a' }}
        >
          Need help with your license? Contact support <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}
