import { cn } from '@/lib/cn';

type BadgeVariant = 'accent' | 'pro' | 'agency' | 'warning' | 'error' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  accent: 'bg-emerald-subtle border border-emerald/25 text-emerald',
  pro: 'bg-gradient-to-r from-emerald-subtle to-[rgba(10,122,85,0.1)] border border-emerald/25 text-emerald',
  agency: 'bg-blue-500/10 border border-blue-500/25 text-blue-400',
  warning: 'bg-warning/10 border border-warning/25 text-warning',
  error: 'bg-error/10 border border-error/25 text-error',
  neutral: 'bg-white/5 border border-border text-text-secondary',
};

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
        'text-[10px] font-semibold tracking-wide uppercase',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
