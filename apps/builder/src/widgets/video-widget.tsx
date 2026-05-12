/**
 * Video Embed widget — YouTube / Vimeo URL → responsive iframe.
 *
 * URL parsing extracts the video ID server-side (in the component) so the
 * canvas always shows a live preview of the embed, not just a placeholder.
 *
 * Aspect ratios use the padding-top trick so the iframe scales naturally
 * inside any container width.
 */

import { memo } from 'react';
import { Video } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import {
  InspectorInput,
  InspectorToggle,
  InspectorSection,
} from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── URL helpers ──────────────────────────────────────────────────────────────

type VideoInfo = { provider: 'youtube' | 'vimeo'; id: string } | null;

function parseVideoUrl(url: string): VideoInfo {
  if (!url) return null;
  try {
    // YouTube: youtube.com/watch?v=ID  |  youtu.be/ID  |  youtube.com/embed/ID
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) return { provider: 'youtube', id: ytMatch[1]! };

    // Vimeo: vimeo.com/ID  |  player.vimeo.com/video/ID
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) return { provider: 'vimeo', id: vimeoMatch[1]! };
  } catch { /* ignore */ }
  return null;
}

function buildEmbedUrl(info: VideoInfo, props: VideoWidgetProps): string {
  if (!info) return '';

  if (info.provider === 'youtube') {
    const params = new URLSearchParams({
      autoplay:    props.autoplay ? '1' : '0',
      mute:        props.muted    ? '1' : '0',
      loop:        props.loop     ? '1' : '0',
      controls:    props.showControls ? '1' : '0',
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

// ─── Renderer ─────────────────────────────────────────────────────────────────

const VideoWidgetRenderer = memo(function VideoWidgetRenderer({ nodeId }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  if (!node) return null;

  const p   = { ...DEFAULTS, ...(node.props as Partial<VideoWidgetProps>) };
  const info = parseVideoUrl(p.url);
  const src  = buildEmbedUrl(info, p);

  return (
    <div className="w-full" style={{ padding: '8px' }}>
      <div
        style={{
          position:       'relative',
          width:          '100%',
          paddingTop:     RATIO_PADDING[p.aspectRatio],
          borderRadius:   '8px',
          overflow:       'hidden',
          background:     '#000',
          boxShadow:      '0 2px 16px rgba(0,0,0,0.25)',
        }}
      >
        {src ? (
          <iframe
            src={src}
            style={{
              position: 'absolute',
              inset:    '0',
              width:    '100%',
              height:   '100%',
              border:   'none',
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Embedded video"
          />
        ) : (
          /* Placeholder shown when no valid URL is set */
          <div
            style={{
              position:       'absolute',
              inset:          '0',
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '12px',
              background:     'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              color:          'rgba(255,255,255,0.5)',
            }}
          >
            <Video size={40} strokeWidth={1.5} />
            <span style={{ fontSize: '13px', fontWeight: '500' }}>
              Paste a YouTube or Vimeo URL
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Inspector ────────────────────────────────────────────────────────────────

function VideoWidgetInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;

  const p   = { ...DEFAULTS, ...(node.props as Partial<VideoWidgetProps>) };
  const set = (k: keyof VideoWidgetProps) => (v: string | boolean) =>
    update(nodeId, { [k]: v });

  const info = parseVideoUrl(p.url);

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Source" />
      <InspectorInput
        label="Video URL"
        value={p.url}
        onChange={set('url') as (v: string) => void}
        placeholder="https://youtube.com/watch?v=… or vimeo.com/…"
        hint={info ? `✓ ${info.provider === 'youtube' ? 'YouTube' : 'Vimeo'} — ID: ${info.id}` : 'Supports YouTube and Vimeo'}
      />

      <InspectorSection label="Dimensions" />
      <InspectorToggle
        label="Aspect Ratio"
        value={p.aspectRatio}
        options={[
          { value: '16/9', label: '16:9' },
          { value: '4/3',  label: '4:3'  },
          { value: '1/1',  label: '1:1'  },
          { value: '9/16', label: '9:16' },
        ]}
        onChange={set('aspectRatio') as (v: string) => void}
      />

      <InspectorSection label="Playback" />
      <InspectorToggle
        label="Controls"
        value={p.showControls ? 'on' : 'off'}
        options={[{ value: 'on', label: 'Show' }, { value: 'off', label: 'Hide' }]}
        onChange={(v) => update(nodeId, { showControls: v === 'on' })}
      />
      <InspectorToggle
        label="Autoplay"
        value={p.autoplay ? 'on' : 'off'}
        options={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }]}
        onChange={(v) => update(nodeId, { autoplay: v === 'on' })}
      />
      <InspectorToggle
        label="Muted"
        value={p.muted ? 'on' : 'off'}
        options={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }]}
        onChange={(v) => update(nodeId, { muted: v === 'on' })}
      />
      <InspectorToggle
        label="Loop"
        value={p.loop ? 'on' : 'off'}
        options={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }]}
        onChange={(v) => update(nodeId, { loop: v === 'on' })}
      />
    </div>
  );
}

// ─── Registration export ──────────────────────────────────────────────────────

export const VideoWidget: WidgetDefinition = {
  type:         'video',
  label:        'Video',
  icon:         Video,
  category:     'media',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['video', 'youtube', 'vimeo', 'embed', 'media', 'iframe'],
  Renderer:     VideoWidgetRenderer,
  Inspector:    VideoWidgetInspector,
};
