/**
 * WelcomeWizard.tsx — Phase 12.1
 * First-run onboarding modal: 3-step guided tour.
 * Persistence: localStorage key "nexus_onboarding_v1" = "done"
 */

import { useState, useEffect } from 'react';
import { X, MousePointer2, Palette, Zap, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

const LS_KEY = 'nexus_onboarding_v1';

interface Step {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  body: React.ReactNode;
  color: string;
}

const STEPS: Step[] = [
  {
    icon: <Sparkles size={28} />,
    color: '#10b77f',
    title: 'Welcome to Nexus Architect',
    subtitle: 'The page builder that thinks at your speed.',
    body: (
      <div className="flex flex-col gap-3 text-sm" style={{ color: '#a8bfac' }}>
        <p>
          Nexus Architect is a <strong style={{ color: '#dde4dd' }}>visual, drag-and-drop</strong> page
          builder. You're about to build beautiful pages without writing a single line of CSS.
        </p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[
            { label: 'Drag widgets',  desc: 'From the left panel onto the canvas' },
            { label: 'Style visually', desc: 'Colors, fonts, spacing — all instant' },
            { label: 'Publish live',  desc: 'One click to go live' },
          ].map((f) => (
            <div key={f.label} className="rounded-lg p-3 flex flex-col gap-1"
              style={{ background: 'rgba(16,183,127,0.08)', border: '1px solid rgba(16,183,127,0.15)' }}>
              <span className="text-[11px] font-bold" style={{ color: '#10b77f' }}>{f.label}</span>
              <span className="text-[11px] leading-relaxed" style={{ color: '#7a8f7e' }}>{f.desc}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: <MousePointer2 size={28} />,
    color: '#6366f1',
    title: 'Add Your First Element',
    subtitle: 'Drag a widget from the left panel to the canvas.',
    body: (
      <div className="flex flex-col gap-3 text-sm" style={{ color: '#a8bfac' }}>
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Animated diagram */}
          <div className="relative" style={{ background: '#0d1410', height: 120 }}>
            {/* Left panel mockup */}
            <div className="absolute left-3 top-3 bottom-3 w-20 rounded-md flex flex-col gap-1 p-2"
              style={{ background: '#111b14', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-[9px] font-bold mb-1" style={{ color: '#5a7060' }}>WIDGETS</div>
              {['Heading', 'Text', 'Button', 'Image'].map((w) => (
                <div key={w} className="rounded px-1.5 py-0.5 text-[9px]"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#7a8f7e' }}>{w}</div>
              ))}
            </div>
            {/* Arrow */}
            <div className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1"
              style={{ left: 96, color: '#6366f1' }}>
              <div className="w-12 h-px" style={{ background: 'rgba(99,102,241,0.5)' }} />
              <ChevronRight size={14} />
            </div>
            {/* Canvas mockup */}
            <div className="absolute right-3 top-3 bottom-3 w-32 rounded-md flex items-center justify-center"
              style={{ background: '#111b14', border: '2px dashed rgba(99,102,241,0.3)' }}>
              <span className="text-[10px]" style={{ color: '#6366f1' }}>Drop here</span>
            </div>
          </div>
        </div>
        <p>Click any widget in the <strong style={{ color: '#dde4dd' }}>Widgets</strong> tab
          (left panel) and drag it onto the canvas. You can also double-click a widget to add it
          automatically.</p>
        <p style={{ color: '#5a7060' }}>
          💡 <em>Pro tip:</em> Hold <kbd className="px-1 py-0.5 rounded text-[10px]"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#dde4dd' }}>Ctrl</kbd> while
          dragging to duplicate an element.
        </p>
      </div>
    ),
  },
  {
    icon: <Palette size={28} />,
    color: '#f59e0b',
    title: 'Style It Your Way',
    subtitle: 'Select any element to open the Style panel.',
    body: (
      <div className="flex flex-col gap-3 text-sm" style={{ color: '#a8bfac' }}>
        <p>
          Click any element on the canvas to select it. The <strong style={{ color: '#dde4dd' }}>
          right panel</strong> opens with full styling controls — colors, typography, borders,
          animations, and more.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '🎨  Background',   desc: 'Solid, gradient, image' },
            { label: '✍️  Typography',   desc: 'Font, size, weight, color' },
            { label: '📐  Spacing',      desc: 'Padding, margin, width' },
            { label: '✨  Animations',   desc: 'Entrance effects, transitions' },
          ].map((f) => (
            <div key={f.label} className="rounded-lg p-2.5"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
              <div className="text-[11px] font-semibold mb-0.5" style={{ color: '#f59e0b' }}>{f.label}</div>
              <div className="text-[10px]" style={{ color: '#7a8f7e' }}>{f.desc}</div>
            </div>
          ))}
        </div>
        <p className="mt-1">
          Press <kbd className="px-1 py-0.5 rounded text-[10px]"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#dde4dd' }}>?</kbd> anytime
          to see all keyboard shortcuts.
        </p>
      </div>
    ),
  },
];

export function WelcomeWizard() {
  const [visible,  setVisible]  = useState(false);
  const [step,     setStep]     = useState(0);
  const [animDir,  setAnimDir]  = useState<'forward' | 'back'>('forward');

  useEffect(() => {
    const done = localStorage.getItem(LS_KEY);
    if (!done) {
      // Small delay so the builder finishes mounting first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  function close() {
    localStorage.setItem(LS_KEY, 'done');
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setAnimDir('forward');
      setStep((s) => s + 1);
    } else {
      close();
    }
  }

  function prev() {
    if (step > 0) {
      setAnimDir('back');
      setStep((s) => s - 1);
    }
  }

  if (!visible) return null;

  const current = STEPS[step]!;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* Modal */}
      <div
        className="relative flex flex-col w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        style={{
          background:  '#111b14',
          border:      '1px solid rgba(255,255,255,0.09)',
          boxShadow:   '0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(16,183,127,0.1)',
          maxHeight:   '90vh',
        }}
      >
        {/* Gradient header strip */}
        <div className="h-1 w-full" style={{
          background: `linear-gradient(90deg, ${current.color}99, ${current.color}22)`,
        }} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl"
              style={{ background: `${current.color}18`, color: current.color }}>
              {current.icon}
            </div>
            <div>
              <div className="font-bold text-[15px]" style={{ color: '#dde4dd' }}>
                {current.title}
              </div>
              <div className="text-[12px] mt-0.5" style={{ color: '#5a7060' }}>
                {current.subtitle}
              </div>
            </div>
          </div>
          <button
            onClick={close}
            aria-label="Close onboarding"
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
            style={{ color: '#5a7060' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#dde4dd')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#5a7060')}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-2 flex-1 overflow-y-auto">
          {current.body}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => { setAnimDir(i > step ? 'forward' : 'back'); setStep(i); }}
                className="rounded-full transition-all duration-200"
                style={{
                  width:      i === step ? 20 : 6,
                  height:     6,
                  background: i === step ? current.color : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                style={{ color: '#7a8f7e', background: 'rgba(255,255,255,0.05)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#dde4dd'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#7a8f7e'; }}
              >
                <ChevronLeft size={13} /> Back
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all"
              style={{ background: current.color, color: '#fff', boxShadow: `0 0 20px ${current.color}44` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              {step === STEPS.length - 1 ? (
                <><Zap size={13} /> Start Building</>
              ) : (
                <>Next <ChevronRight size={13} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Utility: reset onboarding (for dev/testing) */
export function resetOnboarding() {
  localStorage.removeItem('nexus_onboarding_v1');
}
