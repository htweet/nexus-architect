import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PremiumBadgeProps {
  tier?: 'pro' | 'agency';
  className?: string;
  size?: 'sm' | 'xs';
}

export function PremiumBadge({ tier = 'pro', className, size = 'xs' }: PremiumBadgeProps) {
  const label = tier === 'agency' ? 'Agency' : 'Pro';
  const isXs  = size === 'xs';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-bold rounded-full uppercase tracking-wide',
        isXs ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1',
        className,
      )}
      style={{
        background: 'linear-gradient(135deg, rgba(16,183,127,0.18), rgba(16,183,127,0.08))',
        border: '1px solid rgba(16,183,127,0.30)',
        color: '#10b77f',
      }}
    >
      <Sparkles size={isXs ? 7 : 9} />
      {label}
    </span>
  );
}
