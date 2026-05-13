/**
 * Video Embed widget — YouTube / Vimeo URL → responsive iframe.
 */

import { memo } from 'react';
import { Video } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import {
  InspectorInput,
  InspectorToggle,
  InspectorSection,
  getVisualNodeStyles,
} from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

export type AspectRatio = '16/9' | '4/3' | '1/1' | '9/16';

export interface VideoWidgetProps {
  url: string;
  aspectRatio: AspectRatio;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  showControls: boolean;
}

const DEFAULTS: VideoWidgetProps = {
  url:          '',
  aspectRatio:  '16/9',
  autoplay:     false,
  muted:        true,
  loop:         false,
  showControls: true,
};

type VideoInfo = { provider: 'youtube' | 'vimeo'; id: string } | null;

function parseVideoUrl(url: string): VideoInfo {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const id = u.hostname.includes('youtu.be')
        ? u.pathname.slice(1)
        : u.searchParams.get('v') ?? u.pathname.split('/').pop() ?? '';
      return id ? { provider: 'youtube', id } : null;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop() ?? '';
      return id ? { provider: 'vimeo', id } : null;
    }
  } catch { /* invalid URL */ }
  return null;
}

function buildEmbedUrl(info: VideoInfo, props: VideoWidgetProps): string {
  if (!info) return '';

  if (info.provider === 'youtube') {
    const params = new URLSearchParams({
      autoplay: props.autoplay ? '1' : '0',
      mute:     props.muted    ? '1' : '0',
      loop:     props.loop     ? '1' : '0',
      controls: props.showControls ? '1' : '0',
      ...(props.loop ? { playlist: info.id } : {}),
    });
    return `https://www.youtube.com/embed/${info.id}?${params}`;
  }

  if (info.provider === 'vimeo') {
    const params = new URLSearchParams({
      autoplay: props.autoplay ? '1' : '0',
      muted:    props.muted    ? '1' : '0',
      loop:     props.loop     ? '1' : '0',
      controls: props.showControls ? '1' : '0',
      byline:   '0',
      portrait: '0',
    });
    return `https://player.vimeo.com/video/${info.id}?${params}`;
  }

  return '';
}

const RATIO_PADDING: Record<AspectRatio, string> = {
  '16/9': '56.25%',
  '4/3':  '75%',
  '1/1':  '100%',
  '9/16': '177.78%',
};

const VideoWidgetRenderer = memo(function VideoWidgetRenderer({ nodeId }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  if (!node) return null;

  const p    = { ...DEFAULTS, ...(node.props as Partial<VideoWidgetProps>) };
  const info = parseVideoUrl(p.url);
  const src  = buildEmbedUrl(info, p);
  const visualOverrides = getVisualNodeStyles(node.styles?.base as Record<string, string>);

  return (
    <div className="w-full" style={{ padding: '8px', ...visualOverrides }}>
      <div
        style={{
          position:    'relative',
          width:       '100%',
          paddingTop:  RATIO_PADDING[p.aspectRatio],
          borderRadius:'8px',
          overflow:    'hidden',
          background:  '#000',
          boxShadow:   '0 2px 16px rgba(0,0,0,0.25)',
        }}
      >
        {src ? (
          <iframe
            src={src}
            style={{ position: 'absolute', inset: '0', width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Embedded video"
          />
        ) : (
          <div
            style={{
              position: 'absolute', inset: '0',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '12px',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <Video size={36} style={{ color: '#bbcabf', opacity: 0.4 }} strokeWidth={1.5} />
            <p style={{ fontSize: '12px', color: '#bbcabf', opacity: 0.6 }}>
              Paste a YouTube or Vimeo URL in the inspector
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

function VideoWidgetInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;
  const p   = { ...DEFAULTS, ...(node.props as Partial<VideoWidgetProps>) };
  const set = (k: keyof VideoWidgetProps) => (v: string) => update(nodeId, { [k]: v });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Source" />
      <InspectorInput
        label="Video URL"
        value={p.url}
        onChange={set('url')}
        placeholder="https://youtube.com/watch?v=…"
        hint="Supports YouTube and Vimeo URLs"
      />
      <InspectorSection label="Playback" />
      <InspectorToggle
        label="Aspect Ratio"
        value={p.aspectRatio}
        options={[
          { value: '16/9', label: '16:9' },
          { value: '4/3',  label: '4:3'  },
          { value: '1/1',  label: '1:1'  },
          { value: '9/16', label: '9:16' },
        ]}
        onChange={set('aspectRatio')}
      />
      <InspectorToggle
        label="Autoplay"
        value={p.autoplay ? 'yes' : 'no'}
        options={[{ value: 'no', label: 'Off' }, { value: 'yes', label: 'On' }]}
        onChange={(v) => update(nodeId, { autoplay: v === 'yes' })}
      />
      <InspectorToggle
        label="Muted"
        value={p.muted ? 'yes' : 'no'}
        options={[{ value: 'no', label: 'Off' }, { value: 'yes', label: 'On' }]}
        onChange={(v) => update(nodeId, { muted: v === 'yes' })}
      />
      <InspectorToggle
        label="Loop"
        value={p.loop ? 'yes' : 'no'}
        options={[{ value: 'no', label: 'Off' }, { value: 'yes', label: 'On' }]}
        onChange={(v) => update(nodeId, { loop: v === 'yes' })}
      />
      <InspectorToggle
        label="Controls"
        value={p.showControls ? 'yes' : 'no'}
        options={[{ value: 'no', label: 'Off' }, { value: 'yes', label: 'On' }]}
        onChange={(v) => update(nodeId, { showControls: v === 'yes' })}
      />
    </div>
  );
}

export const VideoWidget: WidgetDefinition = {
  type:         'video',
  label:        'Video',
  icon:         Video,
  category:     'media',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['video', 'youtube', 'vimeo', 'embed', 'media', 'player'],
  Renderer:     VideoWidgetRenderer,
  Inspector:    VideoWidgetInspector,
};
