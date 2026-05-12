import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/cn';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ButtonVariant = 'accent' | 'ghost' | 'outline' | 'danger' | 'subtle';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
  iconOnly?: boolean;
}

// ─── Base ─────────────────────────────────────────────────────────────────────

const base =
  'inline-flex items-center justify-center gap-1.5 font-semibold rounded-md select-none ' +
  'transition-all duration-[180ms] ease-[cubic-bezier(0.2,0,0.2,1)] ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-[#10b77f] ' +
  'disabled:pointer-events-none disabled:opacity-40 cursor-pointer';

// ─── Variants — 100% CSS tokens ──────────────────────────────────────────────

const variants: Record<ButtonVariant, string> = {
  accent:
    'bg-[#10b77f] text-white ' +
    'shadow-[0_0_20px_rgba(16,183,127,0.30)] ' +
    'hover:bg-[#0da870] hover:shadow-[0_0_30px_rgba(16,183,127,0.40)] ' +
    'active:bg-[#0a9668]',
  ghost:
    'bg-transparent text-[#bbcabf] ' +
    'hover:text-[#dde4dd] hover:bg-[rgba(255,255,255,0.06)] ' +
    'active:bg-[rgba(255,255,255,0.10)]',
  outline:
    'bg-transparent border border-[rgba(255,255,255,0.10)] text-[#bbcabf] ' +
    'hover:border-[rgba(255,255,255,0.15)] hover:text-[#dde4dd] ' +
    'hover:bg-[rgba(255,255,255,0.04)]',
  danger:
    'bg-[rgba(147,0,10,0.20)] border border-[rgba(147,0,10,0.20)] ' +
    'text-[#ffb4ab] hover:bg-[rgba(239,68,68,0.2)]',
  subtle:
    'bg-[rgba(255,255,255,0.05)] text-[#bbcabf] ' +
    'hover:bg-[rgba(255,255,255,0.10)] hover:text-[#dde4dd]',
};

// ─── Sizes — explicit Tailwind utilities (no undefined custom classes) ─────────

const sizes: Record<ButtonSize, string> = {
  xs: 'h-6  px-2.5 text-[11px] tracking-[0.01em]',
  sm: 'h-7  px-3   text-xs',
  md: 'h-9  px-4   text-sm',
  lg: 'h-10 px-5   text-sm',
};

const iconOnlySizes: Record<ButtonSize, string> = {
  xs: 'h-6  w-6  p-0',
  sm: 'h-7  w-7  p-0',
  md: 'h-9  w-9  p-0',
  lg: 'h-10 w-10 p-0',
};

// ─── Component ───────────────────────────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'ghost',
      size = 'md',
      asChild = false,
      loading = false,
      iconOnly = false,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(
          base,
          variants[variant],
          iconOnly ? iconOnlySizes[size] : sizes[size],
          loading && 'pointer-events-none',
          className,
        )}
        disabled={disabled ?? loading}
        {...props}
      >
        {loading ? (
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
        ) : (
          children
        )}
      </Comp>
    );
  },
);

Button.displayName = 'Button';
