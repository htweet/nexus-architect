/**
 * DynamicDataPicker — source + field selector modal (Phase 8.3)
 * Opens when a user clicks the ⚡ binding icon on a widget prop.
 */
import { useState } from 'react';
import { X, Zap, Search, ChevronRight, Check, Globe, ShoppingCart, Database, Wifi } from 'lucide-react';
import { useDynamicDataStore } from '@nexus/core';
import type { DataSource, DataField } from '@nexus/core';

const SOURCE_ICONS: Record<string, typeof Globe> = {
  wordpress_core: Globe,
  woocommerce:    ShoppingCart,
  acf:            Database,
  rest_api:       Wifi,
};

export function DynamicDataPicker() {
  const { sources, activePicker, bindings, addBinding, removeBinding, closePicker } =
    useDynamicDataStore();

  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [search, setSearch] = useState('');

  if (!activePicker) return null;

  const { nodeId, propKey } = activePicker;
  const bindingKey = `${nodeId}:${propKey}`;
  const currentBinding = bindings[bindingKey] ?? null;

  const availableSources = sources.filter((s) => s.isAvailable);

  const filteredFields = selectedSource
    ? selectedSource.fields.filter(
        (f) =>
          f.label.toLowerCase().includes(search.toLowerCase()) ||
          f.key.toLowerCase().includes(search.toLowerCase()),
      )
    : [];

  const handleSelectField = (source: DataSource, field: DataField) => {
    addBinding({
      nodeId,
      propKey,
      sourceId: source.id,
      fieldKey: field.key,
      fallbackValue: field.sampleValue ?? '',
    });
    closePicker();
  };

  const handleUnbind = () => {
    removeBinding(nodeId, propKey);
    closePicker();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div
        className="relative w-full max-w-[480px] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: '#0e1810',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,183,127,0.12)' }}>
            <Zap size={16} style={{ color: '#10b77f' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-[14px] font-bold" style={{ color: '#dde4dd' }}>Bind Dynamic Data</h2>
            <p className="text-[11px]" style={{ color: '#9aab9a' }}>
              Prop: <code className="font-mono" style={{ color: '#50dea3' }}>{propKey}</code>
            </p>
          </div>
          <button onClick={closePicker} className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5" style={{ color: '#9aab9a' }}>
            <X size={15} />
          </button>
        </div>

        {/* Current binding strip */}
        {currentBinding && (
          <div className="flex items-center gap-2 px-5 py-2.5 text-[12px]" style={{ background: 'rgba(16,183,127,0.06)', borderBottom: '1px solid rgba(16,183,127,0.15)' }}>
            <Check size={12} style={{ color: '#10b77f' }} />
            <span style={{ color: '#9aab9a' }}>Currently bound to</span>
            <span className="font-semibold" style={{ color: '#50dea3' }}>{currentBinding.sourceId} → {currentBinding.fieldKey}</span>
            <button onClick={handleUnbind} className="ml-auto text-[11px] px-2 py-0.5 rounded transition-colors hover:bg-white/5" style={{ color: '#e07070' }}>
              Remove
            </button>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Source list */}
          <div className="w-[160px] flex-shrink-0 border-r overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {availableSources.length === 0 ? (
              <p className="p-4 text-[11px]" style={{ color: '#9aab9a' }}>No sources available</p>
            ) : (
              availableSources.map((src) => {
                const Icon = SOURCE_ICONS[src.type] ?? Database;
                const isSelected = selectedSource?.id === src.id;
                return (
                  <button
                    key={src.id}
                    onClick={() => { setSelectedSource(src); setSearch(''); }}
                    className="w-full flex items-center gap-2.5 px-3 py-3 text-left transition-colors"
                    style={{
                      background: isSelected ? 'rgba(16,183,127,0.08)' : 'transparent',
                      borderRight: isSelected ? '2px solid #10b77f' : '2px solid transparent',
                    }}
                  >
                    <Icon size={14} style={{ color: isSelected ? '#10b77f' : '#9aab9a', flexShrink: 0 }} />
                    <span className="text-[12px] font-medium leading-tight" style={{ color: isSelected ? '#dde4dd' : '#9aab9a' }}>
                      {src.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Field list */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedSource ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ChevronRight size={20} style={{ color: '#4a5a4a', margin: '0 auto 8px' }} />
                  <p className="text-[12px]" style={{ color: '#4a5a4a' }}>Select a source</p>
                </div>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="px-3 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 rounded-lg px-2.5 h-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Search size={12} style={{ color: '#9aab9a' }} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search fields…"
                      className="flex-1 bg-transparent text-[12px] outline-none"
                      style={{ color: '#dde4dd' }}
                    />
                  </div>
                </div>
                {/* Fields */}
                <div className="flex-1 overflow-y-auto">
                  {filteredFields.map((field) => {
                    const isBound =
                      currentBinding?.sourceId === selectedSource.id &&
                      currentBinding?.fieldKey === field.key;
                    return (
                      <button
                        key={field.key}
                        onClick={() => handleSelectField(selectedSource, field)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                      >
                        {isBound
                          ? <Check size={12} style={{ color: '#10b77f', flexShrink: 0 }} />
                          : <div className="w-3" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium truncate" style={{ color: isBound ? '#50dea3' : '#dde4dd' }}>
                            {field.label}
                          </p>
                          {field.sampleValue && (
                            <p className="text-[10px] truncate mt-0.5" style={{ color: '#4a5a4a' }}>
                              {field.sampleValue}
                            </p>
                          )}
                        </div>
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#9aab9a' }}
                        >
                          {field.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
