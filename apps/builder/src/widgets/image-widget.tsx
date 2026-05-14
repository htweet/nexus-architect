/**
 * Image widget — local file upload (FileReader → base64 dataURL) + caption/overlay.
 */

import { memo, useRef } from 'react';
import { ImageIcon, Upload, X } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { InspectorSelect, InspectorSection, InspectorInput, getVisualNodeStyles } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

export interface ImageWidgetProps {
  src:          string;
  alt:          string;
  caption:      string;
  objectFit:    'cover' | 'contain' | 'fill' | 'none';
  borderRadius: string;
  maxWidth:     string;
  aspectRatio:  string;
}

const DEFAULTS: ImageWidgetProps = {
  src:          '',
  alt:          '',
  caption:      '',
  objectFit:    'cover',
  borderRadius: '0px',
  maxWidth:     '100%',
  aspectRatio:  '',
};

const ImageWidgetRenderer = memo(function ImageWidgetRenderer({ nodeId }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  if (!node) return null;

  const p = { ...DEFAULTS, ...(node.props as Partial<ImageWidgetProps>) };
  const visualOverrides = getVisualNodeStyles(node.styles?.base as Record<string, string>);

  if (!p.src) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 w-full bg-[rgba(255,255,255,0.03)] border-2 border-dashed border-[rgba(255,255,255,0.12)]"
        style={{ borderRadius: p.borderRadius, minHeight: '160px', maxWidth: p.maxWidth, ...visualOverrides }}
      >
        <ImageIcon size={36} className="text-[#bbcabf] opacity-40" strokeWidth={1.5} />
        <p className="text-xs text-[#bbcabf] opacity-60 font-medium">Upload an image in the inspector</p>
      </div>
    );
  }

  return (
    <figure className="w-full" style={{ maxWidth: p.maxWidth, ...visualOverrides }}>
      <img
        src={p.src}
        alt={p.alt}
        className="w-full block"
        style={{
          objectFit:    p.objectFit,
          borderRadius: p.borderRadius,
          aspectRatio:  p.aspectRatio || undefined,
        }}
      />
      {p.caption && (
        <figcaption className="mt-2 text-xs text-center text-[#bbcabf]">
          {p.caption}
        </figcaption>
      )}
    </figure>
  );
});

function ImageWidgetInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!node) return null;

  const p   = { ...DEFAULTS, ...(node.props as Partial<ImageWidgetProps>) };
  const set = (k: keyof ImageWidgetProps) => (v: string) => update(nodeId, { [k]: v });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        update(nodeId, { src: result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="px-3 pb-3 flex flex-col gap-3">
      <InspectorSection label="Source" />
      <div className="flex flex-col gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-2 h-10 rounded-md border border-dashed border-[rgba(16,183,127,0.40)] text-[13px] font-semibold transition-all duration-[140ms] hover:border-[#10b77f] hover:bg-[rgba(16,183,127,0.06)]"
          style={{ color: '#50dea3', background: 'rgba(16,183,127,0.04)' }}
        >
          <Upload size={14} strokeWidth={2} />
          {p.src ? 'Replace image…' : 'Upload image…'}
        </button>
        {p.src && (
          <div className="relative rounded-md overflow-hidden border border-[rgba(255,255,255,0.10)]" style={{ background: '#09100c' }}>
            <img
              src={p.src}
              alt={p.alt || 'preview'}
              className="w-full block object-cover"
              style={{ maxHeight: '120px', objectFit: 'cover' }}
            />
            <button
              onClick={() => update(nodeId, { src: '' })}
              title="Remove image"
              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(0,0,0,0.65)', color: '#dde4dd' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(220,50,50,0.80)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.65)')}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
      <InspectorInput label="Alt Text" value={p.alt}     onChange={set('alt')}     placeholder="Describe the image" />
      <InspectorInput label="Caption"  value={p.caption} onChange={set('caption')} placeholder="Optional caption…" />
      <InspectorSection label="Appearance" />
      <InspectorSelect
        label="Object Fit"
        value={p.objectFit}
        options={[
          { value: 'cover',   label: 'Cover'   },
          { value: 'contain', label: 'Contain' },
          { value: 'fill',    label: 'Fill'    },
          { value: 'none',    label: 'None'    },
        ]}
        onChange={set('objectFit')}
      />
      <InspectorInput label="Aspect Ratio" value={p.aspectRatio} onChange={set('aspectRatio')} placeholder="16/9" hint="e.g. 16/9, 4/3, 1/1" />
    </div>
  );
}

export const ImageWidget: WidgetDefinition = {
  type:         'image',
  label:        'Image',
  icon:         ImageIcon,
  category:     'media',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['img', 'photo', 'picture', 'media', 'figure'],
  Renderer:     ImageWidgetRenderer,
  Inspector:    ImageWidgetInspector,
};
