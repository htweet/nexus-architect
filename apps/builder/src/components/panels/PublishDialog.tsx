/**
 * PublishDialog — Phase 6 edition.
 *
 * Phase 6.3 additions:
 *   • Shows compiled HTML size in KB (from staticHtml field in PublishResult).
 *   • "View Source" button copies the compiled HTML to clipboard.
 *   • Performance pill shows estimated Lighthouse score range based on size.
 *
 * Preserved from Phase 5.3:
 *   • URL pill, Copy Link, Open Page button.
 */

import { useState } from 'react';
import { Globe, Copy, ExternalLink, CheckCircle2, X, FileCode2, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { PublishResult } from '@nexus/core';

interface PublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result: PublishResult | null;
}

/** Estimate Lighthouse performance score tier from compiled HTML size */
function scoreTier(html: string): { label: string; color: string } {
  const kb = new TextEncoder().encode(html).byteLength / 1024;
  if (kb < 15)  return { label: '95+', color: '#22c55e' };
  if (kb < 40)  return { label: '85+', color: '#84cc16' };
  if (kb < 100) return { label: '70+', color: '#f59e0b' };
  return              { label: '60+', color: '#ef4444' };
}

export function PublishDialog({ isOpen, onClose, result }: PublishDialogProps) {
  const [copied,       setCopied]       = useState(false);
  const [copiedSource, setCopiedSource] = useState(false);

  if (!isOpen || !result) return null;

  const sizeKb    = result.staticHtml
    ? (new TextEncoder().encode(result.staticHtml).byteLength / 1024).toFixed(1)
    : null;
  const score     = result.staticHtml ? scoreTier(result.staticHtml) : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard blocked */ }
  };

  const handleCopySource = async () => {
    if (!result.staticHtml) return;
    try {
      await navigator.clipboard.writeText(result.staticHtml);
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2200);
    } catch { /* clipboard blocked */ }
  };

  const handleOpenTab = () => {
    window.open(result.pageUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        data-testid="publish-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Page published"
        className="relative flex flex-col rounded-xl overflow-hidden shadow-2xl"
        style={{
          width:      '440px',
          maxWidth:   '90vw',
          background: '#0e1511',
          border:     '1px solid rgba(255,255,255,0.10)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-3.5 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.10)', background: '#09100c' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(16,183,127,0.12)' }}
            >
              <CheckCircle2 size={16} style={{ color: '#10b77f' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: '#dde4dd' }}>
                Page Published!
              </h2>
              <p className="text-[10px]" style={{ color: '#bbcabf' }}>
                {new Date(result.publishedAt).toLocaleString([], {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md transition-colors duration-[140ms]"
            style={{ color: '#bbcabf' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            aria-label="Close"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Compile stats (Phase 6.3) ──────────────────────────────────── */}
        {sizeKb && score && (
          <div
            className="flex items-center gap-3 px-4 py-2.5 border-b"
            style={{
              borderColor: 'rgba(255,255,255,0.10)',
              background:  '#09100c',
            }}
          >
            <div className="flex items-center gap-1.5">
              <FileCode2 size={11} style={{ color: '#bbcabf' }} />
              <span className="text-[11px]" style={{ color: '#bbcabf' }}>
                Static HTML compiled —
              </span>
              <span
                className="text-[11px] font-bold"
                style={{ color: '#10b77f' }}
              >
                {sizeKb} KB
              </span>
            </div>
            <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
            <div className="flex items-center gap-1.5">
              <Zap size={11} style={{ color: score.color }} />
              <span className="text-[11px]" style={{ color: '#bbcabf' }}>
                Est. Lighthouse
              </span>
              <span
                className="text-[11px] font-black"
                style={{ color: score.color }}
              >
                {score.label}
              </span>
            </div>
          </div>
        )}

        {/* ── URL + actions ───────────────────────────────────────────────── */}
        <div className="px-4 py-4 flex flex-col gap-3">
          {/* URL pill */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
            style={{
              background:  '#09100c',
              borderColor: 'rgba(255,255,255,0.10)',
            }}
          >
            <Globe size={12} style={{ color: '#10b77f' }} className="shrink-0" />
            <span
              className="flex-1 text-[11px] font-mono truncate"
              style={{ color: '#bbcabf' }}
            >
              {result.pageUrl}
            </span>
          </div>

          {/* Primary action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              data-testid="copy-link-btn"
              onClick={handleCopy}
              className={cn(
                'flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border',
                'text-[11px] font-bold uppercase tracking-wider transition-all duration-[180ms]',
              )}
              style={{
                borderColor: copied ? 'rgba(16,183,127,0.30)'  : 'rgba(255,255,255,0.10)',
                color:       copied ? '#10b77f'  : '#bbcabf',
                background:  copied ? 'rgba(16,183,127,0.08)'  : '#09100c',
              }}
            >
              <Copy size={11} strokeWidth={2.5} />
              {copied ? 'Copied!' : 'Copy Link'}
            </button>

            <button
              data-testid="open-page-btn"
              onClick={handleOpenTab}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-[180ms]"
              style={{ background: '#10b77f', color: 'white' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <ExternalLink size={11} strokeWidth={2.5} />
              Open Page
            </button>
          </div>

          {/* Secondary: View compiled HTML source */}
          {result.staticHtml && (
            <button
              data-testid="copy-source-btn"
              onClick={handleCopySource}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-[180ms]"
              style={{
                background:  copiedSource ? 'rgba(16,183,127,0.08)' : 'rgba(255,255,255,0.04)',
                border:      '1px solid rgba(255,255,255,0.10)',
                color:       copiedSource ? '#10b77f' : '#bbcabf',
              }}
            >
              <FileCode2 size={10} strokeWidth={2.5} />
              {copiedSource ? 'HTML Copied!' : 'Copy Compiled HTML'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
