/**
 * PerformancePanel — Phase 7.4 Auto-Performance Advisor.
 *
 * Shows the latest audit result for the current page, allows
 * re-running the audit, and displays the full findings list
 * with severity indicators and fix recommendations.
 * Results are DB-persisted via the /ai/audit/{id} endpoint.
 *
 * Minimalist redesign: left-stripe finding cards, ghost buttons,
 * flat score display, clean typography.
 */

import { useEffect, useState } from 'react';
import {
  Gauge, ChevronLeft, RefreshCw, Loader2, CheckCircle2,
  AlertTriangle, AlertCircle, Info, TrendingUp, FileCode,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAdapter } from '@/contexts/AdapterContext';
import { useAiStore, useCanvasStore } from '@nexus/core';
import type { AuditFinding } from '@nexus/core';

// ─── Ghost button helper ───────────────────────────────────────────────────────
const ghostStyle = {
  border:     '1px solid rgba(255,255,255,0.10)',
  color:      '#bbcabf',
  background: 'transparent',
} as const;

// ─── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r    = 28;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="68" height="68" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text data-testid="perf-score" x="36" y="40" textAnchor="middle"
          fontSize="16" fontWeight="800" fill={color}>
          {score}
        </text>
      </svg>
      <span className="text-[9px] mt-0.5" style={{ color: '#bbcabf' }}>
        {score >= 80 ? 'Good' : score >= 60 ? 'Needs work' : 'Poor'}
      </span>
    </div>
  );
}

// ─── Finding Card — left stripe, no colored background ───────────────────────
function FindingCard({ finding }: { finding: AuditFinding }) {
  const [expanded, setExpanded] = useState(false);

  const stripeColor = {
    high:   '#ef4444',
    medium: '#f59e0b',
    low:    '#6b7280',
  }[finding.severity];

  const textColor = {
    high:   '#f87171',
    medium: '#fbbf24',
    low:    '#9ca3af',
  }[finding.severity];

  const catIcon = {
    performance:      <Gauge      size={11} />,
    seo:              <TrendingUp size={11} />,
    accessibility:    <Info       size={11} />,
    'best-practices': <FileCode   size={11} />,
  }[finding.category] ?? <AlertCircle size={11} />;

  return (
    <div
      data-testid="perf-finding"
      className="cursor-pointer transition-all duration-150"
      style={{ borderLeft: `2px solid ${stripeColor}`, paddingLeft: '10px' }}
      onClick={() => setExpanded((p) => !p)}
    >
      <div className="flex items-start gap-2 py-2">
        <span style={{ color: stripeColor }} className="mt-0.5 shrink-0">
          {finding.severity === 'high' ? <AlertTriangle size={12} /> : catIcon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs leading-snug" style={{ color: '#dde4dd' }}>
              {finding.title}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px]" style={{ color: textColor }}>{finding.impact}</span>
              {expanded
                ? <ChevronUp size={10} style={{ color: '#bbcabf' }} />
                : <ChevronDown size={10} style={{ color: '#bbcabf' }} />}
            </div>
          </div>
          {expanded && (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-[11px] leading-relaxed" style={{ color: '#bbcabf' }}>
                {finding.description}
              </p>
              <div className="border-l pl-3" style={{ borderColor: '#10b77f' }}>
                <p className="text-[10px] font-medium mb-0.5" style={{ color: '#34D399' }}>
                  Recommended fix
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: '#bbcabf' }}>
                  {finding.recommendation}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── History Sparkline ────────────────────────────────────────────────────────
function ScoreHistory({ history }: { history: { score: number; created_at: string }[] }) {
  if (history.length < 2) return null;
  const scores = history.slice(0, 7).reverse();
  const max    = Math.max(...scores.map((h) => h.score));
  const min    = Math.min(...scores.map((h) => h.score));
  const range  = Math.max(max - min, 10);
  const w = 160; const h = 32; const pad = 4;
  const pts = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (w - pad * 2);
    const y = h - pad - ((s.score - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="px-4 pb-2">
      <p className="text-[9px] font-medium mb-1.5" style={{ color: '#bbcabf' }}>
        Score history
      </p>
      <svg width={w} height={h} className="overflow-visible">
        <polyline points={pts} fill="none" stroke="#10b77f"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {scores.map((s, i) => {
          const parts = pts.split(' ')[i]!.split(',').map(Number);
          return <circle key={i} cx={parts[0]} cy={parts[1]} r="3" fill="#10b77f" />;
        })}
      </svg>
    </div>
  );
}

// ─── PerformancePanel ─────────────────────────────────────────────────────────
export function PerformancePanel({ onBack }: { onBack?: () => void } = {}) {
  const adapter    = useAdapter();
  const page       = useCanvasStore((s) => s.page);
  const audit      = useAiStore((s) => s.currentAudit);
  const history    = useAiStore((s) => s.auditHistory);
  const setAudit   = useAiStore((s) => s.setAudit);
  const setHistory = useAiStore((s) => s.setAuditHistory);
  const isAuditing = useAiStore((s) => !!s.loading.audit);
  const setLoading = useAiStore((s) => s.setLoading);

  const [error,  setError]  = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!adapter.ai || !page || loaded) return;
    setLoaded(true);
    adapter.ai.getAudit(page.id)
      .then((result) => {
        if (result.latest) setAudit(result.latest);
        setHistory(result.history);
      })
      .catch(() => {});
  }, [adapter.ai, page?.id, loaded]);

  const runAudit = async () => {
    if (!adapter.ai || !page || isAuditing) return;
    setLoading('audit', true);
    setError('');
    try {
      const result = await adapter.ai.auditPage(page.id);
      setAudit(result);
      const fresh = await adapter.ai.getAudit(page.id);
      setHistory(fresh.history);
    } catch (err: any) {
      setError(err?.message ?? 'Audit failed. Please try again.');
    } finally {
      setLoading('audit', false);
    }
  };

  const highCount = (audit?.findings ?? []).filter((f) => f.severity === 'high').length;
  const medCount  = (audit?.findings ?? []).filter((f) => f.severity === 'medium').length;
  const lowCount  = (audit?.findings ?? []).filter((f) => f.severity === 'low').length;

  return (
    <div data-testid="perf-panel" className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              data-testid="perf-back-btn"
              className="p-0.5 rounded transition-colors duration-150 -ml-0.5"
              style={{ color: '#bbcabf' }}
              title="Back to AI panel"
              onMouseEnter={(e) => (e.currentTarget.style.color = '#dde4dd')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#bbcabf')}
            >
              <ChevronLeft size={14} />
            </button>
          )}
          <Gauge size={12} style={{ color: '#34D399' }} />
          <span className="text-xs font-medium" style={{ color: '#dde4dd' }}>
            Performance Advisor
          </span>
        </div>

        {/* Ghost run audit button */}
        <button
          data-testid="perf-run-btn"
          onClick={runAudit}
          disabled={isAuditing || !page}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] disabled:opacity-40 transition-all duration-150"
          style={ghostStyle}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.color      = '#dde4dd';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color      = '#bbcabf';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
          }}
          title="Run audit"
        >
          {isAuditing
            ? <Loader2 size={11} className="animate-spin" />
            : <RefreshCw size={11} />}
          {isAuditing ? 'Analyzing…' : 'Run Audit'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <p className="flex items-start gap-1.5 mx-4 mt-3 text-[11px]" style={{ color: '#f87171' }}>
            <AlertTriangle size={11} className="mt-0.5 shrink-0" />{error}
          </p>
        )}

        {!audit && !isAuditing && !error && (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <Gauge size={28} style={{ color: '#bbcabf', opacity: 0.3 }} />
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: '#dde4dd' }}>
                No audit yet
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: '#bbcabf' }}>
                Run an audit to get AI-powered performance, SEO, and accessibility findings
                with actionable fix recommendations.
              </p>
            </div>
          </div>
        )}

        {isAuditing && !audit && (
          <div className="flex flex-col items-center justify-center gap-2 h-32">
            <Loader2 size={18} className="animate-spin" style={{ color: '#34D399' }} />
            <p className="text-[11px]" style={{ color: '#bbcabf' }}>Analyzing page…</p>
          </div>
        )}

        {audit && (
          <>
            {/* Score summary — no inset box, just inline layout */}
            <div className="flex items-center gap-5 px-4 py-4 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
              <ScoreRing score={audit.score} />
              <div className="flex-1">
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                  {[
                    { label: 'High',   count: highCount, color: '#ef4444' },
                    { label: 'Medium', count: medCount,  color: '#f59e0b' },
                    { label: 'Low',    count: lowCount,  color: '#6b7280' },
                  ].map(({ label, count, color }) => (
                    <div key={label}>
                      <p className="text-lg font-black tabular-nums" style={{ color }}>{count}</p>
                      <p className="text-[9px]" style={{ color: '#bbcabf' }}>{label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 text-[9px]" style={{ color: '#bbcabf' }}>
                  <span>HTML {(audit.htmlSize / 1024).toFixed(1)} KB</span>
                  <span>CSS {(audit.cssSize / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            </div>

            {/* Score history sparkline */}
            {history.length >= 2 && (
              <div className="pt-3">
                <ScoreHistory history={history} />
              </div>
            )}

            {/* Findings list */}
            {audit.findings.length > 0 ? (
              <div className="px-4 py-3 flex flex-col gap-0">
                <p className="text-[10px] font-medium mb-3" style={{ color: '#bbcabf' }}>
                  {audit.findings.length} finding{audit.findings.length !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
                  {(['high', 'medium', 'low'] as const).map((sev) =>
                    audit.findings
                      .filter((f) => f.severity === sev)
                      .map((f) => <FindingCard key={f.id} finding={f} />),
                  )}
                </div>
              </div>
            ) : (
              <div className="px-4 py-3">
                <p className="flex items-center gap-1.5 text-[11px]" style={{ color: '#10b981' }}>
                  <CheckCircle2 size={13} />No issues found — excellent work!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
