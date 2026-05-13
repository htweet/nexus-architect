/**
 * BindingBadge — small indicator shown on a widget prop when it has a dynamic binding.
 */
import { Zap } from 'lucide-react';
import { useDynamicDataStore, selectBinding } from '@nexus/core';

interface BindingBadgeProps {
  nodeId: string;
  propKey: string;
  onOpen?: () => void;
}

export function BindingBadge({ nodeId, propKey, onOpen }: BindingBadgeProps) {
  const binding = useDynamicDataStore(selectBinding(nodeId, propKey));
  if (!binding) return null;

  return (
    <button
      onClick={onOpen}
      title={`Bound to ${binding.sourceId} → ${binding.fieldKey}`}
      className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-opacity hover:opacity-80"
      style={{
        background: 'rgba(16,183,127,0.15)',
        border: '1px solid rgba(16,183,127,0.30)',
        color: '#10b77f',
      }}
    >
      <Zap size={8} />
      Dynamic
    </button>
  );
}
