import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/cn';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  disabled?: boolean;
}

export function Tooltip({
  content,
  children,
  side = 'bottom',
  align = 'center',
  delayDuration = 600,
  disabled = false,
}: TooltipProps) {
  if (disabled) return <>{children}</>;

  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            align={align}
            sideOffset={6}
            className={cn(
              'z-50 max-w-[200px] rounded px-2 py-1',
              'text-[11px] font-medium text-text-primary leading-tight',
              'glass-card border border-white/10',
              'animate-fade-in',
            )}
          >
            {content}
            <RadixTooltip.Arrow className="fill-[rgba(18,24,33,0.9)]" width={8} height={4} />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
