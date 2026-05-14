/**
 * NexusSegmentedControl — Flex / Grid / Block display toggle.
 *
 * Exact wrapper classes from prototype:
 *   flex bg-surface rounded border border-white/10 p-0.5
 *
 * Active button:  flex-1 h-7 rounded bg-white/10 text-on-surface font-mono-label
 * Inactive button: flex-1 h-7 rounded text-on-surface-variant hover:text-on-surface
 *                  hover:bg-white/5 font-mono-label transition-colors
 */

interface Option<T extends string> {
  value: T;
  label: string;
}

interface NexusSegmentedControlProps<T extends string> {
  label?: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}

export function NexusSegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: NexusSegmentedControlProps<T>) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="font-body-sm text-xs text-on-surface-variant">
          {label}
        </label>
      )}
      <div className="flex bg-surface rounded border border-white/10 p-0.5">
        {options.map((opt) => {
          const isActive = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={[
                'flex-1 h-7 rounded',
                'font-mono-label text-mono-label',
                'flex items-center justify-center',
                'transition-colors',
                isActive
                  ? 'bg-white/10 text-on-surface'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
