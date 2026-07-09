/**
 * HelpPanel.tsx — Phase 12.2
 * Slide-in contextual help drawer with quick-start guides, video links,
 * and a feedback / bug report form.
 * Mounted inside Builder.tsx; controlled via a single `open` prop.
 */

import { useState } from 'react';
import {
  X, BookOpen, Play, MessageSquare, ExternalLink,
  ChevronRight, HelpCircle, Zap, Layout, Type, Image,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Guide {
  icon: React.ReactNode;
  title: string;
  description: string;
  minutes: number;
}

const QUICK_GUIDES: Guide[] = [
  {
    icon: <Layout size={16} />,
    title: 'Building your first layout',
    description: 'Drag a Section, add Columns, and populate with widgets.',
    minutes: 3,
  },
  {
    icon: <Type size={16} />,
    title: 'Typography & colours',
    description: 'Set global design tokens and override per-element.',
    minutes: 2,
  },
  {
    icon: <Image size={16} />,
    title: 'Working with images',
    description: 'Upload, position, and apply object-fit to Image widgets.',
    minutes: 2,
  },
  {
    icon: <Zap size={16} />,
    title: 'Responsive breakpoints',
    description: 'Preview and tweak styles for Desktop, Tablet, and Mobile.',
    minutes: 4,
  },
];

interface VideoItem {
  title: string;
  duration: string;
  url: string;
}

const VIDEOS: VideoItem[] = [
  { title: 'Getting started in 5 minutes',   duration: '5:12', url: '#' },
  { title: 'Advanced layout techniques',      duration: '8:45', url: '#' },
  { title: 'Using the AI content generator', duration: '4:30', url: '#' },
  { title: 'Publishing & WordPress deploy',  duration: '6:20', url: '#' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

type Tab = 'guides' | 'videos' | 'feedback';

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 text-[12px] font-medium transition-colors duration-150"
      style={{
        color:        active ? '#10b77f' : '#6a7f6e',
        borderBottom: active ? '2px solid #10b77f' : '2px solid transparent',
        background:   'transparent',
      }}
    >
      {children}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HelpPanel({ open, onClose }: HelpPanelProps) {
  const [tab, setTab] = useState<Tab>('guides');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState<'question' | 'bug' | 'idea'>('question');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    // In production this would call wp-json/nexus/v1/feedback or SaaS endpoint
    console.info('[Nexus] Feedback submitted:', { type: feedbackType, text: feedbackText });
    setSubmitted(true);
    setFeedbackText('');
    setTimeout(() => setSubmitted(false), 3500);
  }

  return (
    /* Slide-in panel from the right — sits on top of right panel */
    <div
      className="fixed inset-y-0 right-0 z-[8000] flex flex-col w-72 overflow-hidden"
      style={{
        background:  '#0e1511',
        borderLeft:  '1px solid rgba(255,255,255,0.10)',
        boxShadow:   '-8px 0 32px rgba(0,0,0,0.40)',
        transform:   open ? 'translateX(0)' : 'translateX(100%)',
        transition:  'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <HelpCircle size={15} style={{ color: '#10b77f' }} />
          <span className="text-[13px] font-semibold" style={{ color: '#dde4dd' }}>
            Help & Resources
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded transition-colors duration-150"
          style={{ color: '#6a7f6e' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          aria-label="Close help panel"
        >
          <X size={13} />
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <TabButton active={tab === 'guides'}   onClick={() => setTab('guides')}>
          <span className="flex items-center justify-center gap-1.5">
            <BookOpen size={12} /> Guides
          </span>
        </TabButton>
        <TabButton active={tab === 'videos'}   onClick={() => setTab('videos')}>
          <span className="flex items-center justify-center gap-1.5">
            <Play size={12} /> Videos
          </span>
        </TabButton>
        <TabButton active={tab === 'feedback'} onClick={() => setTab('feedback')}>
          <span className="flex items-center justify-center gap-1.5">
            <MessageSquare size={12} /> Feedback
          </span>
        </TabButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

        {/* ── Guides tab ──────────────────────────────────────────────── */}
        {tab === 'guides' && (
          <div className="flex flex-col gap-1 p-3">
            {QUICK_GUIDES.map((g) => (
              <div
                key={g.title}
                className="group flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors duration-150"
                style={{ background: 'rgba(255,255,255,0)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0)')}
              >
                <div
                  className="mt-0.5 shrink-0 flex h-7 w-7 items-center justify-center rounded-md"
                  style={{ background: 'rgba(16,183,127,0.12)', color: '#10b77f' }}
                >
                  {g.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium leading-tight" style={{ color: '#dde4dd' }}>
                    {g.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug" style={{ color: '#6a7f6e' }}>
                    {g.description}
                  </p>
                  <p className="mt-1 text-[10px]" style={{ color: '#4a5d4e' }}>
                    ~{g.minutes} min read
                  </p>
                </div>
                <ChevronRight size={12} className="shrink-0 mt-1" style={{ color: '#4a5d4e' }} />
              </div>
            ))}

            {/* Docs link */}
            <a
              href="https://docs.nexusarchitect.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mt-2 py-2.5 rounded-lg text-[12px] font-medium transition-colors duration-150"
              style={{
                background:   'rgba(16,183,127,0.08)',
                color:        '#10b77f',
                border:       '1px solid rgba(16,183,127,0.18)',
                textDecoration: 'none',
              }}
            >
              <BookOpen size={13} /> Full Documentation
              <ExternalLink size={11} />
            </a>
          </div>
        )}

        {/* ── Videos tab ──────────────────────────────────────────────── */}
        {tab === 'videos' && (
          <div className="flex flex-col gap-1 p-3">
            {VIDEOS.map((v) => (
              <a
                key={v.title}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg p-3 transition-colors duration-150"
                style={{ textDecoration: 'none', background: 'rgba(255,255,255,0)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0)')}
              >
                {/* Thumbnail placeholder */}
                <div
                  className="shrink-0 flex h-10 w-16 items-center justify-center rounded-md"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Play size={16} style={{ color: '#10b77f' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium leading-tight" style={{ color: '#dde4dd' }}>
                    {v.title}
                  </p>
                  <p className="mt-0.5 text-[11px]" style={{ color: '#6a7f6e' }}>
                    {v.duration}
                  </p>
                </div>
                <ExternalLink size={11} style={{ color: '#4a5d4e', flexShrink: 0 }} />
              </a>
            ))}
          </div>
        )}

        {/* ── Feedback tab ────────────────────────────────────────────── */}
        {tab === 'feedback' && (
          <div className="p-4">
            {submitted ? (
              <div
                className="flex flex-col items-center gap-3 py-10 text-center"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: 'rgba(16,183,127,0.15)', color: '#10b77f' }}
                >
                  <MessageSquare size={22} />
                </div>
                <p className="text-[13px] font-semibold" style={{ color: '#dde4dd' }}>
                  Thanks for the feedback!
                </p>
                <p className="text-[11px]" style={{ color: '#6a7f6e' }}>
                  We review every submission and use it to make Nexus better.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <p className="text-[12px]" style={{ color: '#a8bfac' }}>
                  Report a bug, share an idea, or ask a question — we read everything.
                </p>

                {/* Type selector */}
                <div className="flex gap-1.5">
                  {(['question', 'bug', 'idea'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFeedbackType(t)}
                      className="flex-1 py-1.5 rounded-md text-[11px] font-medium capitalize transition-colors duration-150"
                      style={{
                        background:   feedbackType === t ? 'rgba(16,183,127,0.15)' : 'rgba(255,255,255,0.05)',
                        color:        feedbackType === t ? '#10b77f' : '#6a7f6e',
                        border:       feedbackType === t ? '1px solid rgba(16,183,127,0.35)' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Text area */}
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={
                    feedbackType === 'bug'
                      ? 'Describe what happened and how to reproduce it…'
                      : feedbackType === 'idea'
                      ? 'What would you like to see in Nexus Architect?'
                      : 'What can we help you with?'
                  }
                  rows={5}
                  className="w-full resize-none rounded-lg p-3 text-[12px] outline-none"
                  style={{
                    background:   'rgba(255,255,255,0.04)',
                    border:       '1px solid rgba(255,255,255,0.10)',
                    color:        '#dde4dd',
                    lineHeight:   1.6,
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(16,183,127,0.50)')}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                />

                <button
                  type="submit"
                  disabled={!feedbackText.trim()}
                  className="py-2.5 rounded-lg text-[12px] font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: '#10b77f',
                    color:      '#0e1511',
                  }}
                >
                  Send Feedback
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="shrink-0 px-4 py-3 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="text-[10px]" style={{ color: '#4a5d4e' }}>
          Nexus Architect v1.0
        </span>
        <a
          href="https://nexusarchitect.io/changelog"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] transition-colors duration-150"
          style={{ color: '#4a5d4e', textDecoration: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#10b77f')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#4a5d4e')}
        >
          Changelog
        </a>
      </div>
    </div>
  );
}
