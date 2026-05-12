/**
 * TemplatesPanel — Phase 6.4 edition.
 *
 * Phase 6.4 additions:
 *   • 10 built-in templates across 4 categories:
 *     - Starters: Blank, Hero Section
 *     - Landing Pages: Full Landing, SaaS Product, Agency Portfolio
 *     - Sections: Features Grid, Testimonials, CTA Band, Stats Row
 *     - Blog: Article Layout
 *   • SVG thumbnail previews for each template category
 *   • Category filter tabs for quick navigation
 *
 * Phase 5 preserved:
 *   • applyTemplate calls markDirty() after loadPage() so auto-save fires
 *   • Save current page as template (adapter-persisted)
 *   • Graceful fallback when listTemplates/saveTemplate not on adapter
 */

import { useState, useEffect, useCallback } from 'react';
import { LayoutTemplate, Save, Trash2, RefreshCw, Plus, ChevronRight, Search } from 'lucide-react';
import { useCanvasStore, createPage } from '@nexus/core';
import { useAdapter } from '@/contexts/AdapterContext';
import { cn } from '@/lib/cn';
import type { NexusTemplate, NexusNode } from '@nexus/core';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function genId() {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

// ─── SVG Thumbnail helpers ────────────────────────────────────────────────────

export const THUMB_SVG: Record<string, string> = {
  'starter-blank': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="sb-r" cx="50%" cy="50%" r="60%"><stop offset="0%" stop-color="#1e1e2e"/><stop offset="100%" stop-color="#0d0d18"/></radialGradient></defs><rect width="320" height="180" fill="url(#sb-r)"/><rect x="0" y="0" width="320" height="36" fill="#13131f"/><rect x="14" y="12" width="48" height="12" rx="4" fill="#2a2a3e"/><rect x="236" y="11" width="70" height="14" rx="7" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/><line x1="0" y1="36" x2="320" y2="36" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><rect x="20" y="54" width="280" height="94" rx="12" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.07)" stroke-width="1" stroke-dasharray="6 4"/><text x="160" y="108" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="rgba(255,255,255,0.18)" letter-spacing="1">Drop elements to start</text><rect x="140" y="158" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.08)"/></svg>`,

  'starter-hero': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="sh-glow" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="#059669" stop-opacity="0.25"/><stop offset="100%" stop-color="#030712" stop-opacity="0"/></radialGradient><linearGradient id="sh-btn" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#059669"/></linearGradient></defs><rect width="320" height="180" fill="#030712"/><ellipse cx="160" cy="80" rx="160" ry="90" fill="url(#sh-glow)"/><rect x="0" y="0" width="320" height="34" fill="rgba(3,7,18,0.9)"/><rect x="14" y="11" width="42" height="12" rx="4" fill="#10b981" opacity="0.9"/><rect x="100" y="13" width="28" height="8" rx="4" fill="rgba(255,255,255,0.12)"/><rect x="136" y="13" width="28" height="8" rx="4" fill="rgba(255,255,255,0.12)"/><rect x="172" y="13" width="28" height="8" rx="4" fill="rgba(255,255,255,0.12)"/><rect x="256" y="10" width="50" height="14" rx="7" fill="url(#sh-btn)"/><rect x="60" y="56" width="200" height="6" rx="3" fill="#10b981" opacity="0.5"/><rect x="30" y="68" width="260" height="22" rx="4" fill="rgba(255,255,255,0.88)"/><rect x="50" y="96" width="220" height="14" rx="3" fill="rgba(255,255,255,0.35)"/><rect x="80" y="116" width="160" height="12" rx="3" fill="rgba(255,255,255,0.22)"/><rect x="108" y="136" width="104" height="26" rx="13" fill="url(#sh-btn)" opacity="0.9"/><rect x="108" y="136" width="104" height="26" rx="13" fill="none" stroke="rgba(16,185,129,0.4)" stroke-width="1"/></svg>`,

  'landing-full': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="lf-g1" cx="30%" cy="20%" r="60%"><stop offset="0%" stop-color="#064e3b" stop-opacity="0.5"/><stop offset="100%" stop-color="transparent"/></radialGradient><radialGradient id="lf-g2" cx="75%" cy="70%" r="50%"><stop offset="0%" stop-color="#1e3a5f" stop-opacity="0.4"/><stop offset="100%" stop-color="transparent"/></radialGradient><linearGradient id="lf-btn" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#059669"/></linearGradient></defs><rect width="320" height="180" fill="#050509"/><rect width="320" height="180" fill="url(#lf-g1)"/><rect width="320" height="180" fill="url(#lf-g2)"/><rect x="0" y="0" width="320" height="32" fill="rgba(5,5,9,0.95)"/><rect x="12" y="10" width="38" height="12" rx="4" fill="#10b981"/><rect x="90" y="12" width="24" height="8" rx="3" fill="rgba(255,255,255,0.1)"/><rect x="120" y="12" width="24" height="8" rx="3" fill="rgba(255,255,255,0.1)"/><rect x="150" y="12" width="24" height="8" rx="3" fill="rgba(255,255,255,0.1)"/><rect x="258" y="9" width="50" height="14" rx="7" fill="url(#lf-btn)"/><rect x="82" y="46" width="156" height="8" rx="4" fill="rgba(255,255,255,0.85)"/><rect x="60" y="60" width="200" height="18" rx="3" fill="rgba(255,255,255,0.9)"/><rect x="76" y="82" width="168" height="10" rx="3" fill="rgba(255,255,255,0.3)"/><rect x="90" y="98" width="60" height="18" rx="9" fill="url(#lf-btn)"/><rect x="156" y="98" width="60" height="18" rx="9" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/><rect x="14" y="128" width="86" height="42" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="117" y="128" width="86" height="42" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="220" y="128" width="86" height="42" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><circle cx="28" cy="142" r="6" fill="#10b981" opacity="0.7"/><circle cx="131" cy="142" r="6" fill="#6366f1" opacity="0.7"/><circle cx="234" cy="142" r="6" fill="#f59e0b" opacity="0.7"/><rect x="20" y="152" width="60" height="4" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="20" y="158" width="44" height="3" rx="1.5" fill="rgba(255,255,255,0.2)"/><rect x="123" y="152" width="60" height="4" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="226" y="152" width="60" height="4" rx="2" fill="rgba(255,255,255,0.5)"/></svg>`,

  'section-features': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="sf-r" cx="50%" cy="0%" r="80%"><stop offset="0%" stop-color="#1e1b4b" stop-opacity="0.6"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="320" height="180" fill="#060608"/><rect width="320" height="180" fill="url(#sf-r)"/><rect x="100" y="18" width="120" height="14" rx="4" fill="rgba(255,255,255,0.82)"/><rect x="76" y="38" width="168" height="8" rx="3" fill="rgba(255,255,255,0.28)"/><rect x="14" y="60" width="88" height="110" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="116" y="60" width="88" height="110" rx="10" fill="rgba(99,102,241,0.06)" stroke="rgba(99,102,241,0.2)" stroke-width="1"/><rect x="218" y="60" width="88" height="110" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="24" y="72" width="28" height="28" rx="8" fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.4)" stroke-width="1"/><rect x="126" y="72" width="28" height="28" rx="8" fill="rgba(99,102,241,0.2)" stroke="rgba(99,102,241,0.4)" stroke-width="1"/><rect x="228" y="72" width="28" height="28" rx="8" fill="rgba(245,158,11,0.2)" stroke="rgba(245,158,11,0.4)" stroke-width="1"/><text x="38" y="91" text-anchor="middle" font-size="14" fill="#10b981">⚡</text><text x="140" y="91" text-anchor="middle" font-size="14" fill="#818cf8">🎯</text><text x="242" y="91" text-anchor="middle" font-size="14" fill="#f59e0b">🔌</text><rect x="22" y="108" width="64" height="7" rx="3" fill="rgba(255,255,255,0.7)"/><rect x="22" y="120" width="72" height="5" rx="2" fill="rgba(255,255,255,0.22)"/><rect x="22" y="128" width="56" height="5" rx="2" fill="rgba(255,255,255,0.22)"/><rect x="22" y="136" width="64" height="5" rx="2" fill="rgba(255,255,255,0.22)"/><rect x="124" y="108" width="64" height="7" rx="3" fill="rgba(255,255,255,0.7)"/><rect x="124" y="120" width="72" height="5" rx="2" fill="rgba(99,102,241,0.4)"/><rect x="124" y="128" width="56" height="5" rx="2" fill="rgba(99,102,241,0.3)"/><rect x="124" y="136" width="64" height="5" rx="2" fill="rgba(99,102,241,0.3)"/><rect x="226" y="108" width="64" height="7" rx="3" fill="rgba(255,255,255,0.7)"/><rect x="226" y="120" width="72" height="5" rx="2" fill="rgba(255,255,255,0.22)"/><rect x="226" y="128" width="56" height="5" rx="2" fill="rgba(255,255,255,0.22)"/><rect x="226" y="136" width="64" height="5" rx="2" fill="rgba(255,255,255,0.22)"/></svg>`,

  'section-cta': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sc-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#059669"/><stop offset="50%" stop-color="#10b981"/><stop offset="100%" stop-color="#0d9488"/></linearGradient><radialGradient id="sc-glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(255,255,255,0.15)"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="320" height="180" fill="url(#sc-bg)"/><ellipse cx="160" cy="90" rx="180" ry="100" fill="url(#sc-glow)"/><rect x="40" y="54" width="240" height="18" rx="5" fill="rgba(255,255,255,0.92)"/><rect x="60" y="78" width="200" height="10" rx="3" fill="rgba(255,255,255,0.55)"/><rect x="80" y="92" width="160" height="8" rx="3" fill="rgba(255,255,255,0.35)"/><rect x="96" y="112" width="128" height="32" rx="16" fill="white"/><rect x="96" y="112" width="128" height="32" rx="16" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1"/><rect x="104" y="122" width="112" height="12" rx="4" fill="#059669"/></svg>`,

  'section-testimonials': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="st-r" cx="50%" cy="0%" r="70%"><stop offset="0%" stop-color="#1a1033" stop-opacity="0.8"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="320" height="180" fill="#07070f"/><rect width="320" height="180" fill="url(#st-r)"/><rect x="100" y="14" width="120" height="12" rx="4" fill="rgba(255,255,255,0.8)"/><rect x="120" y="30" width="80" height="7" rx="3" fill="rgba(255,255,255,0.25)"/><rect x="10" y="50" width="146" height="120" rx="10" fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.09)" stroke-width="1"/><rect x="164" y="50" width="146" height="120" rx="10" fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.09)" stroke-width="1"/><text x="24" y="76" font-size="28" fill="#f59e0b" opacity="0.7" font-family="serif">"</text><rect x="20" y="84" width="126" height="5" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="20" y="93" width="116" height="5" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="20" y="102" width="98" height="5" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="20" y="111" width="110" height="5" rx="2" fill="rgba(255,255,255,0.35)"/><circle cx="30" cy="137" r="10" fill="rgba(245,158,11,0.3)" stroke="rgba(245,158,11,0.5)" stroke-width="1"/><rect x="48" y="133" width="70" height="5" rx="2" fill="rgba(255,255,255,0.6)"/><rect x="48" y="141" width="50" height="4" rx="2" fill="rgba(255,255,255,0.25)"/><rect x="10" y="154" width="30" height="5" rx="2" fill="#f59e0b" opacity="0.7"/><text x="178" y="76" font-size="28" fill="#10b981" opacity="0.7" font-family="serif">"</text><rect x="174" y="84" width="126" height="5" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="174" y="93" width="116" height="5" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="174" y="102" width="98" height="5" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="174" y="111" width="110" height="5" rx="2" fill="rgba(255,255,255,0.35)"/><circle cx="184" cy="137" r="10" fill="rgba(16,185,129,0.3)" stroke="rgba(16,185,129,0.5)" stroke-width="1"/><rect x="202" y="133" width="70" height="5" rx="2" fill="rgba(255,255,255,0.6)"/><rect x="202" y="141" width="50" height="4" rx="2" fill="rgba(255,255,255,0.25)"/><rect x="164" y="154" width="30" height="5" rx="2" fill="#10b981" opacity="0.7"/></svg>`,

  'section-stats': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ss-g" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#0f172a" stop-opacity="0.9"/><stop offset="100%" stop-color="#050509"/></radialGradient></defs><rect width="320" height="180" fill="#050509"/><rect width="320" height="180" fill="url(#ss-g)"/><rect x="14" y="20" width="68" height="140" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="92" y="20" width="68" height="140" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="170" y="20" width="68" height="140" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="248" y="20" width="58" height="140" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="22" y="50" width="52" height="24" rx="4" fill="#10b981" opacity="0.2"/><rect x="100" y="50" width="52" height="24" rx="4" fill="#6366f1" opacity="0.2"/><rect x="178" y="50" width="52" height="24" rx="4" fill="#f59e0b" opacity="0.2"/><rect x="256" y="50" width="42" height="24" rx="4" fill="#ec4899" opacity="0.2"/><rect x="24" y="53" width="48" height="18" rx="3" fill="#10b981" opacity="0.7"/><rect x="102" y="53" width="48" height="18" rx="3" fill="#818cf8" opacity="0.7"/><rect x="180" y="53" width="48" height="18" rx="3" fill="#f59e0b" opacity="0.7"/><rect x="258" y="53" width="38" height="18" rx="3" fill="#f472b6" opacity="0.7"/><rect x="22" y="82" width="52" height="8" rx="3" fill="rgba(255,255,255,0.55)"/><rect x="100" y="82" width="52" height="8" rx="3" fill="rgba(255,255,255,0.55)"/><rect x="178" y="82" width="52" height="8" rx="3" fill="rgba(255,255,255,0.55)"/><rect x="256" y="82" width="42" height="8" rx="3" fill="rgba(255,255,255,0.55)"/><rect x="22" y="96" width="44" height="5" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="100" y="96" width="44" height="5" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="178" y="96" width="44" height="5" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="256" y="96" width="36" height="5" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="22" y="104" width="36" height="5" rx="2" fill="rgba(255,255,255,0.14)"/><rect x="100" y="104" width="36" height="5" rx="2" fill="rgba(255,255,255,0.14)"/><rect x="178" y="104" width="36" height="5" rx="2" fill="rgba(255,255,255,0.14)"/><rect x="256" y="104" width="30" height="5" rx="2" fill="rgba(255,255,255,0.14)"/></svg>`,

  'blog-article': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ba-r" cx="50%" cy="30%" r="60%"><stop offset="0%" stop-color="#0a1628" stop-opacity="0.7"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="320" height="180" fill="#07070f"/><rect width="320" height="180" fill="url(#ba-r)"/><rect x="60" y="14" width="60" height="8" rx="4" fill="#10b981" opacity="0.8"/><rect x="130" y="16" width="1" height="5" fill="rgba(255,255,255,0.15)"/><rect x="136" y="15" width="60" height="6" rx="3" fill="rgba(255,255,255,0.25)"/><rect x="34" y="30" width="252" height="18" rx="4" fill="rgba(255,255,255,0.85)"/><rect x="34" y="52" width="220" height="14" rx="3" fill="rgba(255,255,255,0.75)"/><rect x="34" y="70" width="180" height="14" rx="3" fill="rgba(255,255,255,0.55)"/><rect x="34" y="90" width="252" height="1" fill="rgba(255,255,255,0.07)"/><rect x="34" y="100" width="252" height="6" rx="2" fill="rgba(255,255,255,0.4)"/><rect x="34" y="110" width="252" height="6" rx="2" fill="rgba(255,255,255,0.4)"/><rect x="34" y="120" width="220" height="6" rx="2" fill="rgba(255,255,255,0.4)"/><rect x="34" y="134" width="252" height="5" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="34" y="142" width="252" height="5" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="34" y="150" width="200" height="5" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="34" y="160" width="252" height="5" rx="2" fill="rgba(255,255,255,0.14)"/><rect x="34" y="168" width="180" height="5" rx="2" fill="rgba(255,255,255,0.14)"/></svg>`,

  'agency-portfolio': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ap-r" cx="20%" cy="30%" r="60%"><stop offset="0%" stop-color="#064e3b" stop-opacity="0.3"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="320" height="180" fill="#080810"/><rect width="320" height="180" fill="url(#ap-r)"/><rect x="0" y="0" width="320" height="32" fill="#0b0b14"/><rect x="12" y="10" width="54" height="12" rx="4" fill="rgba(255,255,255,0.7)"/><rect x="246" y="9" width="62" height="14" rx="7" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/><line x1="0" y1="32" x2="320" y2="32" stroke="rgba(255,255,255,0.05)" stroke-width="1"/><rect x="12" y="44" width="80" height="6" rx="3" fill="rgba(255,255,255,0.2)"/><rect x="12" y="56" width="160" height="18" rx="3" fill="rgba(255,255,255,0.85)"/><rect x="12" y="80" width="130" height="12" rx="3" fill="rgba(255,255,255,0.7)"/><rect x="12" y="100" width="150" height="7" rx="3" fill="rgba(255,255,255,0.3)"/><rect x="12" y="112" width="100" height="7" rx="3" fill="rgba(255,255,255,0.2)"/><rect x="12" y="130" width="80" height="22" rx="8" fill="rgba(255,255,255,0.88)"/><rect x="12" y="130" width="80" height="22" rx="8" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/><rect x="100" y="32" width="1" height="148" fill="rgba(255,255,255,0.04)"/><rect x="106" y="36" width="100" height="68" rx="8" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.25)" stroke-width="1"/><rect x="212" y="36" width="100" height="68" rx="8" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.25)" stroke-width="1"/><rect x="106" y="112" width="100" height="60" rx="8" fill="rgba(245,158,11,0.12)" stroke="rgba(245,158,11,0.25)" stroke-width="1"/><rect x="212" y="112" width="100" height="60" rx="8" fill="rgba(236,72,153,0.12)" stroke="rgba(236,72,153,0.25)" stroke-width="1"/><rect x="112" y="88" width="80" height="5" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="218" y="88" width="80" height="5" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="112" y="152" width="80" height="5" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="218" y="152" width="80" height="5" rx="2" fill="rgba(255,255,255,0.5)"/></svg>`,

  'starter-coming-soon': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="cs-r" cx="50%" cy="40%" r="65%"><stop offset="0%" stop-color="#3b0764" stop-opacity="0.8"/><stop offset="100%" stop-color="#030712"/></radialGradient><linearGradient id="cs-btn" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#6d28d9"/></linearGradient></defs><rect width="320" height="180" fill="#030712"/><rect width="320" height="180" fill="url(#cs-r)"/><circle cx="50" cy="30" r="1.5" fill="white" opacity="0.5"/><circle cx="120" cy="15" r="1" fill="white" opacity="0.4"/><circle cx="200" cy="25" r="1.5" fill="white" opacity="0.6"/><circle cx="270" cy="12" r="1" fill="white" opacity="0.5"/><circle cx="300" cy="40" r="1.2" fill="white" opacity="0.4"/><circle cx="30" cy="70" r="1" fill="white" opacity="0.35"/><circle cx="290" cy="90" r="1.2" fill="white" opacity="0.4"/><rect x="106" y="22" width="108" height="10" rx="5" fill="#a855f7" opacity="0.8"/><rect x="60" y="40" width="200" height="20" rx="4" fill="rgba(255,255,255,0.9)"/><rect x="76" y="66" width="168" height="12" rx="3" fill="rgba(255,255,255,0.4)"/><rect x="94" y="84" width="132" height="10" rx="3" fill="rgba(255,255,255,0.25)"/><rect x="74" y="102" width="72" height="10" rx="5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/><rect x="174" y="100" width="72" height="14" rx="7" fill="url(#cs-btn)"/><rect x="18" y="122" width="60" height="48" rx="10" fill="rgba(124,58,237,0.15)" stroke="rgba(124,58,237,0.4)" stroke-width="1"/><rect x="88" y="122" width="60" height="48" rx="10" fill="rgba(124,58,237,0.15)" stroke="rgba(124,58,237,0.4)" stroke-width="1"/><rect x="158" y="122" width="60" height="48" rx="10" fill="rgba(124,58,237,0.15)" stroke="rgba(124,58,237,0.4)" stroke-width="1"/><rect x="228" y="122" width="74" height="48" rx="10" fill="rgba(124,58,237,0.15)" stroke="rgba(124,58,237,0.4)" stroke-width="1"/><rect x="26" y="136" width="44" height="16" rx="4" fill="#c084fc" opacity="0.85"/><rect x="96" y="136" width="44" height="16" rx="4" fill="#c084fc" opacity="0.85"/><rect x="166" y="136" width="44" height="16" rx="4" fill="#c084fc" opacity="0.85"/><rect x="236" y="136" width="58" height="16" rx="4" fill="#c084fc" opacity="0.85"/><rect x="28" y="156" width="40" height="6" rx="3" fill="#a855f7" opacity="0.5"/><rect x="98" y="156" width="40" height="6" rx="3" fill="#a855f7" opacity="0.5"/><rect x="168" y="156" width="40" height="6" rx="3" fill="#a855f7" opacity="0.5"/><rect x="238" y="156" width="52" height="6" rx="3" fill="#a855f7" opacity="0.5"/></svg>`,

  'landing-saas': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ls-g1" cx="25%" cy="25%" r="50%"><stop offset="0%" stop-color="#312e81" stop-opacity="0.4"/><stop offset="100%" stop-color="transparent"/></radialGradient><radialGradient id="ls-g2" cx="75%" cy="75%" r="50%"><stop offset="0%" stop-color="#4c1d95" stop-opacity="0.3"/><stop offset="100%" stop-color="transparent"/></radialGradient><linearGradient id="ls-btn" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#4f46e5"/></linearGradient></defs><rect width="320" height="180" fill="#0d0d1a"/><rect width="320" height="180" fill="url(#ls-g1)"/><rect width="320" height="180" fill="url(#ls-g2)"/><rect x="0" y="0" width="320" height="30" fill="rgba(13,13,26,0.95)"/><rect x="12" y="9" width="42" height="12" rx="4" fill="#6366f1"/><rect x="82" y="11" width="24" height="8" rx="3" fill="rgba(255,255,255,0.1)"/><rect x="112" y="11" width="24" height="8" rx="3" fill="rgba(255,255,255,0.1)"/><rect x="142" y="11" width="24" height="8" rx="3" fill="rgba(255,255,255,0.1)"/><rect x="258" y="8" width="50" height="14" rx="7" fill="url(#ls-btn)"/><rect x="80" y="44" width="160" height="7" rx="3" fill="#818cf8" opacity="0.5"/><rect x="34" y="58" width="252" height="20" rx="4" fill="rgba(255,255,255,0.88)"/><rect x="50" y="84" width="220" height="11" rx="3" fill="rgba(255,255,255,0.35)"/><rect x="94" y="102" width="62" height="18" rx="9" fill="url(#ls-btn)"/><rect x="162" y="102" width="62" height="18" rx="9" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.35)" stroke-width="1"/><rect x="14" y="130" width="86" height="42" rx="8" fill="rgba(99,102,241,0.05)" stroke="rgba(99,102,241,0.18)" stroke-width="1"/><rect x="117" y="130" width="86" height="42" rx="8" fill="rgba(99,102,241,0.05)" stroke="rgba(99,102,241,0.18)" stroke-width="1"/><rect x="220" y="130" width="86" height="42" rx="8" fill="rgba(99,102,241,0.05)" stroke="rgba(99,102,241,0.18)" stroke-width="1"/><rect x="22" y="140" width="42" height="7" rx="3" fill="#818cf8" opacity="0.8"/><rect x="22" y="151" width="62" height="5" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="22" y="159" width="52" height="5" rx="2" fill="rgba(255,255,255,0.14)"/><rect x="125" y="140" width="42" height="7" rx="3" fill="#818cf8" opacity="0.8"/><rect x="125" y="151" width="62" height="5" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="228" y="140" width="42" height="7" rx="3" fill="#818cf8" opacity="0.8"/><rect x="228" y="151" width="62" height="5" rx="2" fill="rgba(255,255,255,0.2)"/></svg>`,

  'landing-startup': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="lu-g" cx="40%" cy="30%" r="60%"><stop offset="0%" stop-color="#78350f" stop-opacity="0.45"/><stop offset="100%" stop-color="transparent"/></radialGradient><linearGradient id="lu-btn" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#ef4444"/></linearGradient></defs><rect width="320" height="180" fill="#0c0a00"/><rect width="320" height="180" fill="url(#lu-g)"/><rect x="0" y="0" width="320" height="30" fill="rgba(12,10,0,0.9)"/><rect x="12" y="9" width="36" height="12" rx="4" fill="#f59e0b"/><rect x="258" y="8" width="50" height="14" rx="7" fill="url(#lu-btn)"/><rect x="12" y="38" width="80" height="7" rx="3" fill="#f59e0b" opacity="0.65"/><rect x="12" y="52" width="200" height="18" rx="3" fill="rgba(255,255,255,0.9)"/><rect x="12" y="74" width="160" height="14" rx="3" fill="rgba(255,255,255,0.75)"/><rect x="12" y="96" width="170" height="9" rx="3" fill="rgba(255,255,255,0.3)"/><rect x="12" y="114" width="70" height="20" rx="10" fill="url(#lu-btn)"/><rect x="90" y="114" width="70" height="20" rx="10" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.3)" stroke-width="1"/><rect x="0" y="144" width="320" height="36" fill="rgba(255,255,255,0.025)" style="border-top:1px solid rgba(255,255,255,0.05)"/><rect x="14" y="152" width="60" height="6" rx="3" fill="#f59e0b" opacity="0.8"/><rect x="14" y="162" width="46" height="5" rx="2" fill="rgba(255,255,255,0.25)"/><rect x="94" y="152" width="60" height="6" rx="3" fill="#f59e0b" opacity="0.8"/><rect x="94" y="162" width="46" height="5" rx="2" fill="rgba(255,255,255,0.25)"/><rect x="174" y="152" width="60" height="6" rx="3" fill="#f59e0b" opacity="0.8"/><rect x="174" y="162" width="46" height="5" rx="2" fill="rgba(255,255,255,0.25)"/><rect x="254" y="152" width="52" height="6" rx="3" fill="#f59e0b" opacity="0.8"/><rect x="254" y="162" width="40" height="5" rx="2" fill="rgba(255,255,255,0.25)"/></svg>`,

  'landing-mobile-app': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ma-g" cx="35%" cy="40%" r="60%"><stop offset="0%" stop-color="#1e3a5f" stop-opacity="0.5"/><stop offset="100%" stop-color="transparent"/></radialGradient><linearGradient id="ma-btn" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><rect width="320" height="180" fill="#030b1a"/><rect width="320" height="180" fill="url(#ma-g)"/><rect x="0" y="0" width="320" height="30" fill="rgba(3,11,26,0.95)"/><rect x="12" y="9" width="38" height="12" rx="4" fill="url(#ma-btn)"/><rect x="258" y="8" width="50" height="14" rx="7" fill="url(#ma-btn)"/><rect x="12" y="38" width="90" height="7" rx="3" fill="#60a5fa" opacity="0.5"/><rect x="12" y="52" width="160" height="18" rx="3" fill="rgba(255,255,255,0.88)"/><rect x="12" y="76" width="140" height="12" rx="3" fill="rgba(255,255,255,0.7)"/><rect x="12" y="96" width="150" height="8" rx="3" fill="rgba(255,255,255,0.28)"/><rect x="12" y="112" width="64" height="18" rx="9" fill="white"/><rect x="84" y="112" width="64" height="18" rx="9" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/><rect x="184" y="24" width="116" height="150" rx="14" fill="#0d1a30" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/><rect x="190" y="32" width="104" height="134" rx="8" fill="#060e1e"/><rect x="194" y="38" width="96" height="22" rx="6" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.3)" stroke-width="1"/><rect x="198" y="44" width="52" height="8" rx="3" fill="url(#ma-btn)" opacity="0.7"/><rect x="194" y="66" width="96" height="32" rx="6" fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.2)" stroke-width="1"/><rect x="200" y="72" width="44" height="5" rx="2" fill="rgba(255,255,255,0.4)"/><rect x="200" y="80" width="60" height="10" rx="3" fill="rgba(255,255,255,0.85)"/><rect x="194" y="104" width="96" height="28" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.07)" stroke-width="1"/><rect x="200" y="110" width="40" height="5" rx="2" fill="rgba(255,255,255,0.35)"/><rect x="200" y="118" width="55" height="8" rx="3" fill="#10b981" opacity="0.8"/><rect x="194" y="138" width="96" height="18" rx="9" fill="url(#ma-btn)" opacity="0.85"/></svg>`,

  'landing-ecommerce': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="le-btn" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#ea580c"/></linearGradient><radialGradient id="le-g" cx="60%" cy="40%" r="55%"><stop offset="0%" stop-color="#431407" stop-opacity="0.4"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="320" height="180" fill="#0a0503"/><rect width="320" height="180" fill="url(#le-g)"/><rect x="0" y="0" width="320" height="30" fill="rgba(10,5,3,0.95)"/><rect x="12" y="9" width="50" height="12" rx="4" fill="#f97316"/><rect x="90" y="11" width="22" height="8" rx="3" fill="rgba(255,255,255,0.1)"/><rect x="118" y="11" width="22" height="8" rx="3" fill="rgba(255,255,255,0.1)"/><rect x="146" y="11" width="22" height="8" rx="3" fill="rgba(255,255,255,0.1)"/><rect x="258" y="8" width="50" height="14" rx="7" fill="rgba(249,115,22,0.15)" stroke="rgba(249,115,22,0.3)" stroke-width="1"/><rect x="12" y="38" width="82" height="6" rx="3" fill="#f97316" opacity="0.65"/><rect x="12" y="50" width="160" height="18" rx="3" fill="rgba(255,255,255,0.88)"/><rect x="12" y="74" width="140" height="12" rx="3" fill="rgba(255,255,255,0.7)"/><rect x="12" y="94" width="150" height="8" rx="3" fill="rgba(255,255,255,0.28)"/><rect x="12" y="112" width="68" height="18" rx="9" fill="url(#le-btn)"/><rect x="88" y="112" width="68" height="18" rx="9" fill="rgba(249,115,22,0.08)" stroke="rgba(249,115,22,0.25)" stroke-width="1"/><rect x="182" y="30" width="124" height="144" rx="10" fill="#150b07" stroke="rgba(249,115,22,0.1)" stroke-width="1"/><rect x="188" y="38" width="112" height="72" rx="6" fill="rgba(249,115,22,0.1)"/><rect x="193" y="44" width="40" height="6" rx="3" fill="#f97316" opacity="0.6"/><rect x="188" y="116" width="76" height="8" rx="3" fill="rgba(255,255,255,0.7)"/><rect x="188" y="128" width="48" height="14" rx="3" fill="#f97316" opacity="0.9"/><rect x="188" y="146" width="112" height="18" rx="9" fill="url(#le-btn)"/></svg>`,

  'landing-consulting': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="lc-g" cx="60%" cy="30%" r="55%"><stop offset="0%" stop-color="#0c2340" stop-opacity="0.5"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="320" height="180" fill="#030b18"/><rect width="320" height="180" fill="url(#lc-g)"/><rect x="0" y="0" width="320" height="32" fill="rgba(3,11,24,0.97)"/><rect x="12" y="10" width="60" height="12" rx="3" fill="rgba(255,255,255,0.8)"/><rect x="96" y="12" width="24" height="8" rx="3" fill="rgba(255,255,255,0.1)"/><rect x="126" y="12" width="24" height="8" rx="3" fill="rgba(255,255,255,0.1)"/><rect x="156" y="12" width="24" height="8" rx="3" fill="rgba(255,255,255,0.1)"/><rect x="248" y="9" width="60" height="14" rx="4" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/><rect x="12" y="42" width="140" height="6" rx="3" fill="rgba(255,255,255,0.22)"/><rect x="12" y="56" width="230" height="22" rx="4" fill="rgba(255,255,255,0.88)"/><rect x="12" y="84" width="180" height="14" rx="3" fill="rgba(255,255,255,0.75)"/><rect x="12" y="106" width="190" height="8" rx="3" fill="rgba(255,255,255,0.28)"/><rect x="12" y="122" width="82" height="20" rx="7" fill="rgba(255,255,255,0.9)"/><rect x="102" y="122" width="82" height="20" rx="7" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/><rect x="0" y="152" width="320" height="28" fill="rgba(255,255,255,0.02)" style="border-top:1px solid rgba(255,255,255,0.05)"/><rect x="14" y="158" width="54" height="6" rx="3" fill="rgba(255,255,255,0.5)"/><rect x="14" y="167" width="40" height="4" rx="2" fill="rgba(255,255,255,0.18)"/><rect x="94" y="158" width="54" height="6" rx="3" fill="rgba(255,255,255,0.5)"/><rect x="174" y="158" width="54" height="6" rx="3" fill="rgba(255,255,255,0.5)"/><rect x="254" y="158" width="54" height="6" rx="3" fill="rgba(255,255,255,0.5)"/></svg>`,

  'section-pricing': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sp-acc" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#059669"/></linearGradient><radialGradient id="sp-glow" cx="50%" cy="0%" r="60%"><stop offset="0%" stop-color="#064e3b" stop-opacity="0.4"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="320" height="180" fill="#06060e"/><rect width="320" height="180" fill="url(#sp-glow)"/><rect x="96" y="12" width="128" height="14" rx="4" fill="rgba(255,255,255,0.85)"/><rect x="80" y="30" width="160" height="8" rx="3" fill="rgba(255,255,255,0.25)"/><rect x="10" y="48" width="88" height="122" rx="10" fill="#0d0d1e" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="116" y="42" width="88" height="134" rx="10" fill="#061a11" stroke="#10b981" stroke-width="1.5"/><rect x="222" y="48" width="88" height="122" rx="10" fill="#0d0d1e" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="118" y="45" width="84" height="12" rx="6" fill="#10b981" opacity="0.9"/><rect x="16" y="58" width="52" height="8" rx="3" fill="rgba(255,255,255,0.5)"/><rect x="228" y="58" width="52" height="8" rx="3" fill="rgba(255,255,255,0.5)"/><rect x="120" y="62" width="76" height="18" rx="3" fill="rgba(255,255,255,0.9)"/><rect x="16" y="72" width="68" height="18" rx="3" fill="rgba(255,255,255,0.8)"/><rect x="228" y="72" width="68" height="18" rx="3" fill="rgba(255,255,255,0.8)"/><rect x="16" y="98" width="76" height="5" rx="2" fill="rgba(255,255,255,0.18)"/><rect x="16" y="108" width="68" height="5" rx="2" fill="rgba(255,255,255,0.18)"/><rect x="16" y="118" width="72" height="5" rx="2" fill="rgba(255,255,255,0.18)"/><rect x="120" y="90" width="68" height="5" rx="2" fill="rgba(16,185,129,0.5)"/><rect x="120" y="100" width="76" height="5" rx="2" fill="rgba(16,185,129,0.5)"/><rect x="120" y="110" width="60" height="5" rx="2" fill="rgba(16,185,129,0.5)"/><rect x="120" y="120" width="72" height="5" rx="2" fill="rgba(16,185,129,0.5)"/><rect x="228" y="98" width="76" height="5" rx="2" fill="rgba(255,255,255,0.18)"/><rect x="228" y="108" width="60" height="5" rx="2" fill="rgba(255,255,255,0.18)"/><rect x="228" y="118" width="70" height="5" rx="2" fill="rgba(255,255,255,0.18)"/><rect x="14" y="152" width="80" height="12" rx="6" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/><rect x="118" y="152" width="84" height="12" rx="6" fill="url(#sp-acc)"/><rect x="224" y="152" width="84" height="12" rx="6" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/></svg>`,

  'section-team': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ste-g" cx="50%" cy="0%" r="60%"><stop offset="0%" stop-color="#1e1b4b" stop-opacity="0.5"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="320" height="180" fill="#07070f"/><rect width="320" height="180" fill="url(#ste-g)"/><rect x="96" y="14" width="128" height="13" rx="4" fill="rgba(255,255,255,0.85)"/><rect x="110" y="32" width="100" height="8" rx="3" fill="rgba(255,255,255,0.25)"/><rect x="10" y="52" width="66" height="118" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="86" y="52" width="66" height="118" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="162" y="52" width="66" height="118" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="238" y="52" width="72" height="118" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><circle cx="43" cy="78" r="16" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.35)" stroke-width="1.5"/><circle cx="119" cy="78" r="16" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.35)" stroke-width="1.5"/><circle cx="195" cy="78" r="16" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.35)" stroke-width="1.5"/><circle cx="274" cy="78" r="16" fill="rgba(236,72,153,0.15)" stroke="rgba(236,72,153,0.35)" stroke-width="1.5"/><rect x="14" y="102" width="58" height="7" rx="3" fill="rgba(255,255,255,0.75)"/><rect x="90" y="102" width="58" height="7" rx="3" fill="rgba(255,255,255,0.75)"/><rect x="166" y="102" width="58" height="7" rx="3" fill="rgba(255,255,255,0.75)"/><rect x="242" y="102" width="62" height="7" rx="3" fill="rgba(255,255,255,0.75)"/><rect x="14" y="114" width="46" height="5" rx="2" fill="rgba(255,255,255,0.25)"/><rect x="90" y="114" width="46" height="5" rx="2" fill="rgba(255,255,255,0.25)"/><rect x="166" y="114" width="46" height="5" rx="2" fill="rgba(255,255,255,0.25)"/><rect x="242" y="114" width="52" height="5" rx="2" fill="rgba(255,255,255,0.25)"/><rect x="14" y="124" width="28" height="5" rx="2" fill="#10b981" opacity="0.55"/><rect x="90" y="124" width="28" height="5" rx="2" fill="#818cf8" opacity="0.55"/><rect x="166" y="124" width="28" height="5" rx="2" fill="#fbbf24" opacity="0.55"/><rect x="242" y="124" width="28" height="5" rx="2" fill="#f472b6" opacity="0.55"/><rect x="14" y="134" width="58" height="5" rx="2" fill="rgba(255,255,255,0.12)"/><rect x="14" y="142" width="44" height="5" rx="2" fill="rgba(255,255,255,0.12)"/><rect x="90" y="134" width="58" height="5" rx="2" fill="rgba(255,255,255,0.12)"/><rect x="90" y="142" width="44" height="5" rx="2" fill="rgba(255,255,255,0.12)"/><rect x="166" y="134" width="58" height="5" rx="2" fill="rgba(255,255,255,0.12)"/><rect x="242" y="134" width="62" height="5" rx="2" fill="rgba(255,255,255,0.12)"/></svg>`,

  'section-faq': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="fq-g" cx="50%" cy="0%" r="60%"><stop offset="0%" stop-color="#064e3b" stop-opacity="0.35"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="320" height="180" fill="#06060e"/><rect width="320" height="180" fill="url(#fq-g)"/><rect x="96" y="12" width="128" height="13" rx="4" fill="rgba(255,255,255,0.85)"/><rect x="110" y="30" width="100" height="8" rx="3" fill="rgba(255,255,255,0.25)"/><rect x="10" y="48" width="300" height="20" rx="6" fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.09)" stroke-width="1"/><rect x="10" y="74" width="300" height="20" rx="6" fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.09)" stroke-width="1"/><rect x="10" y="100" width="300" height="20" rx="6" fill="rgba(16,185,129,0.06)" stroke="#10b981" stroke-width="1"/><rect x="10" y="126" width="300" height="20" rx="6" fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.09)" stroke-width="1"/><rect x="10" y="152" width="300" height="20" rx="6" fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.09)" stroke-width="1"/><rect x="18" y="55" width="196" height="6" rx="3" fill="rgba(255,255,255,0.65)"/><rect x="18" y="81" width="160" height="6" rx="3" fill="rgba(255,255,255,0.65)"/><rect x="18" y="107" width="210" height="6" rx="3" fill="#10b981" opacity="0.85"/><rect x="18" y="133" width="140" height="6" rx="3" fill="rgba(255,255,255,0.65)"/><rect x="18" y="159" width="176" height="6" rx="3" fill="rgba(255,255,255,0.65)"/><rect x="296" y="52" width="10" height="10" rx="3" fill="rgba(255,255,255,0.12)"/><rect x="296" y="78" width="10" height="10" rx="3" fill="rgba(255,255,255,0.12)"/><rect x="296" y="104" width="10" height="10" rx="3" fill="#10b981" opacity="0.7"/><rect x="296" y="130" width="10" height="10" rx="3" fill="rgba(255,255,255,0.12)"/><rect x="296" y="156" width="10" height="10" rx="3" fill="rgba(255,255,255,0.12)"/></svg>`,

  'section-contact': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sco-btn" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#818cf8"/></linearGradient><radialGradient id="sco-g" cx="70%" cy="50%" r="55%"><stop offset="0%" stop-color="#0c1a2e" stop-opacity="0.6"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="320" height="180" fill="#06060e"/><rect width="320" height="180" fill="url(#sco-g)"/><rect x="80" y="12" width="160" height="13" rx="4" fill="rgba(255,255,255,0.85)"/><rect x="94" y="30" width="132" height="8" rx="3" fill="rgba(255,255,255,0.25)"/><rect x="10" y="48" width="134" height="124" rx="10" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.07)" stroke-width="1"/><rect x="154" y="48" width="156" height="124" rx="10" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.07)" stroke-width="1"/><rect x="18" y="58" width="16" height="16" rx="8" fill="rgba(56,189,248,0.2)" stroke="rgba(56,189,248,0.5)" stroke-width="1"/><rect x="40" y="60" width="80" height="6" rx="3" fill="rgba(255,255,255,0.6)"/><rect x="40" y="70" width="60" height="4" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="18" y="86" width="16" height="16" rx="8" fill="rgba(129,140,248,0.2)" stroke="rgba(129,140,248,0.5)" stroke-width="1"/><rect x="40" y="88" width="74" height="6" rx="3" fill="rgba(255,255,255,0.6)"/><rect x="40" y="98" width="54" height="4" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="18" y="114" width="16" height="16" rx="8" fill="rgba(245,158,11,0.2)" stroke="rgba(245,158,11,0.5)" stroke-width="1"/><rect x="40" y="116" width="66" height="6" rx="3" fill="rgba(255,255,255,0.6)"/><rect x="40" y="126" width="46" height="4" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="162" y="56" width="140" height="16" rx="5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/><rect x="162" y="78" width="140" height="16" rx="5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/><rect x="162" y="100" width="140" height="36" rx="5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/><rect x="162" y="144" width="140" height="18" rx="9" fill="url(#sco-btn)"/></svg>`,

  'blog-grid': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="bg-g" cx="50%" cy="0%" r="60%"><stop offset="0%" stop-color="#2d1657" stop-opacity="0.4"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="320" height="180" fill="#07070f"/><rect width="320" height="180" fill="url(#bg-g)"/><rect x="86" y="12" width="148" height="12" rx="4" fill="rgba(255,255,255,0.82)"/><rect x="100" y="30" width="120" height="7" rx="3" fill="rgba(255,255,255,0.25)"/><rect x="10" y="48" width="90" height="122" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" stroke-width="1"/><rect x="115" y="48" width="90" height="122" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" stroke-width="1"/><rect x="220" y="48" width="90" height="122" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" stroke-width="1"/><rect x="10" y="48" width="90" height="50" rx="10" fill="rgba(124,58,237,0.15)"/><rect x="115" y="48" width="90" height="50" rx="10" fill="rgba(14,165,233,0.15)"/><rect x="220" y="48" width="90" height="50" rx="10" fill="rgba(245,158,11,0.15)"/><rect x="14" y="106" width="34" height="7" rx="3" fill="#a78bfa" opacity="0.8"/><rect x="119" y="106" width="34" height="7" rx="3" fill="#34d399" opacity="0.8"/><rect x="224" y="106" width="34" height="7" rx="3" fill="#fbbf24" opacity="0.8"/><rect x="14" y="118" width="78" height="6" rx="3" fill="rgba(255,255,255,0.7)"/><rect x="14" y="128" width="70" height="6" rx="3" fill="rgba(255,255,255,0.7)"/><rect x="119" y="118" width="78" height="6" rx="3" fill="rgba(255,255,255,0.7)"/><rect x="119" y="128" width="68" height="6" rx="3" fill="rgba(255,255,255,0.7)"/><rect x="224" y="118" width="78" height="6" rx="3" fill="rgba(255,255,255,0.7)"/><rect x="224" y="128" width="64" height="6" rx="3" fill="rgba(255,255,255,0.7)"/><rect x="14" y="140" width="60" height="4" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="119" y="140" width="60" height="4" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="224" y="140" width="60" height="4" rx="2" fill="rgba(255,255,255,0.2)"/><circle cx="24" cy="162" r="8" fill="rgba(124,58,237,0.3)" stroke="rgba(124,58,237,0.5)" stroke-width="1"/><rect x="36" y="158" width="60" height="4" rx="2" fill="rgba(255,255,255,0.4)"/><circle cx="129" cy="162" r="8" fill="rgba(14,165,233,0.3)" stroke="rgba(14,165,233,0.5)" stroke-width="1"/><rect x="141" y="158" width="60" height="4" rx="2" fill="rgba(255,255,255,0.4)"/><circle cx="234" cy="162" r="8" fill="rgba(245,158,11,0.3)" stroke="rgba(245,158,11,0.5)" stroke-width="1"/><rect x="246" y="158" width="60" height="4" rx="2" fill="rgba(255,255,255,0.4)"/></svg>`,

  'portfolio-creative': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="pc-g" cx="30%" cy="30%" r="55%"><stop offset="0%" stop-color="#064e3b" stop-opacity="0.3"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="320" height="180" fill="#050509"/><rect width="320" height="180" fill="url(#pc-g)"/><rect x="0" y="0" width="320" height="28" fill="#09090f"/><rect x="12" y="8" width="52" height="12" rx="4" fill="rgba(255,255,255,0.8)"/><rect x="268" y="7" width="40" height="14" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/><rect x="10" y="36" width="154" height="88" rx="8" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.25)" stroke-width="1"/><rect x="172" y="36" width="74" height="42" rx="8" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.25)" stroke-width="1"/><rect x="252" y="36" width="58" height="42" rx="8" fill="rgba(245,158,11,0.12)" stroke="rgba(245,158,11,0.25)" stroke-width="1"/><rect x="172" y="84" width="74" height="40" rx="8" fill="rgba(236,72,153,0.12)" stroke="rgba(236,72,153,0.25)" stroke-width="1"/><rect x="252" y="84" width="58" height="40" rx="8" fill="rgba(59,130,246,0.12)" stroke="rgba(59,130,246,0.25)" stroke-width="1"/><rect x="18" y="96" width="100" height="8" rx="3" fill="rgba(255,255,255,0.75)"/><rect x="18" y="108" width="70" height="5" rx="2" fill="rgba(255,255,255,0.3)"/><rect x="178" y="96" width="58" height="5" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="258" y="96" width="44" height="5" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="178" y="102" width="44" height="4" rx="2" fill="rgba(255,255,255,0.25)"/><rect x="178" y="118" width="58" height="5" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="258" y="116" width="44" height="5" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="10" y="132" width="300" height="8" rx="3" fill="rgba(255,255,255,0.06)"/><rect x="10" y="145" width="240" height="6" rx="3" fill="rgba(255,255,255,0.1)"/><rect x="10" y="156" width="280" height="5" rx="2" fill="rgba(255,255,255,0.06)"/><rect x="10" y="165" width="200" height="5" rx="2" fill="rgba(255,255,255,0.06)"/></svg>`,

  'portfolio-photography': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="pp-g" cx="50%" cy="40%" r="65%"><stop offset="0%" stop-color="#111116" stop-opacity="0.8"/><stop offset="100%" stop-color="#050507"/></radialGradient></defs><rect width="320" height="180" fill="#050507"/><rect width="320" height="180" fill="url(#pp-g)"/><rect x="0" y="0" width="320" height="26" fill="rgba(255,255,255,0.02)"/><rect x="12" y="7" width="64" height="12" rx="3" fill="rgba(255,255,255,0.65)"/><rect x="270" y="6" width="38" height="14" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.18)" stroke-width="1"/><rect x="10" y="34" width="158" height="96" rx="6" fill="#0f0f15" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="176" y="34" width="134" height="46" rx="6" fill="#0f0f15" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><rect x="176" y="86" width="134" height="44" rx="6" fill="#0f0f15" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><ellipse cx="89" cy="82" rx="40" ry="35" fill="#10b981" opacity="0.05"/><ellipse cx="243" cy="57" rx="30" ry="20" fill="#6366f1" opacity="0.06"/><ellipse cx="243" cy="108" rx="30" ry="20" fill="#f59e0b" opacity="0.06"/><rect x="14" y="108" width="108" height="8" rx="3" fill="rgba(255,255,255,0.75)"/><rect x="14" y="120" width="78" height="5" rx="2" fill="rgba(255,255,255,0.3)"/><rect x="180" y="62" width="96" height="6" rx="3" fill="rgba(255,255,255,0.65)"/><rect x="180" y="72" width="64" height="4" rx="2" fill="rgba(255,255,255,0.25)"/><rect x="180" y="112" width="96" height="6" rx="3" fill="rgba(255,255,255,0.65)"/><rect x="180" y="122" width="64" height="4" rx="2" fill="rgba(255,255,255,0.25)"/><rect x="10" y="138" width="300" height="26" rx="6" fill="rgba(255,255,255,0.025)"/><rect x="18" y="146" width="68" height="8" rx="3" fill="rgba(255,255,255,0.55)"/><rect x="210" y="146" width="92" height="8" rx="3" fill="#10b981" opacity="0.65"/></svg>`,
};

// ─── Built-in templates ───────────────────────────────────────────────────────

export function n(overrides: Partial<NexusNode> & Pick<NexusNode, 'id' | 'type'>): NexusNode {
  return {
    parentId: null, children: [], props: {}, styles: {}, visibility: {},
    interactions: {}, locked: false, hidden: false, _v: 1, _ops: [],
    ...overrides,
  };
}

const STARTERS: NexusTemplate[] = [
  {
    id: 'starter-blank', name: 'Blank Page', category: 'Starters',
    description: 'A clean slate with a single container.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['c1'] }),
        c1:   n({ id: 'c1', type: 'container', parentId: 'root', props: { layout: 'flex', direction: 'column', gap: '16px' }, styles: { base: { padding: '40px 20px' } } }),
      },
    },
  },
  {
    id: 'starter-hero', name: 'Hero Section', category: 'Starters',
    description: 'Centered heading + subheading + CTA button.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root:  n({ id: 'root', type: 'root', children: ['hero'] }),
        hero:  n({ id: 'hero', type: 'container', parentId: 'root', children: ['h', 'p', 'b'], props: { layout: 'flex', direction: 'column', align: 'center', gap: '24px' }, styles: { base: { padding: '80px 20px', textAlign: 'center', minHeight: '80vh', alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column' } } }),
        h:     n({ id: 'h', type: 'heading', parentId: 'hero', props: { text: 'Build something remarkable.', level: 'h1', align: 'center' }, styles: { base: { fontSize: '3.5rem', fontWeight: '800', lineHeight: '1.1', letterSpacing: '-0.03em', maxWidth: '700px' } } }),
        p:     n({ id: 'p', type: 'paragraph', parentId: 'hero', props: { text: 'The fastest way to design and publish beautiful pages — without writing a single line of code.' }, styles: { base: { fontSize: '1.25rem', maxWidth: '540px', margin: '0 auto', opacity: '0.7', lineHeight: '1.7' } } }),
        b:     n({ id: 'b', type: 'button', parentId: 'hero', props: { label: 'Get Started Free', variant: 'primary', size: 'lg' }, styles: { base: { padding: '14px 32px', borderRadius: '40px', fontSize: '1rem', fontWeight: '700', background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer' } } }),
      },
    },
  },
  {
    id: 'starter-coming-soon', name: 'Coming Soon', category: 'Starters',
    description: 'Full-screen launch countdown with waitlist email capture.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['wrap'] }),
        wrap: n({ id: 'wrap', type: 'container', parentId: 'root', children: ['eyebrow','h1','sub','email-row','countdown'], props: { layout: 'flex', direction: 'column', align: 'center', gap: '32px' }, styles: { base: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center', background: 'radial-gradient(ellipse at 50% 35%, #3b0764 0%, #030712 70%)' } } }),
        eyebrow: n({ id: 'eyebrow', type: 'heading', parentId: 'wrap', props: { text: '✨ LAUNCHING SOON', level: 'span' }, styles: { base: { fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.18em', color: '#a855f7', background: 'rgba(168,85,247,0.12)', padding: '4px 14px', borderRadius: '40px', border: '1px solid rgba(168,85,247,0.3)' } } }),
        h1: n({ id: 'h1', type: 'heading', parentId: 'wrap', props: { text: 'Something Beautiful\nIs Coming', level: 'h1', align: 'center' }, styles: { base: { fontSize: '4rem', fontWeight: '900', lineHeight: '1.08', letterSpacing: '-0.04em', maxWidth: '700px', color: '#fff' } } }),
        sub: n({ id: 'sub', type: 'paragraph', parentId: 'wrap', props: { text: "We're crafting an extraordinary new experience. Be the first to know when we launch." }, styles: { base: { fontSize: '1.15rem', maxWidth: '500px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.75' } } }),
        'email-row': n({ id: 'email-row', type: 'container', parentId: 'wrap', children: ['email-placeholder','notify-btn'], styles: { base: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '440px' } } }),
        'email-placeholder': n({ id: 'email-placeholder', type: 'container', parentId: 'email-row', children: ['email-label'], styles: { base: { flex: '1', minWidth: '200px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' } } }),
        'email-label': n({ id: 'email-label', type: 'heading', parentId: 'email-placeholder', props: { text: 'Enter your email…', level: 'span' }, styles: { base: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.35)', fontWeight: '400' } } }),
        'notify-btn': n({ id: 'notify-btn', type: 'button', parentId: 'email-row', props: { label: 'Notify Me', variant: 'primary' }, styles: { base: { padding: '12px 24px', borderRadius: '12px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontWeight: '700', border: 'none', cursor: 'pointer' } } }),
        countdown: n({ id: 'countdown', type: 'container', parentId: 'wrap', children: ['cd-days','cd-hrs','cd-min','cd-sec'], styles: { base: { display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' } } }),
        'cd-days': n({ id: 'cd-days', type: 'container', parentId: 'countdown', children: ['cd-days-n','cd-days-l'], styles: { base: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '72px', padding: '20px 16px', borderRadius: '16px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)' } } }),
        'cd-days-n': n({ id: 'cd-days-n', type: 'heading', parentId: 'cd-days', props: { text: '12', level: 'span', align: 'center' }, styles: { base: { fontSize: '2.2rem', fontWeight: '900', color: '#c084fc', lineHeight: '1' } } }),
        'cd-days-l': n({ id: 'cd-days-l', type: 'heading', parentId: 'cd-days', props: { text: 'DAYS', level: 'span', align: 'center' }, styles: { base: { fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.12em', color: 'rgba(192,132,252,0.6)' } } }),
        'cd-hrs': n({ id: 'cd-hrs', type: 'container', parentId: 'countdown', children: ['cd-hrs-n','cd-hrs-l'], styles: { base: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '72px', padding: '20px 16px', borderRadius: '16px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)' } } }),
        'cd-hrs-n': n({ id: 'cd-hrs-n', type: 'heading', parentId: 'cd-hrs', props: { text: '08', level: 'span', align: 'center' }, styles: { base: { fontSize: '2.2rem', fontWeight: '900', color: '#c084fc', lineHeight: '1' } } }),
        'cd-hrs-l': n({ id: 'cd-hrs-l', type: 'heading', parentId: 'cd-hrs', props: { text: 'HRS', level: 'span', align: 'center' }, styles: { base: { fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.12em', color: 'rgba(192,132,252,0.6)' } } }),
        'cd-min': n({ id: 'cd-min', type: 'container', parentId: 'countdown', children: ['cd-min-n','cd-min-l'], styles: { base: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '72px', padding: '20px 16px', borderRadius: '16px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)' } } }),
        'cd-min-n': n({ id: 'cd-min-n', type: 'heading', parentId: 'cd-min', props: { text: '45', level: 'span', align: 'center' }, styles: { base: { fontSize: '2.2rem', fontWeight: '900', color: '#c084fc', lineHeight: '1' } } }),
        'cd-min-l': n({ id: 'cd-min-l', type: 'heading', parentId: 'cd-min', props: { text: 'MIN', level: 'span', align: 'center' }, styles: { base: { fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.12em', color: 'rgba(192,132,252,0.6)' } } }),
        'cd-sec': n({ id: 'cd-sec', type: 'container', parentId: 'countdown', children: ['cd-sec-n','cd-sec-l'], styles: { base: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '72px', padding: '20px 16px', borderRadius: '16px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)' } } }),
        'cd-sec-n': n({ id: 'cd-sec-n', type: 'heading', parentId: 'cd-sec', props: { text: '30', level: 'span', align: 'center' }, styles: { base: { fontSize: '2.2rem', fontWeight: '900', color: '#c084fc', lineHeight: '1' } } }),
        'cd-sec-l': n({ id: 'cd-sec-l', type: 'heading', parentId: 'cd-sec', props: { text: 'SEC', level: 'span', align: 'center' }, styles: { base: { fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.12em', color: 'rgba(192,132,252,0.6)' } } }),
      },
    },
  },
];

const LANDING_TEMPLATES: NexusTemplate[] = [
  {
    id: 'landing-full', name: 'Full Landing Page', category: 'Landing Pages',
    description: 'Complete hero + features + CTA layout. Ready to customise.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root',
      globalStyles: { '--brand': '#10b981', '--brand-dark': '#059669', '--text-primary': '#f9fafb', '--text-muted': 'rgba(249,250,251,0.6)' },
      nodeMap: {
        root:      n({ id: 'root', type: 'root', children: ['hero', 'features', 'cta'] }),
        // Hero section
        hero:      n({ id: 'hero', type: 'container', parentId: 'root', children: ['hero-tag', 'hero-h', 'hero-p', 'hero-btns'], props: { layout: 'flex', direction: 'column', align: 'center', gap: '28px' }, styles: { base: { padding: '100px 24px 80px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' } } }),
        'hero-tag':n({ id: 'hero-tag', type: 'container', parentId: 'hero', children: ['hero-tag-text'], styles: { base: { display: 'inline-flex', padding: '4px 14px', borderRadius: '40px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' } } }),
        'hero-tag-text': n({ id: 'hero-tag-text', type: 'heading', parentId: 'hero-tag', props: { text: '✦ Now in public beta', level: 'span' }, styles: { base: { fontSize: '0.8rem', fontWeight: '600', color: '#10b981' } } }),
        'hero-h':  n({ id: 'hero-h', type: 'heading', parentId: 'hero', props: { text: 'Design pages at\nthe speed of thought.', level: 'h1', align: 'center' }, styles: { base: { fontSize: '4rem', fontWeight: '900', lineHeight: '1.05', letterSpacing: '-0.04em', maxWidth: '800px', color: '#f9fafb' } } }),
        'hero-p':  n({ id: 'hero-p', type: 'paragraph', parentId: 'hero', props: { text: 'Nexus Architect is the page builder built for speed. Drag, style, publish — no code required.' }, styles: { base: { fontSize: '1.2rem', maxWidth: '560px', opacity: '0.65', lineHeight: '1.75' } } }),
        'hero-btns': n({ id: 'hero-btns', type: 'container', parentId: 'hero', children: ['btn-primary', 'btn-sec'], props: { layout: 'flex', direction: 'row', gap: '12px' }, styles: { base: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' } } }),
        'btn-primary': n({ id: 'btn-primary', type: 'button', parentId: 'hero-btns', props: { label: 'Start building free', variant: 'primary' }, styles: { base: { padding: '14px 28px', borderRadius: '40px', background: '#10b981', color: '#fff', fontWeight: '700', fontSize: '0.95rem', border: 'none', cursor: 'pointer' } } }),
        'btn-sec': n({ id: 'btn-sec', type: 'button', parentId: 'hero-btns', props: { label: 'See demo →', variant: 'ghost' }, styles: { base: { padding: '14px 24px', borderRadius: '40px', background: 'rgba(255,255,255,0.06)', color: '#f9fafb', fontWeight: '600', fontSize: '0.95rem', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' } } }),
        // Features
        features:  n({ id: 'features', type: 'container', parentId: 'root', children: ['feat-h', 'feat-grid'], styles: { base: { padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '48px' } } }),
        'feat-h':  n({ id: 'feat-h', type: 'heading', parentId: 'features', props: { text: 'Everything you need', level: 'h2', align: 'center' }, styles: { base: { fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.03em' } } }),
        'feat-grid': n({ id: 'feat-grid', type: 'container', parentId: 'features', children: ['f1', 'f2', 'f3'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '20px', width: '100%', maxWidth: '900px' } } }),
        f1: n({ id: 'f1', type: 'container', parentId: 'feat-grid', children: ['f1-icon','f1-h','f1-p'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' } } }),
        'f1-icon': n({ id: 'f1-icon', type: 'heading', parentId: 'f1', props: { text: '⚡', level: 'span' }, styles: { base: { fontSize: '2rem' } } }),
        'f1-h':    n({ id: 'f1-h', type: 'heading', parentId: 'f1', props: { text: 'Blazing fast', level: 'h3' }, styles: { base: { fontSize: '1.1rem', fontWeight: '700', marginTop: '12px' } } }),
        'f1-p':    n({ id: 'f1-p', type: 'paragraph', parentId: 'f1', props: { text: 'Pages compile to pure HTML and CSS. Zero runtime overhead. Lighthouse 95+ by default.' }, styles: { base: { fontSize: '0.9rem', opacity: '0.65', lineHeight: '1.7', marginTop: '8px' } } }),
        f2: n({ id: 'f2', type: 'container', parentId: 'feat-grid', children: ['f2-icon','f2-h','f2-p'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' } } }),
        'f2-icon': n({ id: 'f2-icon', type: 'heading', parentId: 'f2', props: { text: '🎨', level: 'span' }, styles: { base: { fontSize: '2rem' } } }),
        'f2-h':    n({ id: 'f2-h', type: 'heading', parentId: 'f2', props: { text: 'Visual first', level: 'h3' }, styles: { base: { fontSize: '1.1rem', fontWeight: '700', marginTop: '12px' } } }),
        'f2-p':    n({ id: 'f2-p', type: 'paragraph', parentId: 'f2', props: { text: 'WYSIWYG editing with inline text, responsive breakpoints, and a full style inspector.' }, styles: { base: { fontSize: '0.9rem', opacity: '0.65', lineHeight: '1.7', marginTop: '8px' } } }),
        f3: n({ id: 'f3', type: 'container', parentId: 'feat-grid', children: ['f3-icon','f3-h','f3-p'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' } } }),
        'f3-icon': n({ id: 'f3-icon', type: 'heading', parentId: 'f3', props: { text: '🔌', level: 'span' }, styles: { base: { fontSize: '2rem' } } }),
        'f3-h':    n({ id: 'f3-h', type: 'heading', parentId: 'f3', props: { text: 'Extensible', level: 'h3' }, styles: { base: { fontSize: '1.1rem', fontWeight: '700', marginTop: '12px' } } }),
        'f3-p':    n({ id: 'f3-p', type: 'paragraph', parentId: 'f3', props: { text: 'Open widget API. Build or install premium addons. White-label for agency clients.' }, styles: { base: { fontSize: '0.9rem', opacity: '0.65', lineHeight: '1.7', marginTop: '8px' } } }),
        // CTA
        cta: n({ id: 'cta', type: 'container', parentId: 'root', children: ['cta-h','cta-p','cta-btn'], styles: { base: { padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', background: 'linear-gradient(135deg,rgba(16,185,129,0.08) 0%,rgba(99,102,241,0.06) 100%)', borderTop: '1px solid rgba(255,255,255,0.05)' } } }),
        'cta-h':  n({ id: 'cta-h', type: 'heading', parentId: 'cta', props: { text: 'Ready to build your best page?', level: 'h2', align: 'center' }, styles: { base: { fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.03em' } } }),
        'cta-p':  n({ id: 'cta-p', type: 'paragraph', parentId: 'cta', props: { text: 'Free forever. No credit card required.' }, styles: { base: { opacity: '0.6', fontSize: '1rem' } } }),
        'cta-btn':n({ id: 'cta-btn', type: 'button', parentId: 'cta', props: { label: 'Start for free →', variant: 'primary' }, styles: { base: { padding: '16px 36px', borderRadius: '40px', background: '#10b981', color: '#fff', fontWeight: '700', fontSize: '1rem', border: 'none', cursor: 'pointer' } } }),
      },
    },
  },
  {
    id: 'agency-portfolio', name: 'Agency Portfolio', category: 'Landing Pages',
    description: 'Professional agency hero with portfolio grid below.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['hero', 'work'] }),
        hero: n({ id: 'hero', type: 'container', parentId: 'root', children: ['hero-eyebrow','hero-h','hero-p','hero-cta'], styles: { base: { padding: '80px 40px 60px', display: 'flex', flexDirection: 'column', gap: '20px' } } }),
        'hero-eyebrow': n({ id: 'hero-eyebrow', type: 'heading', parentId: 'hero', props: { text: 'CREATIVE AGENCY', level: 'h6' }, styles: { base: { fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.15em', opacity: '0.45' } } }),
        'hero-h': n({ id: 'hero-h', type: 'heading', parentId: 'hero', props: { text: 'We make brands\npeople remember.', level: 'h1' }, styles: { base: { fontSize: '3.5rem', fontWeight: '900', lineHeight: '1.1', letterSpacing: '-0.03em', maxWidth: '640px' } } }),
        'hero-p': n({ id: 'hero-p', type: 'paragraph', parentId: 'hero', props: { text: 'Full-service digital studio specialising in brand identity, web design, and campaign strategy.' }, styles: { base: { maxWidth: '440px', opacity: '0.65', lineHeight: '1.7' } } }),
        'hero-cta': n({ id: 'hero-cta', type: 'button', parentId: 'hero', props: { label: 'View our work ↓' }, styles: { base: { alignSelf: 'flex-start', padding: '12px 24px', borderRadius: '8px', background: '#f9fafb', color: '#0a0a14', fontWeight: '700', border: 'none', cursor: 'pointer' } } }),
        work: n({ id: 'work', type: 'container', parentId: 'root', children: ['work-h','work-grid'], styles: { base: { padding: '60px 40px', display: 'flex', flexDirection: 'column', gap: '32px' } } }),
        'work-h': n({ id: 'work-h', type: 'heading', parentId: 'work', props: { text: 'Selected work', level: 'h2' }, styles: { base: { fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.02em' } } }),
        'work-grid': n({ id: 'work-grid', type: 'container', parentId: 'work', children: ['p1','p2','p3'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '16px' } } }),
        p1: n({ id: 'p1', type: 'container', parentId: 'work-grid', children: ['p1-label'], styles: { base: { height: '200px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-end', padding: '16px' } } }),
        'p1-label': n({ id: 'p1-label', type: 'heading', parentId: 'p1', props: { text: 'Brand Identity — Studio Noir', level: 'h4' }, styles: { base: { fontSize: '0.85rem', fontWeight: '600', opacity: '0.7' } } }),
        p2: n({ id: 'p2', type: 'container', parentId: 'work-grid', children: ['p2-label'], styles: { base: { height: '200px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-end', padding: '16px' } } }),
        'p2-label': n({ id: 'p2-label', type: 'heading', parentId: 'p2', props: { text: 'Web Design — Horizon SaaS', level: 'h4' }, styles: { base: { fontSize: '0.85rem', fontWeight: '600', opacity: '0.7' } } }),
        p3: n({ id: 'p3', type: 'container', parentId: 'work-grid', children: ['p3-label'], styles: { base: { height: '200px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-end', padding: '16px' } } }),
        'p3-label': n({ id: 'p3-label', type: 'heading', parentId: 'p3', props: { text: 'Campaign — Volta Drinks', level: 'h4' }, styles: { base: { fontSize: '0.85rem', fontWeight: '600', opacity: '0.7' } } }),
      },
    },
  },
  {
    id: 'landing-saas', name: 'SaaS Product', category: 'Landing Pages',
    description: 'Indigo-accented SaaS landing with nav, hero, features, and social proof.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root',
      globalStyles: { '--brand': '#6366f1', '--brand-dark': '#4f46e5' },
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['nav','hero','social-proof','features','pricing-cta'] }),
        nav: n({ id: 'nav', type: 'container', parentId: 'root', children: ['nav-logo','nav-links','nav-cta'], styles: { base: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: '0', background: 'rgba(13,13,26,0.9)', backdropFilter: 'blur(12px)', zIndex: '100' } } }),
        'nav-logo': n({ id: 'nav-logo', type: 'heading', parentId: 'nav', props: { text: '◆ Nexus', level: 'span' }, styles: { base: { fontSize: '1rem', fontWeight: '800', color: '#6366f1' } } }),
        'nav-links': n({ id: 'nav-links', type: 'container', parentId: 'nav', children: ['nl1','nl2','nl3'], styles: { base: { display: 'flex', gap: '28px' } } }),
        nl1: n({ id: 'nl1', type: 'heading', parentId: 'nav-links', props: { text: 'Features', level: 'span' }, styles: { base: { fontSize: '0.875rem', fontWeight: '500', opacity: '0.6', cursor: 'pointer' } } }),
        nl2: n({ id: 'nl2', type: 'heading', parentId: 'nav-links', props: { text: 'Pricing', level: 'span' }, styles: { base: { fontSize: '0.875rem', fontWeight: '500', opacity: '0.6', cursor: 'pointer' } } }),
        nl3: n({ id: 'nl3', type: 'heading', parentId: 'nav-links', props: { text: 'Docs', level: 'span' }, styles: { base: { fontSize: '0.875rem', fontWeight: '500', opacity: '0.6', cursor: 'pointer' } } }),
        'nav-cta': n({ id: 'nav-cta', type: 'button', parentId: 'nav', props: { label: 'Get started free', variant: 'primary' }, styles: { base: { padding: '8px 20px', borderRadius: '8px', background: '#6366f1', color: '#fff', fontWeight: '700', fontSize: '0.85rem', border: 'none', cursor: 'pointer' } } }),
        hero: n({ id: 'hero', type: 'container', parentId: 'root', children: ['hero-badge','hero-h','hero-p','hero-btns'], styles: { base: { padding: '100px 40px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '28px' } } }),
        'hero-badge': n({ id: 'hero-badge', type: 'container', parentId: 'hero', children: ['badge-text'], styles: { base: { display: 'inline-flex', padding: '4px 14px', borderRadius: '40px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' } } }),
        'badge-text': n({ id: 'badge-text', type: 'heading', parentId: 'hero-badge', props: { text: '🚀 v2.0 is here — What\'s new', level: 'span' }, styles: { base: { fontSize: '0.78rem', fontWeight: '600', color: '#818cf8' } } }),
        'hero-h': n({ id: 'hero-h', type: 'heading', parentId: 'hero', props: { text: 'The only tool your\nteam will ever need.', level: 'h1', align: 'center' }, styles: { base: { fontSize: '4.5rem', fontWeight: '900', lineHeight: '1.04', letterSpacing: '-0.04em', maxWidth: '820px', color: '#f8fafc' } } }),
        'hero-p': n({ id: 'hero-p', type: 'paragraph', parentId: 'hero', props: { text: 'Ship faster, collaborate better, and scale effortlessly. Nexus SaaS brings all your workflows into one elegant, unified platform.' }, styles: { base: { fontSize: '1.2rem', maxWidth: '580px', color: 'rgba(248,250,252,0.6)', lineHeight: '1.75' } } }),
        'hero-btns': n({ id: 'hero-btns', type: 'container', parentId: 'hero', children: ['hb1','hb2'], styles: { base: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' } } }),
        hb1: n({ id: 'hb1', type: 'button', parentId: 'hero-btns', props: { label: 'Start free trial', variant: 'primary' }, styles: { base: { padding: '14px 32px', borderRadius: '12px', background: '#6366f1', color: '#fff', fontWeight: '700', fontSize: '1rem', border: 'none', cursor: 'pointer', boxShadow: '0 0 40px rgba(99,102,241,0.3)' } } }),
        hb2: n({ id: 'hb2', type: 'button', parentId: 'hero-btns', props: { label: 'Watch demo →', variant: 'ghost' }, styles: { base: { padding: '14px 28px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#f8fafc', fontWeight: '600', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' } } }),
        'social-proof': n({ id: 'social-proof', type: 'container', parentId: 'root', children: ['sp-label','sp-logos'], styles: { base: { padding: '32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' } } }),
        'sp-label': n({ id: 'sp-label', type: 'heading', parentId: 'social-proof', props: { text: 'TRUSTED BY 2,400+ TEAMS WORLDWIDE', level: 'span', align: 'center' }, styles: { base: { fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)' } } }),
        'sp-logos': n({ id: 'sp-logos', type: 'container', parentId: 'social-proof', children: ['l1','l2','l3','l4','l5'], styles: { base: { display: 'flex', gap: '48px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' } } }),
        l1: n({ id: 'l1', type: 'heading', parentId: 'sp-logos', props: { text: 'Acme Corp', level: 'span' }, styles: { base: { fontSize: '0.95rem', fontWeight: '700', color: 'rgba(255,255,255,0.22)', letterSpacing: '-0.02em' } } }),
        l2: n({ id: 'l2', type: 'heading', parentId: 'sp-logos', props: { text: 'Meridian', level: 'span' }, styles: { base: { fontSize: '0.95rem', fontWeight: '700', color: 'rgba(255,255,255,0.22)', letterSpacing: '-0.02em' } } }),
        l3: n({ id: 'l3', type: 'heading', parentId: 'sp-logos', props: { text: 'Orbit Labs', level: 'span' }, styles: { base: { fontSize: '0.95rem', fontWeight: '700', color: 'rgba(255,255,255,0.22)', letterSpacing: '-0.02em' } } }),
        l4: n({ id: 'l4', type: 'heading', parentId: 'sp-logos', props: { text: 'Volta', level: 'span' }, styles: { base: { fontSize: '0.95rem', fontWeight: '700', color: 'rgba(255,255,255,0.22)', letterSpacing: '-0.02em' } } }),
        l5: n({ id: 'l5', type: 'heading', parentId: 'sp-logos', props: { text: 'Stellar.io', level: 'span' }, styles: { base: { fontSize: '0.95rem', fontWeight: '700', color: 'rgba(255,255,255,0.22)', letterSpacing: '-0.02em' } } }),
        features: n({ id: 'features', type: 'container', parentId: 'root', children: ['f-h','f-sub','f-grid'], styles: { base: { padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '48px' } } }),
        'f-h': n({ id: 'f-h', type: 'heading', parentId: 'features', props: { text: 'Built for how you actually work', level: 'h2', align: 'center' }, styles: { base: { fontSize: '2.8rem', fontWeight: '800', letterSpacing: '-0.03em', maxWidth: '600px' } } }),
        'f-sub': n({ id: 'f-sub', type: 'paragraph', parentId: 'features', props: { text: 'Every feature designed to reduce friction, amplify focus, and let you ship with confidence.' }, styles: { base: { fontSize: '1.1rem', color: 'rgba(255,255,255,0.55)', maxWidth: '500px', lineHeight: '1.7', textAlign: 'center' } } }),
        'f-grid': n({ id: 'f-grid', type: 'container', parentId: 'features', children: ['fa','fb','fc'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '20px', width: '100%', maxWidth: '900px' } } }),
        fa: n({ id: 'fa', type: 'container', parentId: 'f-grid', children: ['fa-i','fa-h','fa-p'], styles: { base: { padding: '32px', borderRadius: '20px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', flexDirection: 'column', gap: '12px' } } }),
        'fa-i': n({ id: 'fa-i', type: 'heading', parentId: 'fa', props: { text: '⚡', level: 'span' }, styles: { base: { fontSize: '2rem' } } }),
        'fa-h': n({ id: 'fa-h', type: 'heading', parentId: 'fa', props: { text: 'Lightning fast', level: 'h3' }, styles: { base: { fontSize: '1.1rem', fontWeight: '700' } } }),
        'fa-p': n({ id: 'fa-p', type: 'paragraph', parentId: 'fa', props: { text: 'Real-time collaboration with zero lag. Your team sees changes as they happen.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.7' } } }),
        fb: n({ id: 'fb', type: 'container', parentId: 'f-grid', children: ['fb-i','fb-h','fb-p'], styles: { base: { padding: '32px', borderRadius: '20px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', flexDirection: 'column', gap: '12px' } } }),
        'fb-i': n({ id: 'fb-i', type: 'heading', parentId: 'fb', props: { text: '🔐', level: 'span' }, styles: { base: { fontSize: '2rem' } } }),
        'fb-h': n({ id: 'fb-h', type: 'heading', parentId: 'fb', props: { text: 'Enterprise security', level: 'h3' }, styles: { base: { fontSize: '1.1rem', fontWeight: '700' } } }),
        'fb-p': n({ id: 'fb-p', type: 'paragraph', parentId: 'fb', props: { text: 'SOC 2 Type II, GDPR compliant. SSO, audit logs, and role-based permissions.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.7' } } }),
        fc: n({ id: 'fc', type: 'container', parentId: 'f-grid', children: ['fc-i','fc-h','fc-p'], styles: { base: { padding: '32px', borderRadius: '20px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', flexDirection: 'column', gap: '12px' } } }),
        'fc-i': n({ id: 'fc-i', type: 'heading', parentId: 'fc', props: { text: '📊', level: 'span' }, styles: { base: { fontSize: '2rem' } } }),
        'fc-h': n({ id: 'fc-h', type: 'heading', parentId: 'fc', props: { text: 'Powerful analytics', level: 'h3' }, styles: { base: { fontSize: '1.1rem', fontWeight: '700' } } }),
        'fc-p': n({ id: 'fc-p', type: 'paragraph', parentId: 'fc', props: { text: 'Deep insights into every interaction. Custom dashboards in minutes.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.7' } } }),
        'pricing-cta': n({ id: 'pricing-cta', type: 'container', parentId: 'root', children: ['pc-h','pc-p','pc-btn'], styles: { base: { padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(168,85,247,0.08))', borderTop: '1px solid rgba(99,102,241,0.15)' } } }),
        'pc-h': n({ id: 'pc-h', type: 'heading', parentId: 'pricing-cta', props: { text: 'Start free. Scale confidently.', level: 'h2', align: 'center' }, styles: { base: { fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.03em' } } }),
        'pc-p': n({ id: 'pc-p', type: 'paragraph', parentId: 'pricing-cta', props: { text: 'No credit card required. Free forever for small teams.' }, styles: { base: { color: 'rgba(255,255,255,0.5)', fontSize: '1rem' } } }),
        'pc-btn': n({ id: 'pc-btn', type: 'button', parentId: 'pricing-cta', props: { label: 'Start your free trial →' }, styles: { base: { padding: '16px 40px', borderRadius: '12px', background: '#6366f1', color: '#fff', fontWeight: '700', fontSize: '1.05rem', border: 'none', cursor: 'pointer', boxShadow: '0 0 40px rgba(99,102,241,0.35)' } } }),
      },
    },
  },
  {
    id: 'landing-startup', name: 'Startup Bold', category: 'Landing Pages',
    description: 'Amber-accented bold startup page with metrics, features, and newsletter CTA.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root',
      globalStyles: { '--brand': '#f59e0b', '--brand-dark': '#d97706' },
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['nav','hero','metrics','features','newsletter'] }),
        nav: n({ id: 'nav', type: 'container', parentId: 'root', children: ['logo','nav-cta'], styles: { base: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderBottom: '1px solid rgba(245,158,11,0.1)' } } }),
        logo: n({ id: 'logo', type: 'heading', parentId: 'nav', props: { text: '⚡ Launchpad', level: 'span' }, styles: { base: { fontSize: '1.1rem', fontWeight: '900', color: '#f59e0b', letterSpacing: '-0.02em' } } }),
        'nav-cta': n({ id: 'nav-cta', type: 'button', parentId: 'nav', props: { label: 'Join waitlist' }, styles: { base: { padding: '8px 20px', borderRadius: '8px', background: '#f59e0b', color: '#000', fontWeight: '700', fontSize: '0.85rem', border: 'none', cursor: 'pointer' } } }),
        hero: n({ id: 'hero', type: 'container', parentId: 'root', children: ['hero-label','hero-h','hero-p','hero-btns','hero-social'], styles: { base: { padding: '100px 40px 80px', display: 'flex', flexDirection: 'column', gap: '28px' } } }),
        'hero-label': n({ id: 'hero-label', type: 'heading', parentId: 'hero', props: { text: '🏆 YC W24 — #1 Product of the Day', level: 'span' }, styles: { base: { fontSize: '0.8rem', fontWeight: '700', color: '#f59e0b', letterSpacing: '0.04em' } } }),
        'hero-h': n({ id: 'hero-h', type: 'heading', parentId: 'hero', props: { text: 'Build your startup\nin days, not months.', level: 'h1' }, styles: { base: { fontSize: '4.5rem', fontWeight: '900', lineHeight: '1.04', letterSpacing: '-0.04em', maxWidth: '760px', color: '#fff' } } }),
        'hero-p': n({ id: 'hero-p', type: 'paragraph', parentId: 'hero', props: { text: 'From idea to shipped product in record time. Launchpad gives your startup the unfair advantage it deserves.' }, styles: { base: { fontSize: '1.2rem', maxWidth: '560px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.75' } } }),
        'hero-btns': n({ id: 'hero-btns', type: 'container', parentId: 'hero', children: ['hb1','hb2'], styles: { base: { display: 'flex', gap: '12px', flexWrap: 'wrap' } } }),
        hb1: n({ id: 'hb1', type: 'button', parentId: 'hero-btns', props: { label: 'Get early access' }, styles: { base: { padding: '14px 32px', borderRadius: '12px', background: '#f59e0b', color: '#000', fontWeight: '800', fontSize: '1rem', border: 'none', cursor: 'pointer' } } }),
        hb2: n({ id: 'hb2', type: 'button', parentId: 'hero-btns', props: { label: 'See it in action →' }, styles: { base: { padding: '14px 28px', borderRadius: '12px', background: 'transparent', color: '#fff', fontWeight: '600', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' } } }),
        'hero-social': n({ id: 'hero-social', type: 'heading', parentId: 'hero', props: { text: '★★★★★  4.9/5 from 1,200+ builders', level: 'span' }, styles: { base: { fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginTop: '8px' } } }),
        metrics: n({ id: 'metrics', type: 'container', parentId: 'root', children: ['m1','m2','m3'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1px', background: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' } } }),
        m1: n({ id: 'm1', type: 'container', parentId: 'metrics', children: ['m1-n','m1-l'], styles: { base: { padding: '40px 32px', background: '#080810', display: 'flex', flexDirection: 'column', gap: '8px' } } }),
        'm1-n': n({ id: 'm1-n', type: 'heading', parentId: 'm1', props: { text: '10,000+', level: 'h3' }, styles: { base: { fontSize: '2.5rem', fontWeight: '900', color: '#f59e0b', letterSpacing: '-0.03em' } } }),
        'm1-l': n({ id: 'm1-l', type: 'paragraph', parentId: 'm1', props: { text: 'Founders on the platform' }, styles: { base: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' } } }),
        m2: n({ id: 'm2', type: 'container', parentId: 'metrics', children: ['m2-n','m2-l'], styles: { base: { padding: '40px 32px', background: '#080810', display: 'flex', flexDirection: 'column', gap: '8px' } } }),
        'm2-n': n({ id: 'm2-n', type: 'heading', parentId: 'm2', props: { text: '$4.2M', level: 'h3' }, styles: { base: { fontSize: '2.5rem', fontWeight: '900', color: '#f59e0b', letterSpacing: '-0.03em' } } }),
        'm2-l': n({ id: 'm2-l', type: 'paragraph', parentId: 'm2', props: { text: 'Raised by our users in 2025' }, styles: { base: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' } } }),
        m3: n({ id: 'm3', type: 'container', parentId: 'metrics', children: ['m3-n','m3-l'], styles: { base: { padding: '40px 32px', background: '#080810', display: 'flex', flexDirection: 'column', gap: '8px' } } }),
        'm3-n': n({ id: 'm3-n', type: 'heading', parentId: 'm3', props: { text: '6 days', level: 'h3' }, styles: { base: { fontSize: '2.5rem', fontWeight: '900', color: '#f59e0b', letterSpacing: '-0.03em' } } }),
        'm3-l': n({ id: 'm3-l', type: 'paragraph', parentId: 'm3', props: { text: 'Average time to first revenue' }, styles: { base: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' } } }),
        features: n({ id: 'features', type: 'container', parentId: 'root', children: ['feat-h','feat-grid'], styles: { base: { padding: '80px 40px', display: 'flex', flexDirection: 'column', gap: '48px' } } }),
        'feat-h': n({ id: 'feat-h', type: 'heading', parentId: 'features', props: { text: 'Everything you need\nto ship fast', level: 'h2' }, styles: { base: { fontSize: '3rem', fontWeight: '900', letterSpacing: '-0.04em', maxWidth: '500px' } } }),
        'feat-grid': n({ id: 'feat-grid', type: 'container', parentId: 'features', children: ['fg1','fg2','fg3','fg4'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '16px' } } }),
        fg1: n({ id: 'fg1', type: 'container', parentId: 'feat-grid', children: ['fg1-e','fg1-h','fg1-p'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(245,158,11,0.12)', background: 'rgba(245,158,11,0.04)' } } }),
        'fg1-e': n({ id: 'fg1-e', type: 'heading', parentId: 'fg1', props: { text: '🎯', level: 'span' }, styles: { base: { fontSize: '1.75rem' } } }),
        'fg1-h': n({ id: 'fg1-h', type: 'heading', parentId: 'fg1', props: { text: 'Idea to MVP', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '700', marginTop: '12px' } } }),
        'fg1-p': n({ id: 'fg1-p', type: 'paragraph', parentId: 'fg1', props: { text: 'Pre-built templates for every startup vertical. Launch in hours.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: '1.65' } } }),
        fg2: n({ id: 'fg2', type: 'container', parentId: 'feat-grid', children: ['fg2-e','fg2-h','fg2-p'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(245,158,11,0.12)', background: 'rgba(245,158,11,0.04)' } } }),
        'fg2-e': n({ id: 'fg2-e', type: 'heading', parentId: 'fg2', props: { text: '💸', level: 'span' }, styles: { base: { fontSize: '1.75rem' } } }),
        'fg2-h': n({ id: 'fg2-h', type: 'heading', parentId: 'fg2', props: { text: 'Payments ready', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '700', marginTop: '12px' } } }),
        'fg2-p': n({ id: 'fg2-p', type: 'paragraph', parentId: 'fg2', props: { text: 'Stripe, Lemonsqueezy, Paddle — integrated in one click.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: '1.65' } } }),
        fg3: n({ id: 'fg3', type: 'container', parentId: 'feat-grid', children: ['fg3-e','fg3-h','fg3-p'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(245,158,11,0.12)', background: 'rgba(245,158,11,0.04)' } } }),
        'fg3-e': n({ id: 'fg3-e', type: 'heading', parentId: 'fg3', props: { text: '📈', level: 'span' }, styles: { base: { fontSize: '1.75rem' } } }),
        'fg3-h': n({ id: 'fg3-h', type: 'heading', parentId: 'fg3', props: { text: 'Growth analytics', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '700', marginTop: '12px' } } }),
        'fg3-p': n({ id: 'fg3-p', type: 'paragraph', parentId: 'fg3', props: { text: 'Track MRR, churn, NPS from day one. No data engineering needed.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: '1.65' } } }),
        fg4: n({ id: 'fg4', type: 'container', parentId: 'feat-grid', children: ['fg4-e','fg4-h','fg4-p'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(245,158,11,0.12)', background: 'rgba(245,158,11,0.04)' } } }),
        'fg4-e': n({ id: 'fg4-e', type: 'heading', parentId: 'fg4', props: { text: '🤝', level: 'span' }, styles: { base: { fontSize: '1.75rem' } } }),
        'fg4-h': n({ id: 'fg4-h', type: 'heading', parentId: 'fg4', props: { text: 'Investor ready', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '700', marginTop: '12px' } } }),
        'fg4-p': n({ id: 'fg4-p', type: 'paragraph', parentId: 'fg4', props: { text: 'Auto-generate pitch decks, cap tables, and investor updates.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: '1.65' } } }),
        newsletter: n({ id: 'newsletter', type: 'container', parentId: 'root', children: ['nl-h','nl-p','nl-btn'], styles: { base: { padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', background: 'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(239,68,68,0.05))' } } }),
        'nl-h': n({ id: 'nl-h', type: 'heading', parentId: 'newsletter', props: { text: 'Join 10,000 builders.', level: 'h2', align: 'center' }, styles: { base: { fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.04em' } } }),
        'nl-p': n({ id: 'nl-p', type: 'paragraph', parentId: 'newsletter', props: { text: 'Weekly startup tactics, template drops, and early access to new features.' }, styles: { base: { color: 'rgba(255,255,255,0.5)', maxWidth: '420px' } } }),
        'nl-btn': n({ id: 'nl-btn', type: 'button', parentId: 'newsletter', props: { label: 'Get early access — it\'s free' }, styles: { base: { padding: '16px 40px', borderRadius: '12px', background: '#f59e0b', color: '#000', fontWeight: '800', fontSize: '1rem', border: 'none', cursor: 'pointer' } } }),
      },
    },
  },
  {
    id: 'landing-mobile-app', name: 'Mobile App', category: 'Landing Pages',
    description: 'Blue-violet gradient landing for mobile apps with phone mockup and download CTAs.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root',
      globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['nav','hero','features','download'] }),
        nav: n({ id: 'nav', type: 'container', parentId: 'root', children: ['nav-logo','nav-links','nav-dl'], styles: { base: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderBottom: '1px solid rgba(59,130,246,0.1)' } } }),
        'nav-logo': n({ id: 'nav-logo', type: 'heading', parentId: 'nav', props: { text: '◉ AppName', level: 'span' }, styles: { base: { fontSize: '1.1rem', fontWeight: '900', background: 'linear-gradient(135deg,#3b82f6,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } } }),
        'nav-links': n({ id: 'nav-links', type: 'container', parentId: 'nav', children: ['nl1','nl2','nl3'], styles: { base: { display: 'flex', gap: '28px' } } }),
        nl1: n({ id: 'nl1', type: 'heading', parentId: 'nav-links', props: { text: 'Features', level: 'span' }, styles: { base: { fontSize: '0.875rem', fontWeight: '500', opacity: '0.55', cursor: 'pointer' } } }),
        nl2: n({ id: 'nl2', type: 'heading', parentId: 'nav-links', props: { text: 'Reviews', level: 'span' }, styles: { base: { fontSize: '0.875rem', fontWeight: '500', opacity: '0.55', cursor: 'pointer' } } }),
        nl3: n({ id: 'nl3', type: 'heading', parentId: 'nav-links', props: { text: 'Blog', level: 'span' }, styles: { base: { fontSize: '0.875rem', fontWeight: '500', opacity: '0.55', cursor: 'pointer' } } }),
        'nav-dl': n({ id: 'nav-dl', type: 'button', parentId: 'nav', props: { label: 'Download free' }, styles: { base: { padding: '8px 20px', borderRadius: '8px', background: 'linear-gradient(135deg,#3b82f6,#7c3aed)', color: '#fff', fontWeight: '700', fontSize: '0.85rem', border: 'none', cursor: 'pointer' } } }),
        hero: n({ id: 'hero', type: 'container', parentId: 'root', children: ['hero-text','hero-phone'], styles: { base: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', padding: '80px 40px', alignItems: 'center', minHeight: '80vh' } } }),
        'hero-text': n({ id: 'hero-text', type: 'container', parentId: 'hero', children: ['ht-badge','ht-h','ht-p','ht-btns','ht-ratings'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '24px' } } }),
        'ht-badge': n({ id: 'ht-badge', type: 'heading', parentId: 'hero-text', props: { text: '🏆 App of the Year 2025', level: 'span' }, styles: { base: { fontSize: '0.78rem', fontWeight: '700', color: '#3b82f6', background: 'rgba(59,130,246,0.08)', padding: '4px 14px', borderRadius: '40px', border: '1px solid rgba(59,130,246,0.2)', display: 'inline-block', width: 'fit-content' } } }),
        'ht-h': n({ id: 'ht-h', type: 'heading', parentId: 'hero-text', props: { text: 'The app that\nchanges everything.', level: 'h1' }, styles: { base: { fontSize: '3.5rem', fontWeight: '900', lineHeight: '1.08', letterSpacing: '-0.04em' } } }),
        'ht-p': n({ id: 'ht-p', type: 'paragraph', parentId: 'hero-text', props: { text: 'Join over 5 million people who have transformed how they work, create, and connect — right from their pocket.' }, styles: { base: { fontSize: '1.1rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.75', maxWidth: '440px' } } }),
        'ht-btns': n({ id: 'ht-btns', type: 'container', parentId: 'hero-text', children: ['app-store','play-store'], styles: { base: { display: 'flex', gap: '12px', flexWrap: 'wrap' } } }),
        'app-store': n({ id: 'app-store', type: 'button', parentId: 'ht-btns', props: { label: '🍎 App Store' }, styles: { base: { padding: '12px 24px', borderRadius: '12px', background: '#fff', color: '#000', fontWeight: '700', fontSize: '0.9rem', border: 'none', cursor: 'pointer' } } }),
        'play-store': n({ id: 'play-store', type: 'button', parentId: 'ht-btns', props: { label: '▶ Google Play' }, styles: { base: { padding: '12px 24px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: '700', fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' } } }),
        'ht-ratings': n({ id: 'ht-ratings', type: 'heading', parentId: 'hero-text', props: { text: '★ 4.9 · 5M+ downloads · Editor\'s Choice', level: 'span' }, styles: { base: { fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' } } }),
        'hero-phone': n({ id: 'hero-phone', type: 'container', parentId: 'hero', children: ['phone-inner'], styles: { base: { width: '260px', height: '480px', borderRadius: '36px', background: 'linear-gradient(160deg,#0d1a30,#080318)', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(99,102,241,0.25), 0 0 0 1px rgba(255,255,255,0.05)', overflow: 'hidden', justifySelf: 'center' } } }),
        'phone-inner': n({ id: 'phone-inner', type: 'container', parentId: 'hero-phone', children: ['pi-bar','pi-card1','pi-card2','pi-btn'], styles: { base: { padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' } } }),
        'pi-bar': n({ id: 'pi-bar', type: 'container', parentId: 'phone-inner', children: ['pi-bar-text'], styles: { base: { padding: '10px 12px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' } } }),
        'pi-bar-text': n({ id: 'pi-bar-text', type: 'heading', parentId: 'pi-bar', props: { text: 'Dashboard', level: 'span' }, styles: { base: { fontSize: '0.85rem', fontWeight: '700', color: '#3b82f6' } } }),
        'pi-card1': n({ id: 'pi-card1', type: 'container', parentId: 'phone-inner', children: ['pic1-h','pic1-v'], styles: { base: { padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(124,58,237,0.2))', border: '1px solid rgba(59,130,246,0.2)' } } }),
        'pic1-h': n({ id: 'pic1-h', type: 'heading', parentId: 'pi-card1', props: { text: 'Total Revenue', level: 'span' }, styles: { base: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' } } }),
        'pic1-v': n({ id: 'pic1-v', type: 'heading', parentId: 'pi-card1', props: { text: '$24,891', level: 'span' }, styles: { base: { fontSize: '1.5rem', fontWeight: '900', color: '#fff', marginTop: '6px', display: 'block' } } }),
        'pi-card2': n({ id: 'pi-card2', type: 'container', parentId: 'phone-inner', children: ['pic2-h','pic2-v'], styles: { base: { padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' } } }),
        'pic2-h': n({ id: 'pic2-h', type: 'heading', parentId: 'pi-card2', props: { text: 'Active Users', level: 'span' }, styles: { base: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' } } }),
        'pic2-v': n({ id: 'pic2-v', type: 'heading', parentId: 'pi-card2', props: { text: '1,204 ↑12%', level: 'span' }, styles: { base: { fontSize: '1.2rem', fontWeight: '800', color: '#10b981', marginTop: '6px', display: 'block' } } }),
        'pi-btn': n({ id: 'pi-btn', type: 'button', parentId: 'phone-inner', props: { label: 'View Full Report →' }, styles: { base: { padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg,#3b82f6,#7c3aed)', color: '#fff', fontWeight: '700', fontSize: '0.78rem', border: 'none', cursor: 'pointer', marginTop: 'auto' } } }),
        features: n({ id: 'features', type: 'container', parentId: 'root', children: ['f-h','f-grid'], styles: { base: { padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '48px' } } }),
        'f-h': n({ id: 'f-h', type: 'heading', parentId: 'features', props: { text: 'Why 5 million people choose us', level: 'h2', align: 'center' }, styles: { base: { fontSize: '2.8rem', fontWeight: '800', letterSpacing: '-0.03em' } } }),
        'f-grid': n({ id: 'f-grid', type: 'container', parentId: 'features', children: ['fa','fb','fc'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '20px', width: '100%', maxWidth: '900px' } } }),
        fa: n({ id: 'fa', type: 'container', parentId: 'f-grid', children: ['fa-i','fa-h','fa-p'], styles: { base: { padding: '28px', borderRadius: '18px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)' } } }),
        'fa-i': n({ id: 'fa-i', type: 'heading', parentId: 'fa', props: { text: '🔒', level: 'span' }, styles: { base: { fontSize: '1.8rem' } } }),
        'fa-h': n({ id: 'fa-h', type: 'heading', parentId: 'fa', props: { text: 'Private & secure', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '700', marginTop: '12px' } } }),
        'fa-p': n({ id: 'fa-p', type: 'paragraph', parentId: 'fa', props: { text: 'End-to-end encryption. Your data never leaves your device.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: '1.65' } } }),
        fb: n({ id: 'fb', type: 'container', parentId: 'f-grid', children: ['fb-i','fb-h','fb-p'], styles: { base: { padding: '28px', borderRadius: '18px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)' } } }),
        'fb-i': n({ id: 'fb-i', type: 'heading', parentId: 'fb', props: { text: '⚡', level: 'span' }, styles: { base: { fontSize: '1.8rem' } } }),
        'fb-h': n({ id: 'fb-h', type: 'heading', parentId: 'fb', props: { text: 'Instant sync', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '700', marginTop: '12px' } } }),
        'fb-p': n({ id: 'fb-p', type: 'paragraph', parentId: 'fb', props: { text: 'Works on iOS, Android, and web. Always in sync.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: '1.65' } } }),
        fc: n({ id: 'fc', type: 'container', parentId: 'f-grid', children: ['fc-i','fc-h','fc-p'], styles: { base: { padding: '28px', borderRadius: '18px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)' } } }),
        'fc-i': n({ id: 'fc-i', type: 'heading', parentId: 'fc', props: { text: '🎨', level: 'span' }, styles: { base: { fontSize: '1.8rem' } } }),
        'fc-h': n({ id: 'fc-h', type: 'heading', parentId: 'fc', props: { text: 'Beautiful design', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '700', marginTop: '12px' } } }),
        'fc-p': n({ id: 'fc-p', type: 'paragraph', parentId: 'fc', props: { text: 'Dark mode, custom themes, and accessibility built in.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: '1.65' } } }),
        download: n({ id: 'download', type: 'container', parentId: 'root', children: ['dl-h','dl-p','dl-btns'], styles: { base: { padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center', background: 'linear-gradient(135deg,rgba(59,130,246,0.1),rgba(124,58,237,0.08))' } } }),
        'dl-h': n({ id: 'dl-h', type: 'heading', parentId: 'download', props: { text: 'Download free today.', level: 'h2', align: 'center' }, styles: { base: { fontSize: '2.8rem', fontWeight: '900', letterSpacing: '-0.03em' } } }),
        'dl-p': n({ id: 'dl-p', type: 'paragraph', parentId: 'download', props: { text: 'Available on iOS and Android. No account required to start.' }, styles: { base: { color: 'rgba(255,255,255,0.5)', fontSize: '1rem' } } }),
        'dl-btns': n({ id: 'dl-btns', type: 'container', parentId: 'download', children: ['dl-ios','dl-and'], styles: { base: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' } } }),
        'dl-ios': n({ id: 'dl-ios', type: 'button', parentId: 'dl-btns', props: { label: '🍎 Download on App Store' }, styles: { base: { padding: '14px 28px', borderRadius: '12px', background: '#fff', color: '#000', fontWeight: '700', fontSize: '0.95rem', border: 'none', cursor: 'pointer' } } }),
        'dl-and': n({ id: 'dl-and', type: 'button', parentId: 'dl-btns', props: { label: '▶ Get on Google Play' }, styles: { base: { padding: '14px 28px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: '700', fontSize: '0.95rem', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' } } }),
      },
    },
  },
  {
    id: 'landing-ecommerce', name: 'E-Commerce', category: 'Landing Pages',
    description: 'Warm-toned product launch page with hero, featured product, and benefits.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['nav','hero','product-feature','benefits','newsletter'] }),
        nav: n({ id: 'nav', type: 'container', parentId: 'root', children: ['nav-logo','nav-links','nav-icons'], styles: { base: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderBottom: '1px solid rgba(249,115,22,0.08)' } } }),
        'nav-logo': n({ id: 'nav-logo', type: 'heading', parentId: 'nav', props: { text: '◈ Ember Store', level: 'span' }, styles: { base: { fontSize: '1.1rem', fontWeight: '900', color: '#f97316' } } }),
        'nav-links': n({ id: 'nav-links', type: 'container', parentId: 'nav', children: ['nl1','nl2','nl3','nl4'], styles: { base: { display: 'flex', gap: '28px' } } }),
        nl1: n({ id: 'nl1', type: 'heading', parentId: 'nav-links', props: { text: 'Shop', level: 'span' }, styles: { base: { fontSize: '0.875rem', fontWeight: '500', opacity: '0.6', cursor: 'pointer' } } }),
        nl2: n({ id: 'nl2', type: 'heading', parentId: 'nav-links', props: { text: 'Collections', level: 'span' }, styles: { base: { fontSize: '0.875rem', fontWeight: '500', opacity: '0.6', cursor: 'pointer' } } }),
        nl3: n({ id: 'nl3', type: 'heading', parentId: 'nav-links', props: { text: 'About', level: 'span' }, styles: { base: { fontSize: '0.875rem', fontWeight: '500', opacity: '0.6', cursor: 'pointer' } } }),
        nl4: n({ id: 'nl4', type: 'heading', parentId: 'nav-links', props: { text: 'Blog', level: 'span' }, styles: { base: { fontSize: '0.875rem', fontWeight: '500', opacity: '0.6', cursor: 'pointer' } } }),
        'nav-icons': n({ id: 'nav-icons', type: 'button', parentId: 'nav', props: { label: '🛒 Cart (3)' }, styles: { base: { padding: '8px 16px', borderRadius: '8px', background: 'rgba(249,115,22,0.1)', color: '#f97316', fontWeight: '700', fontSize: '0.85rem', border: '1px solid rgba(249,115,22,0.2)', cursor: 'pointer' } } }),
        hero: n({ id: 'hero', type: 'container', parentId: 'root', children: ['hero-sale','hero-h','hero-p','hero-btns','hero-trust'], styles: { base: { padding: '80px 40px 60px', display: 'flex', flexDirection: 'column', gap: '24px' } } }),
        'hero-sale': n({ id: 'hero-sale', type: 'heading', parentId: 'hero', props: { text: '🔥 LIMITED TIME — 30% OFF EVERYTHING', level: 'span' }, styles: { base: { fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.08em', color: '#f97316', background: 'rgba(249,115,22,0.08)', padding: '4px 14px', borderRadius: '6px', border: '1px solid rgba(249,115,22,0.2)', display: 'inline-block', width: 'fit-content' } } }),
        'hero-h': n({ id: 'hero-h', type: 'heading', parentId: 'hero', props: { text: 'Designed for the\nway you live.', level: 'h1' }, styles: { base: { fontSize: '4.5rem', fontWeight: '900', lineHeight: '1.04', letterSpacing: '-0.04em', maxWidth: '680px' } } }),
        'hero-p': n({ id: 'hero-p', type: 'paragraph', parentId: 'hero', props: { text: 'Premium quality goods crafted for modern living. Every product is designed to last, made to impress.' }, styles: { base: { fontSize: '1.15rem', maxWidth: '520px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.75' } } }),
        'hero-btns': n({ id: 'hero-btns', type: 'container', parentId: 'hero', children: ['hb1','hb2'], styles: { base: { display: 'flex', gap: '12px', flexWrap: 'wrap' } } }),
        hb1: n({ id: 'hb1', type: 'button', parentId: 'hero-btns', props: { label: 'Shop the sale →' }, styles: { base: { padding: '14px 32px', borderRadius: '12px', background: '#f97316', color: '#fff', fontWeight: '800', fontSize: '1rem', border: 'none', cursor: 'pointer' } } }),
        hb2: n({ id: 'hb2', type: 'button', parentId: 'hero-btns', props: { label: 'View lookbook' }, styles: { base: { padding: '14px 28px', borderRadius: '12px', background: 'transparent', color: '#fff', fontWeight: '600', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' } } }),
        'hero-trust': n({ id: 'hero-trust', type: 'heading', parentId: 'hero', props: { text: 'Free shipping on orders $50+ · 30-day returns · Carbon neutral', level: 'span' }, styles: { base: { fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' } } }),
        'product-feature': n({ id: 'product-feature', type: 'container', parentId: 'root', children: ['pf-img','pf-info'], styles: { base: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', padding: '80px 40px', alignItems: 'center', borderTop: '1px solid rgba(249,115,22,0.08)' } } }),
        'pf-img': n({ id: 'pf-img', type: 'container', parentId: 'product-feature', children: ['pf-badge'], styles: { base: { minHeight: '360px', borderRadius: '24px', background: 'linear-gradient(135deg,rgba(249,115,22,0.12),rgba(239,68,68,0.08))', border: '1px solid rgba(249,115,22,0.12)', display: 'flex', alignItems: 'flex-start', padding: '16px', position: 'relative' } } }),
        'pf-badge': n({ id: 'pf-badge', type: 'heading', parentId: 'pf-img', props: { text: 'BESTSELLER', level: 'span' }, styles: { base: { fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.1em', color: '#f97316', background: 'rgba(249,115,22,0.12)', padding: '4px 12px', borderRadius: '40px', border: '1px solid rgba(249,115,22,0.25)' } } }),
        'pf-info': n({ id: 'pf-info', type: 'container', parentId: 'product-feature', children: ['pi-cat','pi-h','pi-price','pi-desc','pi-reviews','pi-btn'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '20px' } } }),
        'pi-cat': n({ id: 'pi-cat', type: 'heading', parentId: 'pf-info', props: { text: 'LIFESTYLE COLLECTION', level: 'span' }, styles: { base: { fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.14em', color: '#f97316' } } }),
        'pi-h': n({ id: 'pi-h', type: 'heading', parentId: 'pf-info', props: { text: 'The Heritage Leather Tote', level: 'h2' }, styles: { base: { fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-0.03em', lineHeight: '1.15' } } }),
        'pi-price': n({ id: 'pi-price', type: 'container', parentId: 'pf-info', children: ['pi-sale','pi-orig'], styles: { base: { display: 'flex', gap: '12px', alignItems: 'center' } } }),
        'pi-sale': n({ id: 'pi-sale', type: 'heading', parentId: 'pi-price', props: { text: '$139', level: 'span' }, styles: { base: { fontSize: '2rem', fontWeight: '900', color: '#f97316' } } }),
        'pi-orig': n({ id: 'pi-orig', type: 'heading', parentId: 'pi-price', props: { text: '$199', level: 'span' }, styles: { base: { fontSize: '1.2rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' } } }),
        'pi-desc': n({ id: 'pi-desc', type: 'paragraph', parentId: 'pf-info', props: { text: 'Full-grain vegetable-tanned leather. Handcrafted in Italy. Designed to age beautifully over decades of daily use.' }, styles: { base: { color: 'rgba(255,255,255,0.55)', lineHeight: '1.7' } } }),
        'pi-reviews': n({ id: 'pi-reviews', type: 'heading', parentId: 'pf-info', props: { text: '★★★★★  4.9 (312 reviews) · Ships in 2 days', level: 'span' }, styles: { base: { fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' } } }),
        'pi-btn': n({ id: 'pi-btn', type: 'button', parentId: 'pf-info', props: { label: 'Add to cart — $139' }, styles: { base: { padding: '16px 36px', borderRadius: '12px', background: '#f97316', color: '#fff', fontWeight: '800', fontSize: '1rem', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' } } }),
        benefits: n({ id: 'benefits', type: 'container', parentId: 'root', children: ['ben-h','ben-grid'], styles: { base: { padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '48px', borderTop: '1px solid rgba(255,255,255,0.05)' } } }),
        'ben-h': n({ id: 'ben-h', type: 'heading', parentId: 'benefits', props: { text: 'Why customers love us', level: 'h2', align: 'center' }, styles: { base: { fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.03em' } } }),
        'ben-grid': n({ id: 'ben-grid', type: 'container', parentId: 'benefits', children: ['b1','b2','b3'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '20px', width: '100%', maxWidth: '900px' } } }),
        b1: n({ id: 'b1', type: 'container', parentId: 'ben-grid', children: ['b1-i','b1-h','b1-p'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' } } }),
        'b1-i': n({ id: 'b1-i', type: 'heading', parentId: 'b1', props: { text: '🌍', level: 'span' }, styles: { base: { fontSize: '2rem' } } }),
        'b1-h': n({ id: 'b1-h', type: 'heading', parentId: 'b1', props: { text: 'Sustainable materials', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '700', marginTop: '12px' } } }),
        'b1-p': n({ id: 'b1-p', type: 'paragraph', parentId: 'b1', props: { text: 'Every product uses responsibly sourced, eco-certified materials.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: '1.65' } } }),
        b2: n({ id: 'b2', type: 'container', parentId: 'ben-grid', children: ['b2-i','b2-h','b2-p'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' } } }),
        'b2-i': n({ id: 'b2-i', type: 'heading', parentId: 'b2', props: { text: '🔄', level: 'span' }, styles: { base: { fontSize: '2rem' } } }),
        'b2-h': n({ id: 'b2-h', type: 'heading', parentId: 'b2', props: { text: '30-day returns', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '700', marginTop: '12px' } } }),
        'b2-p': n({ id: 'b2-p', type: 'paragraph', parentId: 'b2', props: { text: 'Not happy? Ship it back within 30 days for a full refund, no questions.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: '1.65' } } }),
        b3: n({ id: 'b3', type: 'container', parentId: 'ben-grid', children: ['b3-i','b3-h','b3-p'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' } } }),
        'b3-i': n({ id: 'b3-i', type: 'heading', parentId: 'b3', props: { text: '✈️', level: 'span' }, styles: { base: { fontSize: '2rem' } } }),
        'b3-h': n({ id: 'b3-h', type: 'heading', parentId: 'b3', props: { text: 'Free global shipping', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '700', marginTop: '12px' } } }),
        'b3-p': n({ id: 'b3-p', type: 'paragraph', parentId: 'b3', props: { text: 'Free tracked shipping to 180+ countries. Delivered in 3–5 business days.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: '1.65' } } }),
        newsletter: n({ id: 'newsletter', type: 'container', parentId: 'root', children: ['ne-h','ne-p','ne-btn'], styles: { base: { padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', background: 'rgba(249,115,22,0.04)', borderTop: '1px solid rgba(249,115,22,0.08)' } } }),
        'ne-h': n({ id: 'ne-h', type: 'heading', parentId: 'newsletter', props: { text: 'Get 15% off your first order', level: 'h2', align: 'center' }, styles: { base: { fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.03em' } } }),
        'ne-p': n({ id: 'ne-p', type: 'paragraph', parentId: 'newsletter', props: { text: 'Subscribe to our newsletter for exclusive deals and new arrivals.' }, styles: { base: { color: 'rgba(255,255,255,0.45)', maxWidth: '380px' } } }),
        'ne-btn': n({ id: 'ne-btn', type: 'button', parentId: 'newsletter', props: { label: 'Get my 15% off →' }, styles: { base: { padding: '14px 32px', borderRadius: '12px', background: '#f97316', color: '#fff', fontWeight: '700', fontSize: '1rem', border: 'none', cursor: 'pointer' } } }),
      },
    },
  },
  {
    id: 'landing-consulting', name: 'Consulting Firm', category: 'Landing Pages',
    description: 'Professional dark-navy consulting firm with services, credentials, and contact CTA.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['nav','hero','services','stats','testimonial','contact-cta'] }),
        nav: n({ id: 'nav', type: 'container', parentId: 'root', children: ['nav-logo','nav-links','nav-cta'], styles: { base: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 48px', borderBottom: '1px solid rgba(255,255,255,0.06)' } } }),
        'nav-logo': n({ id: 'nav-logo', type: 'heading', parentId: 'nav', props: { text: 'MERIDIAN ADVISORY', level: 'span' }, styles: { base: { fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.8)' } } }),
        'nav-links': n({ id: 'nav-links', type: 'container', parentId: 'nav', children: ['nl1','nl2','nl3','nl4'], styles: { base: { display: 'flex', gap: '32px' } } }),
        nl1: n({ id: 'nl1', type: 'heading', parentId: 'nav-links', props: { text: 'Services', level: 'span' }, styles: { base: { fontSize: '0.875rem', fontWeight: '500', opacity: '0.55', cursor: 'pointer' } } }),
        nl2: n({ id: 'nl2', type: 'heading', parentId: 'nav-links', props: { text: 'Case Studies', level: 'span' }, styles: { base: { fontSize: '0.875rem', fontWeight: '500', opacity: '0.55', cursor: 'pointer' } } }),
        nl3: n({ id: 'nl3', type: 'heading', parentId: 'nav-links', props: { text: 'Team', level: 'span' }, styles: { base: { fontSize: '0.875rem', fontWeight: '500', opacity: '0.55', cursor: 'pointer' } } }),
        nl4: n({ id: 'nl4', type: 'heading', parentId: 'nav-links', props: { text: 'Insights', level: 'span' }, styles: { base: { fontSize: '0.875rem', fontWeight: '500', opacity: '0.55', cursor: 'pointer' } } }),
        'nav-cta': n({ id: 'nav-cta', type: 'button', parentId: 'nav', props: { label: 'Schedule a call' }, styles: { base: { padding: '10px 24px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: '600', fontSize: '0.875rem', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' } } }),
        hero: n({ id: 'hero', type: 'container', parentId: 'root', children: ['hero-eyebrow','hero-h','hero-p','hero-btns','hero-creds'], styles: { base: { padding: '100px 48px 80px', display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1100px' } } }),
        'hero-eyebrow': n({ id: 'hero-eyebrow', type: 'heading', parentId: 'hero', props: { text: 'TRUSTED ADVISORS TO 200+ GLOBAL ENTERPRISES', level: 'span' }, styles: { base: { fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.3)' } } }),
        'hero-h': n({ id: 'hero-h', type: 'heading', parentId: 'hero', props: { text: 'We help ambitious\norganisations grow.', level: 'h1' }, styles: { base: { fontSize: '4.5rem', fontWeight: '900', lineHeight: '1.05', letterSpacing: '-0.04em', maxWidth: '800px' } } }),
        'hero-p': n({ id: 'hero-p', type: 'paragraph', parentId: 'hero', props: { text: 'Strategy. Execution. Results. Meridian Advisory partners with market leaders and fast-growth companies to solve their most complex challenges.' }, styles: { base: { fontSize: '1.2rem', maxWidth: '580px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.75' } } }),
        'hero-btns': n({ id: 'hero-btns', type: 'container', parentId: 'hero', children: ['hb1','hb2'], styles: { base: { display: 'flex', gap: '12px', flexWrap: 'wrap' } } }),
        hb1: n({ id: 'hb1', type: 'button', parentId: 'hero-btns', props: { label: 'Schedule a consultation' }, styles: { base: { padding: '14px 32px', borderRadius: '10px', background: '#fff', color: '#000', fontWeight: '700', fontSize: '1rem', border: 'none', cursor: 'pointer' } } }),
        hb2: n({ id: 'hb2', type: 'button', parentId: 'hero-btns', props: { label: 'View case studies →' }, styles: { base: { padding: '14px 28px', borderRadius: '10px', background: 'transparent', color: '#fff', fontWeight: '600', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' } } }),
        'hero-creds': n({ id: 'hero-creds', type: 'heading', parentId: 'hero', props: { text: 'McKinsey alumni · Ranked #1 Strategy Firm 2024 · ISO 27001 certified', level: 'span' }, styles: { base: { fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.02em' } } }),
        services: n({ id: 'services', type: 'container', parentId: 'root', children: ['svc-h','svc-grid'], styles: { base: { padding: '80px 48px', display: 'flex', flexDirection: 'column', gap: '48px', borderTop: '1px solid rgba(255,255,255,0.06)' } } }),
        'svc-h': n({ id: 'svc-h', type: 'heading', parentId: 'services', props: { text: 'Our expertise', level: 'h2' }, styles: { base: { fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-0.03em' } } }),
        'svc-grid': n({ id: 'svc-grid', type: 'container', parentId: 'services', children: ['sv1','sv2','sv3'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1px', background: 'rgba(255,255,255,0.06)' } } }),
        sv1: n({ id: 'sv1', type: 'container', parentId: 'svc-grid', children: ['sv1-n','sv1-h','sv1-p','sv1-link'], styles: { base: { padding: '40px 36px', background: '#080810', display: 'flex', flexDirection: 'column', gap: '16px' } } }),
        'sv1-n': n({ id: 'sv1-n', type: 'heading', parentId: 'sv1', props: { text: '01', level: 'span' }, styles: { base: { fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' } } }),
        'sv1-h': n({ id: 'sv1-h', type: 'heading', parentId: 'sv1', props: { text: 'Corporate Strategy', level: 'h3' }, styles: { base: { fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.02em' } } }),
        'sv1-p': n({ id: 'sv1-p', type: 'paragraph', parentId: 'sv1', props: { text: 'Growth roadmaps, M&A due diligence, market entry strategy, and competitive positioning.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.7' } } }),
        'sv1-link': n({ id: 'sv1-link', type: 'heading', parentId: 'sv1', props: { text: 'Learn more →', level: 'span' }, styles: { base: { fontSize: '0.85rem', fontWeight: '600', color: '#10b981', cursor: 'pointer', marginTop: 'auto' } } }),
        sv2: n({ id: 'sv2', type: 'container', parentId: 'svc-grid', children: ['sv2-n','sv2-h','sv2-p','sv2-link'], styles: { base: { padding: '40px 36px', background: '#080810', display: 'flex', flexDirection: 'column', gap: '16px' } } }),
        'sv2-n': n({ id: 'sv2-n', type: 'heading', parentId: 'sv2', props: { text: '02', level: 'span' }, styles: { base: { fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' } } }),
        'sv2-h': n({ id: 'sv2-h', type: 'heading', parentId: 'sv2', props: { text: 'Digital Transformation', level: 'h3' }, styles: { base: { fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.02em' } } }),
        'sv2-p': n({ id: 'sv2-p', type: 'paragraph', parentId: 'sv2', props: { text: 'AI/ML adoption, cloud migration, process automation, and technology roadmapping.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.7' } } }),
        'sv2-link': n({ id: 'sv2-link', type: 'heading', parentId: 'sv2', props: { text: 'Learn more →', level: 'span' }, styles: { base: { fontSize: '0.85rem', fontWeight: '600', color: '#10b981', cursor: 'pointer', marginTop: 'auto' } } }),
        sv3: n({ id: 'sv3', type: 'container', parentId: 'svc-grid', children: ['sv3-n','sv3-h','sv3-p','sv3-link'], styles: { base: { padding: '40px 36px', background: '#080810', display: 'flex', flexDirection: 'column', gap: '16px' } } }),
        'sv3-n': n({ id: 'sv3-n', type: 'heading', parentId: 'sv3', props: { text: '03', level: 'span' }, styles: { base: { fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' } } }),
        'sv3-h': n({ id: 'sv3-h', type: 'heading', parentId: 'sv3', props: { text: 'Operational Excellence', level: 'h3' }, styles: { base: { fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.02em' } } }),
        'sv3-p': n({ id: 'sv3-p', type: 'paragraph', parentId: 'sv3', props: { text: 'Lean transformation, supply chain optimisation, and cost structure redesign.' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.7' } } }),
        'sv3-link': n({ id: 'sv3-link', type: 'heading', parentId: 'sv3', props: { text: 'Learn more →', level: 'span' }, styles: { base: { fontSize: '0.85rem', fontWeight: '600', color: '#10b981', cursor: 'pointer', marginTop: 'auto' } } }),
        stats: n({ id: 'stats', type: 'container', parentId: 'root', children: ['st-grid'], styles: { base: { padding: '0 48px 80px' } } }),
        'st-grid': n({ id: 'st-grid', type: 'container', parentId: 'stats', children: ['st1','st2','st3','st4'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '20px' } } }),
        st1: n({ id: 'st1', type: 'container', parentId: 'st-grid', children: ['st1-n','st1-l'], styles: { base: { padding: '32px 28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' } } }),
        'st1-n': n({ id: 'st1-n', type: 'heading', parentId: 'st1', props: { text: '200+', level: 'h3' }, styles: { base: { fontSize: '2.5rem', fontWeight: '900', color: '#fff' } } }),
        'st1-l': n({ id: 'st1-l', type: 'paragraph', parentId: 'st1', props: { text: 'Enterprise clients served' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', marginTop: '6px' } } }),
        st2: n({ id: 'st2', type: 'container', parentId: 'st-grid', children: ['st2-n','st2-l'], styles: { base: { padding: '32px 28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' } } }),
        'st2-n': n({ id: 'st2-n', type: 'heading', parentId: 'st2', props: { text: '$8.4B', level: 'h3' }, styles: { base: { fontSize: '2.5rem', fontWeight: '900', color: '#fff' } } }),
        'st2-l': n({ id: 'st2-l', type: 'paragraph', parentId: 'st2', props: { text: 'In client revenue unlocked' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', marginTop: '6px' } } }),
        st3: n({ id: 'st3', type: 'container', parentId: 'st-grid', children: ['st3-n','st3-l'], styles: { base: { padding: '32px 28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' } } }),
        'st3-n': n({ id: 'st3-n', type: 'heading', parentId: 'st3', props: { text: '94%', level: 'h3' }, styles: { base: { fontSize: '2.5rem', fontWeight: '900', color: '#fff' } } }),
        'st3-l': n({ id: 'st3-l', type: 'paragraph', parentId: 'st3', props: { text: 'Client retention rate' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', marginTop: '6px' } } }),
        st4: n({ id: 'st4', type: 'container', parentId: 'st-grid', children: ['st4-n','st4-l'], styles: { base: { padding: '32px 28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' } } }),
        'st4-n': n({ id: 'st4-n', type: 'heading', parentId: 'st4', props: { text: '18yrs', level: 'h3' }, styles: { base: { fontSize: '2.5rem', fontWeight: '900', color: '#fff' } } }),
        'st4-l': n({ id: 'st4-l', type: 'paragraph', parentId: 'st4', props: { text: 'Average partner experience' }, styles: { base: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', marginTop: '6px' } } }),
        testimonial: n({ id: 'testimonial', type: 'container', parentId: 'root', children: ['t-quote','t-attr'], styles: { base: { padding: '80px 48px', display: 'flex', flexDirection: 'column', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', maxWidth: '800px' } } }),
        't-quote': n({ id: 't-quote', type: 'paragraph', parentId: 'testimonial', props: { text: '"Meridian didn\'t just advise us — they rolled up their sleeves and built the transformation with us. Three years later, we\'re 2.4x the company we were. Best strategic investment we\'ve ever made."' }, styles: { base: { fontSize: '1.35rem', lineHeight: '1.7', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', fontWeight: '400' } } }),
        't-attr': n({ id: 't-attr', type: 'heading', parentId: 'testimonial', props: { text: '— David Chen, CEO, Horizons Group (Fortune 500)', level: 'h5' }, styles: { base: { fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.03em' } } }),
        'contact-cta': n({ id: 'contact-cta', type: 'container', parentId: 'root', children: ['cc-h','cc-p','cc-btn'], styles: { base: { padding: '80px 48px', display: 'flex', flexDirection: 'column', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' } } }),
        'cc-h': n({ id: 'cc-h', type: 'heading', parentId: 'contact-cta', props: { text: 'Ready to transform your organisation?', level: 'h2' }, styles: { base: { fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.03em', maxWidth: '600px' } } }),
        'cc-p': n({ id: 'cc-p', type: 'paragraph', parentId: 'contact-cta', props: { text: 'Book a no-obligation 45-minute strategy session with one of our senior partners.' }, styles: { base: { color: 'rgba(255,255,255,0.45)', maxWidth: '440px' } } }),
        'cc-btn': n({ id: 'cc-btn', type: 'button', parentId: 'contact-cta', props: { label: 'Schedule your session →' }, styles: { base: { padding: '16px 36px', borderRadius: '10px', background: '#fff', color: '#000', fontWeight: '800', fontSize: '1rem', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' } } }),
      },
    },
  },
];

const SECTION_TEMPLATES: NexusTemplate[] = [
  {
    id: 'section-features', name: 'Features Grid', category: 'Sections',
    description: '3-column feature cards with icons.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['sec'] }),
        sec:  n({ id: 'sec', type: 'container', parentId: 'root', children: ['sec-h','sec-sub','grid'], styles: { base: { padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '48px', textAlign: 'center' } } }),
        'sec-h':   n({ id: 'sec-h', type: 'heading', parentId: 'sec', props: { text: 'Why teams love us', level: 'h2', align: 'center' }, styles: { base: { fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.03em' } } }),
        'sec-sub': n({ id: 'sec-sub', type: 'paragraph', parentId: 'sec', props: { text: 'Built for speed, designed for simplicity.' }, styles: { base: { opacity: '0.6', maxWidth: '400px' } } }),
        grid: n({ id: 'grid', type: 'container', parentId: 'sec', children: ['c1','c2','c3'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '20px', width: '100%', maxWidth: '900px' } } }),
        c1: n({ id: 'c1', type: 'container', parentId: 'grid', children: ['c1-i','c1-h','c1-p'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', textAlign: 'left' } } }),
        'c1-i': n({ id: 'c1-i', type: 'heading', parentId: 'c1', props: { text: '🚀', level: 'span' }, styles: { base: { fontSize: '1.8rem' } } }),
        'c1-h': n({ id: 'c1-h', type: 'heading', parentId: 'c1', props: { text: 'Fast by default', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '700', marginTop: '12px' } } }),
        'c1-p': n({ id: 'c1-p', type: 'paragraph', parentId: 'c1', props: { text: 'Outputs clean static HTML. Lighthouse 95+ without effort.' }, styles: { base: { fontSize: '0.875rem', opacity: '0.6', marginTop: '8px', lineHeight: '1.7' } } }),
        c2: n({ id: 'c2', type: 'container', parentId: 'grid', children: ['c2-i','c2-h','c2-p'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', textAlign: 'left' } } }),
        'c2-i': n({ id: 'c2-i', type: 'heading', parentId: 'c2', props: { text: '🎯', level: 'span' }, styles: { base: { fontSize: '1.8rem' } } }),
        'c2-h': n({ id: 'c2-h', type: 'heading', parentId: 'c2', props: { text: 'Precision control', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '700', marginTop: '12px' } } }),
        'c2-p': n({ id: 'c2-p', type: 'paragraph', parentId: 'c2', props: { text: 'Every pixel on every breakpoint. No compromises.' }, styles: { base: { fontSize: '0.875rem', opacity: '0.6', marginTop: '8px', lineHeight: '1.7' } } }),
        c3: n({ id: 'c3', type: 'container', parentId: 'grid', children: ['c3-i','c3-h','c3-p'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', textAlign: 'left' } } }),
        'c3-i': n({ id: 'c3-i', type: 'heading', parentId: 'c3', props: { text: '🧩', level: 'span' }, styles: { base: { fontSize: '1.8rem' } } }),
        'c3-h': n({ id: 'c3-h', type: 'heading', parentId: 'c3', props: { text: 'Extensible', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '700', marginTop: '12px' } } }),
        'c3-p': n({ id: 'c3-p', type: 'paragraph', parentId: 'c3', props: { text: 'Widget API for custom components. Grow without limits.' }, styles: { base: { fontSize: '0.875rem', opacity: '0.6', marginTop: '8px', lineHeight: '1.7' } } }),
      },
    },
  },
  {
    id: 'section-cta', name: 'CTA Band', category: 'Sections',
    description: 'Full-width call-to-action strip with gradient background.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['cta'] }),
        cta:  n({ id: 'cta', type: 'container', parentId: 'root', children: ['cta-h','cta-p','cta-btn'], styles: { base: { padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', background: 'linear-gradient(135deg,#10b981 0%,#059669 100%)' } } }),
        'cta-h': n({ id: 'cta-h', type: 'heading', parentId: 'cta', props: { text: 'Start building today.', level: 'h2', align: 'center' }, styles: { base: { fontSize: '2.5rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.03em' } } }),
        'cta-p': n({ id: 'cta-p', type: 'paragraph', parentId: 'cta', props: { text: 'Free forever. No credit card required. Cancel anytime.' }, styles: { base: { color: 'rgba(255,255,255,0.75)', fontSize: '1rem' } } }),
        'cta-btn': n({ id: 'cta-btn', type: 'button', parentId: 'cta', props: { label: 'Get started for free' }, styles: { base: { padding: '14px 32px', borderRadius: '40px', background: '#fff', color: '#059669', fontWeight: '700', fontSize: '1rem', border: 'none', cursor: 'pointer' } } }),
      },
    },
  },
  {
    id: 'section-testimonials', name: 'Testimonials', category: 'Sections',
    description: 'Two-column social proof with customer quotes.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['sec'] }),
        sec:  n({ id: 'sec', type: 'container', parentId: 'root', children: ['sec-h', 'tgrid'], styles: { base: { padding: '100px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '56px', background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.1) 0%, transparent 55%), #07070f' } } }),
        'sec-h': n({ id: 'sec-h', type: 'heading', parentId: 'sec', props: { text: 'Loved by builders worldwide', level: 'h2', align: 'center' }, styles: { base: { fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-0.03em' } } }),
        tgrid: n({ id: 'tgrid', type: 'container', parentId: 'sec', children: ['t1','t2'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '20px', width: '100%', maxWidth: '800px' } } }),
        t1: n({ id: 't1', type: 'container', parentId: 'tgrid', children: ['t1-q','t1-a'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' } } }),
        't1-q': n({ id: 't1-q', type: 'paragraph', parentId: 't1', props: { text: '"Nexus cut our page production time by 60%. The output is genuinely faster than anything we\'ve shipped before."' }, styles: { base: { fontSize: '0.95rem', lineHeight: '1.7', opacity: '0.85' } } }),
        't1-a': n({ id: 't1-a', type: 'heading', parentId: 't1', props: { text: '— Sarah K., Head of Design at Momentum', level: 'h5' }, styles: { base: { fontSize: '0.8rem', fontWeight: '600', opacity: '0.5' } } }),
        t2: n({ id: 't2', type: 'container', parentId: 'tgrid', children: ['t2-q','t2-a'], styles: { base: { padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' } } }),
        't2-q': n({ id: 't2-q', type: 'paragraph', parentId: 't2', props: { text: '"Finally a builder that doesn\'t fight me. The static HTML output is the real deal — our clients\' pages score 97+ consistently."' }, styles: { base: { fontSize: '0.95rem', lineHeight: '1.7', opacity: '0.85' } } }),
        't2-a': n({ id: 't2-a', type: 'heading', parentId: 't2', props: { text: '— Marcus J., Agency Owner at Forge & Co.', level: 'h5' }, styles: { base: { fontSize: '0.8rem', fontWeight: '600', opacity: '0.5' } } }),
      },
    },
  },
  {
    id: 'section-stats', name: 'Stats Row', category: 'Sections',
    description: '4-column metrics strip for social proof.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['sec'] }),
        sec:  n({ id: 'sec', type: 'container', parentId: 'root', children: ['sgrid'], styles: { base: { padding: '80px 40px', background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.1) 0%, transparent 60%), #050509' } } }),
        sgrid: n({ id: 'sgrid', type: 'container', parentId: 'sec', children: ['s1','s2','s3','s4'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden', width: '100%', maxWidth: '1000px', margin: '0 auto' } } }),
        s1: n({ id: 's1', type: 'container', parentId: 'sgrid', children: ['s1-n','s1-l'], styles: { base: { textAlign: 'center', padding: '48px 32px', background: '#050509', display: 'flex', flexDirection: 'column', gap: '10px' } } }),
        's1-n': n({ id: 's1-n', type: 'heading', parentId: 's1', props: { text: '50K+', level: 'h3', align: 'center' }, styles: { base: { fontSize: '2.2rem', fontWeight: '900', color: '#10b981' } } }),
        's1-l': n({ id: 's1-l', type: 'paragraph', parentId: 's1', props: { text: 'Pages published' }, styles: { base: { fontSize: '0.85rem', opacity: '0.55', marginTop: '4px' } } }),
        s2: n({ id: 's2', type: 'container', parentId: 'sgrid', children: ['s2-n','s2-l'], styles: { base: { textAlign: 'center', padding: '48px 32px', background: '#050509', display: 'flex', flexDirection: 'column', gap: '10px' } } }),
        's2-n': n({ id: 's2-n', type: 'heading', parentId: 's2', props: { text: '97', level: 'h3', align: 'center' }, styles: { base: { fontSize: '2.2rem', fontWeight: '900', color: '#6366f1' } } }),
        's2-l': n({ id: 's2-l', type: 'paragraph', parentId: 's2', props: { text: 'Avg. Lighthouse score' }, styles: { base: { fontSize: '0.85rem', opacity: '0.55', marginTop: '4px' } } }),
        s3: n({ id: 's3', type: 'container', parentId: 'sgrid', children: ['s3-n','s3-l'], styles: { base: { textAlign: 'center', padding: '48px 32px', background: '#050509', display: 'flex', flexDirection: 'column', gap: '10px' } } }),
        's3-n': n({ id: 's3-n', type: 'heading', parentId: 's3', props: { text: '2,400+', level: 'h3', align: 'center' }, styles: { base: { fontSize: '2.2rem', fontWeight: '900', color: '#f59e0b' } } }),
        's3-l': n({ id: 's3-l', type: 'paragraph', parentId: 's3', props: { text: 'Teams on board' }, styles: { base: { fontSize: '0.85rem', opacity: '0.55', marginTop: '4px' } } }),
        s4: n({ id: 's4', type: 'container', parentId: 'sgrid', children: ['s4-n','s4-l'], styles: { base: { textAlign: 'center', padding: '48px 32px', background: '#050509', display: 'flex', flexDirection: 'column', gap: '10px' } } }),
        's4-n': n({ id: 's4-n', type: 'heading', parentId: 's4', props: { text: '<80ms', level: 'h3', align: 'center' }, styles: { base: { fontSize: '2.2rem', fontWeight: '900', color: '#ec4899' } } }),
        's4-l': n({ id: 's4-l', type: 'paragraph', parentId: 's4', props: { text: 'Avg. TTFB' }, styles: { base: { fontSize: '0.85rem', opacity: '0.55', marginTop: '4px' } } }),
      },
    },
  },

  // ── Pricing Section ─────────────────────────────────────────────────────────
  {
    id: 'section-pricing', name: 'Pricing Section', category: 'Sections',
    description: 'Three-tier pricing cards with CTA buttons.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root:   n({ id: 'root', type: 'root', children: ['wrap'] }),
        wrap:   n({ id: 'wrap', type: 'container', parentId: 'root', children: ['eyebrow','head','sub','grid'], styles: { base: { maxWidth: '1100px', margin: '0 auto', padding: '100px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' } } }),
        eyebrow:n({ id: 'eyebrow', type: 'heading', parentId: 'wrap', props: { text: 'PRICING', level: 'span' }, styles: { base: { fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.18em', color: '#a78bfa', marginBottom: '4px' } } }),
        head:   n({ id: 'head', type: 'heading', parentId: 'wrap', props: { text: 'Simple, transparent pricing', level: 'h2' }, styles: { base: { fontSize: '2.6rem', fontWeight: '900', letterSpacing: '-0.03em', textAlign: 'center' } } }),
        sub:    n({ id: 'sub', type: 'paragraph', parentId: 'wrap', props: { text: 'No hidden fees. Cancel any time.' }, styles: { base: { opacity: '0.5', textAlign: 'center', marginBottom: '32px' } } }),
        grid:   n({ id: 'grid', type: 'container', parentId: 'wrap', children: ['tier1','tier2','tier3'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '24px', width: '100%', alignItems: 'start' } } }),
        tier1:  n({ id: 'tier1', type: 'container', parentId: 'grid', children: ['t1n','t1p','t1u','t1f1','t1f2','t1f3','t1btn'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '36px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } } }),
        t1n:    n({ id: 't1n', type: 'heading', parentId: 'tier1', props: { text: 'Starter', level: 'h3' }, styles: { base: { fontSize: '1.1rem', fontWeight: '700' } } }),
        t1p:    n({ id: 't1p', type: 'heading', parentId: 'tier1', props: { text: '$0', level: 'span' }, styles: { base: { fontSize: '3rem', fontWeight: '900', letterSpacing: '-0.05em' } } }),
        t1u:    n({ id: 't1u', type: 'heading', parentId: 'tier1', props: { text: '/month', level: 'span' }, styles: { base: { fontSize: '0.85rem', opacity: '0.4', marginTop: '-12px' } } }),
        t1f1:   n({ id: 't1f1', type: 'paragraph', parentId: 'tier1', props: { text: '✓  3 projects' }, styles: { base: { fontSize: '0.9rem', opacity: '0.7' } } }),
        t1f2:   n({ id: 't1f2', type: 'paragraph', parentId: 'tier1', props: { text: '✓  Basic templates' }, styles: { base: { fontSize: '0.9rem', opacity: '0.7' } } }),
        t1f3:   n({ id: 't1f3', type: 'paragraph', parentId: 'tier1', props: { text: '✓  Community support' }, styles: { base: { fontSize: '0.9rem', opacity: '0.7' } } }),
        t1btn:  n({ id: 't1btn', type: 'button', parentId: 'tier1', props: { text: 'Get started free' }, styles: { base: { marginTop: '8px', padding: '12px 0', textAlign: 'center', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', color: 'inherit', background: 'transparent', width: '100%' } } }),
        tier2:  n({ id: 'tier2', type: 'container', parentId: 'grid', children: ['t2badge','t2n','t2p','t2u','t2f1','t2f2','t2f3','t2f4','t2btn'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '36px', borderRadius: '16px', background: 'linear-gradient(145deg,#7c3aed,#4f46e5)', boxShadow: '0 0 60px rgba(124,58,237,0.35)', transform: 'scale(1.04)' } } }),
        t2badge:n({ id: 't2badge', type: 'heading', parentId: 'tier2', props: { text: 'MOST POPULAR', level: 'span' }, styles: { base: { fontSize: '0.6rem', fontWeight: '900', letterSpacing: '0.15em', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '40px', alignSelf: 'flex-start' } } }),
        t2n:    n({ id: 't2n', type: 'heading', parentId: 'tier2', props: { text: 'Pro', level: 'h3' }, styles: { base: { fontSize: '1.1rem', fontWeight: '700' } } }),
        t2p:    n({ id: 't2p', type: 'heading', parentId: 'tier2', props: { text: '$49', level: 'span' }, styles: { base: { fontSize: '3rem', fontWeight: '900', letterSpacing: '-0.05em' } } }),
        t2u:    n({ id: 't2u', type: 'heading', parentId: 'tier2', props: { text: '/month', level: 'span' }, styles: { base: { fontSize: '0.85rem', opacity: '0.7', marginTop: '-12px' } } }),
        t2f1:   n({ id: 't2f1', type: 'paragraph', parentId: 'tier2', props: { text: '✓  Unlimited projects' }, styles: { base: { fontSize: '0.9rem' } } }),
        t2f2:   n({ id: 't2f2', type: 'paragraph', parentId: 'tier2', props: { text: '✓  All premium templates' }, styles: { base: { fontSize: '0.9rem' } } }),
        t2f3:   n({ id: 't2f3', type: 'paragraph', parentId: 'tier2', props: { text: '✓  Custom domain publish' }, styles: { base: { fontSize: '0.9rem' } } }),
        t2f4:   n({ id: 't2f4', type: 'paragraph', parentId: 'tier2', props: { text: '✓  Priority support' }, styles: { base: { fontSize: '0.9rem' } } }),
        t2btn:  n({ id: 't2btn', type: 'button', parentId: 'tier2', props: { text: 'Start free trial' }, styles: { base: { marginTop: '8px', padding: '12px 0', textAlign: 'center', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '900', cursor: 'pointer', color: '#4f46e5', background: '#ffffff', width: '100%', border: 'none' } } }),
        tier3:  n({ id: 'tier3', type: 'container', parentId: 'grid', children: ['t3n','t3p','t3u','t3f1','t3f2','t3f3','t3f4','t3f5','t3btn'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '36px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } } }),
        t3n:    n({ id: 't3n', type: 'heading', parentId: 'tier3', props: { text: 'Enterprise', level: 'h3' }, styles: { base: { fontSize: '1.1rem', fontWeight: '700' } } }),
        t3p:    n({ id: 't3p', type: 'heading', parentId: 'tier3', props: { text: '$199', level: 'span' }, styles: { base: { fontSize: '3rem', fontWeight: '900', letterSpacing: '-0.05em' } } }),
        t3u:    n({ id: 't3u', type: 'heading', parentId: 'tier3', props: { text: '/month', level: 'span' }, styles: { base: { fontSize: '0.85rem', opacity: '0.4', marginTop: '-12px' } } }),
        t3f1:   n({ id: 't3f1', type: 'paragraph', parentId: 'tier3', props: { text: '✓  Everything in Pro' }, styles: { base: { fontSize: '0.9rem', opacity: '0.7' } } }),
        t3f2:   n({ id: 't3f2', type: 'paragraph', parentId: 'tier3', props: { text: '✓  White-label builder' }, styles: { base: { fontSize: '0.9rem', opacity: '0.7' } } }),
        t3f3:   n({ id: 't3f3', type: 'paragraph', parentId: 'tier3', props: { text: '✓  SSO & team seats' }, styles: { base: { fontSize: '0.9rem', opacity: '0.7' } } }),
        t3f4:   n({ id: 't3f4', type: 'paragraph', parentId: 'tier3', props: { text: '✓  Dedicated SLA' }, styles: { base: { fontSize: '0.9rem', opacity: '0.7' } } }),
        t3f5:   n({ id: 't3f5', type: 'paragraph', parentId: 'tier3', props: { text: '✓  Custom integrations' }, styles: { base: { fontSize: '0.9rem', opacity: '0.7' } } }),
        t3btn:  n({ id: 't3btn', type: 'button', parentId: 'tier3', props: { text: 'Contact sales' }, styles: { base: { marginTop: '8px', padding: '12px 0', textAlign: 'center', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', color: 'inherit', background: 'transparent', width: '100%' } } }),
      },
    },
  },
  // ── Team Section ─────────────────────────────────────────────────────────────
  {
    id: 'section-team', name: 'Team Section', category: 'Sections',
    description: 'Four-member team grid with role badges.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['wrap'] }),
        wrap: n({ id: 'wrap', type: 'container', parentId: 'root', children: ['eyebrow','head','sub','grid'], styles: { base: { maxWidth: '1100px', margin: '0 auto', padding: '100px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' } } }),
        eyebrow: n({ id: 'eyebrow', type: 'heading', parentId: 'wrap', props: { text: 'OUR TEAM', level: 'span' }, styles: { base: { fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.18em', color: '#34d399', marginBottom: '4px' } } }),
        head: n({ id: 'head', type: 'heading', parentId: 'wrap', props: { text: 'The people behind the product', level: 'h2' }, styles: { base: { fontSize: '2.6rem', fontWeight: '900', letterSpacing: '-0.03em', textAlign: 'center' } } }),
        sub:  n({ id: 'sub', type: 'paragraph', parentId: 'wrap', props: { text: 'Passionate experts building the future of design tooling.' }, styles: { base: { opacity: '0.5', textAlign: 'center', marginBottom: '32px' } } }),
        grid: n({ id: 'grid', type: 'container', parentId: 'wrap', children: ['m1','m2','m3','m4'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '24px', width: '100%' } } }),
        m1:   n({ id: 'm1', type: 'container', parentId: 'grid', children: ['m1av','m1n','m1r','m1bio'], styles: { base: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '36px 24px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' } } }),
        m1av: n({ id: 'm1av', type: 'container', parentId: 'm1', children: [], styles: { base: { width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', flexShrink: '0' } } }),
        m1n:  n({ id: 'm1n', type: 'heading', parentId: 'm1', props: { text: 'Sofia Reyes', level: 'h4' }, styles: { base: { fontSize: '1rem', fontWeight: '800', marginTop: '4px' } } }),
        m1r:  n({ id: 'm1r', type: 'heading', parentId: 'm1', props: { text: 'CEO & Co-founder', level: 'span' }, styles: { base: { fontSize: '0.75rem', color: '#a78bfa', fontWeight: '700', letterSpacing: '0.04em' } } }),
        m1bio:n({ id: 'm1bio', type: 'paragraph', parentId: 'm1', props: { text: 'Former design lead at Figma. Obsessed with removing friction from the creative process.' }, styles: { base: { fontSize: '0.85rem', opacity: '0.55', lineHeight: '1.7' } } }),
        m2:   n({ id: 'm2', type: 'container', parentId: 'grid', children: ['m2av','m2n','m2r','m2bio'], styles: { base: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '36px 24px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' } } }),
        m2av: n({ id: 'm2av', type: 'container', parentId: 'm2', children: [], styles: { base: { width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#10b981)', flexShrink: '0' } } }),
        m2n:  n({ id: 'm2n', type: 'heading', parentId: 'm2', props: { text: 'Kai Nakamura', level: 'h4' }, styles: { base: { fontSize: '1rem', fontWeight: '800', marginTop: '4px' } } }),
        m2r:  n({ id: 'm2r', type: 'heading', parentId: 'm2', props: { text: 'CTO', level: 'span' }, styles: { base: { fontSize: '0.75rem', color: '#34d399', fontWeight: '700', letterSpacing: '0.04em' } } }),
        m2bio:n({ id: 'm2bio', type: 'paragraph', parentId: 'm2', props: { text: 'Systems architect who previously scaled infrastructure at Vercel to millions of deploys per day.' }, styles: { base: { fontSize: '0.85rem', opacity: '0.55', lineHeight: '1.7' } } }),
        m3:   n({ id: 'm3', type: 'container', parentId: 'grid', children: ['m3av','m3n','m3r','m3bio'], styles: { base: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '36px 24px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' } } }),
        m3av: n({ id: 'm3av', type: 'container', parentId: 'm3', children: [], styles: { base: { width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', flexShrink: '0' } } }),
        m3n:  n({ id: 'm3n', type: 'heading', parentId: 'm3', props: { text: 'Leila Hassan', level: 'h4' }, styles: { base: { fontSize: '1rem', fontWeight: '800', marginTop: '4px' } } }),
        m3r:  n({ id: 'm3r', type: 'heading', parentId: 'm3', props: { text: 'Head of Design', level: 'span' }, styles: { base: { fontSize: '0.75rem', color: '#fbbf24', fontWeight: '700', letterSpacing: '0.04em' } } }),
        m3bio:n({ id: 'm3bio', type: 'paragraph', parentId: 'm3', props: { text: 'Award-winning UX designer with roots in editorial design. Believes white space is never wasted.' }, styles: { base: { fontSize: '0.85rem', opacity: '0.55', lineHeight: '1.7' } } }),
        m4:   n({ id: 'm4', type: 'container', parentId: 'grid', children: ['m4av','m4n','m4r','m4bio'], styles: { base: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '36px 24px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' } } }),
        m4av: n({ id: 'm4av', type: 'container', parentId: 'm4', children: [], styles: { base: { width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', flexShrink: '0' } } }),
        m4n:  n({ id: 'm4n', type: 'heading', parentId: 'm4', props: { text: 'Marcus Bell', level: 'h4' }, styles: { base: { fontSize: '1rem', fontWeight: '800', marginTop: '4px' } } }),
        m4r:  n({ id: 'm4r', type: 'heading', parentId: 'm4', props: { text: 'Growth & Marketing', level: 'span' }, styles: { base: { fontSize: '0.75rem', color: '#f472b6', fontWeight: '700', letterSpacing: '0.04em' } } }),
        m4bio:n({ id: 'm4bio', type: 'paragraph', parentId: 'm4', props: { text: 'B2B SaaS growth veteran. Grew Notion from 100k to 10M users via community-led virality.' }, styles: { base: { fontSize: '0.85rem', opacity: '0.55', lineHeight: '1.7' } } }),
      },
    },
  },
  // ── FAQ Section ──────────────────────────────────────────────────────────────
  {
    id: 'section-faq', name: 'FAQ Section', category: 'Sections',
    description: 'Five-item FAQ accordion with elegant dividers.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['wrap'] }),
        wrap: n({ id: 'wrap', type: 'container', parentId: 'root', children: ['eyebrow','head','sub','list'], styles: { base: { maxWidth: '720px', margin: '0 auto', padding: '100px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' } } }),
        eyebrow: n({ id: 'eyebrow', type: 'heading', parentId: 'wrap', props: { text: 'FAQ', level: 'span' }, styles: { base: { fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.18em', color: '#f59e0b' } } }),
        head: n({ id: 'head', type: 'heading', parentId: 'wrap', props: { text: 'Frequently asked questions', level: 'h2' }, styles: { base: { fontSize: '2.6rem', fontWeight: '900', letterSpacing: '-0.03em', textAlign: 'center' } } }),
        sub:  n({ id: 'sub', type: 'paragraph', parentId: 'wrap', props: { text: "Can't find what you're looking for? Reach out to our support team." }, styles: { base: { opacity: '0.5', textAlign: 'center', marginBottom: '32px' } } }),
        list: n({ id: 'list', type: 'container', parentId: 'wrap', children: ['q1','d1','q2','d2','q3','d3','q4','d4','q5'], styles: { base: { width: '100%', display: 'flex', flexDirection: 'column' } } }),
        q1:   n({ id: 'q1', type: 'container', parentId: 'list', children: ['q1t','q1a'], styles: { base: { padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '10px' } } }),
        q1t:  n({ id: 'q1t', type: 'heading', parentId: 'q1', props: { text: 'Is there a free plan available?', level: 'h4' }, styles: { base: { fontSize: '1rem', fontWeight: '800' } } }),
        q1a:  n({ id: 'q1a', type: 'paragraph', parentId: 'q1', props: { text: 'Yes — our Starter tier is free forever with up to 3 projects and access to basic templates. No credit card required.' }, styles: { base: { opacity: '0.55', lineHeight: '1.75' } } }),
        d1:   n({ id: 'd1', type: 'divider', parentId: 'list', styles: { base: { border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '0' } } }),
        q2:   n({ id: 'q2', type: 'container', parentId: 'list', children: ['q2t','q2a'], styles: { base: { padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '10px' } } }),
        q2t:  n({ id: 'q2t', type: 'heading', parentId: 'q2', props: { text: 'Can I export clean HTML/CSS code?', level: 'h4' }, styles: { base: { fontSize: '1rem', fontWeight: '800' } } }),
        q2a:  n({ id: 'q2a', type: 'paragraph', parentId: 'q2', props: { text: 'Absolutely. Every page you publish exports as a self-contained HTML file with scoped, minified CSS. Pro users get access to the raw source and a CLI export tool.' }, styles: { base: { opacity: '0.55', lineHeight: '1.75' } } }),
        d2:   n({ id: 'd2', type: 'divider', parentId: 'list', styles: { base: { border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '0' } } }),
        q3:   n({ id: 'q3', type: 'container', parentId: 'list', children: ['q3t','q3a'], styles: { base: { padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '10px' } } }),
        q3t:  n({ id: 'q3t', type: 'heading', parentId: 'q3', props: { text: 'Does Nexus work with WordPress?', level: 'h4' }, styles: { base: { fontSize: '1rem', fontWeight: '800' } } }),
        q3a:  n({ id: 'q3a', type: 'paragraph', parentId: 'q3', props: { text: 'Yes. The Nexus WP plugin seamlessly integrates as a page builder inside WordPress, storing all designs as clean JSON — never shortcodes.' }, styles: { base: { opacity: '0.55', lineHeight: '1.75' } } }),
        d3:   n({ id: 'd3', type: 'divider', parentId: 'list', styles: { base: { border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '0' } } }),
        q4:   n({ id: 'q4', type: 'container', parentId: 'list', children: ['q4t','q4a'], styles: { base: { padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '10px' } } }),
        q4t:  n({ id: 'q4t', type: 'heading', parentId: 'q4', props: { text: 'How does billing work?', level: 'h4' }, styles: { base: { fontSize: '1rem', fontWeight: '800' } } }),
        q4a:  n({ id: 'q4a', type: 'paragraph', parentId: 'q4', props: { text: 'All paid plans are billed monthly or annually (save 30%). You can upgrade, downgrade, or cancel at any time from your dashboard — no calls, no contracts.' }, styles: { base: { opacity: '0.55', lineHeight: '1.75' } } }),
        d4:   n({ id: 'd4', type: 'divider', parentId: 'list', styles: { base: { border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '0' } } }),
        q5:   n({ id: 'q5', type: 'container', parentId: 'list', children: ['q5t','q5a'], styles: { base: { padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '10px' } } }),
        q5t:  n({ id: 'q5t', type: 'heading', parentId: 'q5', props: { text: 'Is my data secure?', level: 'h4' }, styles: { base: { fontSize: '1rem', fontWeight: '800' } } }),
        q5a:  n({ id: 'q5a', type: 'paragraph', parentId: 'q5', props: { text: 'All data is encrypted at rest and in transit. We are SOC 2 Type II compliant and perform third-party penetration tests quarterly.' }, styles: { base: { opacity: '0.55', lineHeight: '1.75' } } }),
      },
    },
  },
  // ── Contact Section ───────────────────────────────────────────────────────────
  {
    id: 'section-contact', name: 'Contact Section', category: 'Sections',
    description: 'Split-layout contact form with info column.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['wrap'] }),
        wrap: n({ id: 'wrap', type: 'container', parentId: 'root', children: ['info','form'], styles: { base: { maxWidth: '1100px', margin: '0 auto', padding: '100px 32px', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '80px', alignItems: 'start' } } }),
        info: n({ id: 'info', type: 'container', parentId: 'wrap', children: ['eyebrow','head','sub','email','phone','loc'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '20px' } } }),
        eyebrow: n({ id: 'eyebrow', type: 'heading', parentId: 'info', props: { text: 'CONTACT', level: 'span' }, styles: { base: { fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.18em', color: '#38bdf8' } } }),
        head: n({ id: 'head', type: 'heading', parentId: 'info', props: { text: "Let's build something great together.", level: 'h2' }, styles: { base: { fontSize: '2.4rem', fontWeight: '900', letterSpacing: '-0.03em', lineHeight: '1.2' } } }),
        sub:  n({ id: 'sub', type: 'paragraph', parentId: 'info', props: { text: 'Whether you have a question, a project in mind, or just want to say hello — our team responds within 24 hours.' }, styles: { base: { opacity: '0.5', lineHeight: '1.75' } } }),
        email:n({ id: 'email', type: 'paragraph', parentId: 'info', props: { text: '✉  hello@nexusarchitect.io' }, styles: { base: { fontSize: '0.9rem', opacity: '0.7', fontWeight: '600' } } }),
        phone:n({ id: 'phone', type: 'paragraph', parentId: 'info', props: { text: '✆  +1 (415) 555-0182' }, styles: { base: { fontSize: '0.9rem', opacity: '0.7', fontWeight: '600' } } }),
        loc:  n({ id: 'loc', type: 'paragraph', parentId: 'info', props: { text: '⌖  San Francisco, CA · Remote-first' }, styles: { base: { fontSize: '0.9rem', opacity: '0.7', fontWeight: '600' } } }),
        form: n({ id: 'form', type: 'container', parentId: 'wrap', children: ['row1','row2','msgLabel','msgField','submit'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '48px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } } }),
        row1: n({ id: 'row1', type: 'container', parentId: 'form', children: ['nameField','emailField'], styles: { base: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } } }),
        nameField:  n({ id: 'nameField',  type: 'paragraph', parentId: 'row1', props: { text: 'Your name' }, styles: { base: { padding: '14px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem', opacity: '0.5' } } }),
        emailField: n({ id: 'emailField', type: 'paragraph', parentId: 'row1', props: { text: 'Email address' }, styles: { base: { padding: '14px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem', opacity: '0.5' } } }),
        row2: n({ id: 'row2', type: 'container', parentId: 'form', children: ['subjectField'], styles: { base: {} } }),
        subjectField: n({ id: 'subjectField', type: 'paragraph', parentId: 'row2', props: { text: 'Subject' }, styles: { base: { padding: '14px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem', opacity: '0.5', width: '100%' } } }),
        msgLabel: n({ id: 'msgLabel', type: 'heading', parentId: 'form', props: { text: 'Message', level: 'span' }, styles: { base: { fontSize: '0.8rem', fontWeight: '700', opacity: '0.6', marginBottom: '-8px' } } }),
        msgField: n({ id: 'msgField', type: 'paragraph', parentId: 'form', props: { text: 'Tell us about your project or question…' }, styles: { base: { padding: '14px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem', opacity: '0.5', minHeight: '120px' } } }),
        submit: n({ id: 'submit', type: 'button', parentId: 'form', props: { text: 'Send message →' }, styles: { base: { padding: '16px 32px', borderRadius: '10px', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', border: 'none', fontSize: '0.95rem', fontWeight: '900', cursor: 'pointer', color: '#fff', alignSelf: 'flex-start' } } }),
      },
    },
  },
];

const BLOG_TEMPLATES: NexusTemplate[] = [
  {
    id: 'blog-article', name: 'Blog Article', category: 'Blog',
    description: 'Clean article layout with title, meta, and body.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root:    n({ id: 'root', type: 'root', children: ['article'] }),
        article: n({ id: 'article', type: 'container', parentId: 'root', children: ['meta','title','divider','intro','body'], styles: { base: { maxWidth: '720px', margin: '0 auto', padding: '60px 24px', display: 'flex', flexDirection: 'column', gap: '24px' } } }),
        meta:    n({ id: 'meta', type: 'container', parentId: 'article', children: ['cat','date'], styles: { base: { display: 'flex', gap: '16px', alignItems: 'center' } } }),
        cat:     n({ id: 'cat', type: 'heading', parentId: 'meta', props: { text: 'DESIGN', level: 'span' }, styles: { base: { fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.12em', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '3px 10px', borderRadius: '40px' } } }),
        date:    n({ id: 'date', type: 'heading', parentId: 'meta', props: { text: 'May 11, 2026', level: 'span' }, styles: { base: { fontSize: '0.8rem', opacity: '0.45' } } }),
        title:   n({ id: 'title', type: 'heading', parentId: 'article', props: { text: 'The future of web design is static — and that\'s a good thing.', level: 'h1' }, styles: { base: { fontSize: '2.5rem', fontWeight: '900', lineHeight: '1.15', letterSpacing: '-0.03em' } } }),
        divider: n({ id: 'divider', type: 'divider', parentId: 'article', styles: { base: { border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '8px 0' } } }),
        intro:   n({ id: 'intro', type: 'paragraph', parentId: 'article', props: { text: 'For years, dynamic server-rendering was the default. Every page request triggered database queries, PHP execution, and megabytes of JavaScript. But the fastest website is one that\'s already rendered. Here\'s why the static renaissance is here to stay.' }, styles: { base: { fontSize: '1.15rem', lineHeight: '1.8', opacity: '0.75', fontStyle: 'italic' } } }),
        body:    n({ id: 'body', type: 'paragraph', parentId: 'article', props: { text: 'Static HTML compilation — pioneered by JAMstack tooling and now available directly in page builders — moves the rendering step from request-time to build-time. The result is a file read instead of a PHP execution pipeline. Sub-100ms Time to First Byte on shared hosting. Lighthouse 95+ by default.\n\nNexus Architect takes this approach to its logical conclusion: every page you design is compiled to a self-contained HTML file with scoped, minimal CSS. No external fonts loaded by default. No JavaScript runtime unless your page explicitly needs it.' }, styles: { base: { lineHeight: '1.85', opacity: '0.7' } } }),
      },
    },
  },

  // ── Blog Grid ────────────────────────────────────────────────────────────────
  {
    id: 'blog-grid', name: 'Blog Grid', category: 'Blog',
    description: 'Three-card editorial grid with categories and read-time.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['wrap'] }),
        wrap: n({ id: 'wrap', type: 'container', parentId: 'root', children: ['eyebrow','head','sub','grid'], styles: { base: { maxWidth: '1100px', margin: '0 auto', padding: '100px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' } } }),
        eyebrow: n({ id: 'eyebrow', type: 'heading', parentId: 'wrap', props: { text: 'FROM THE BLOG', level: 'span' }, styles: { base: { fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.18em', color: '#f472b6' } } }),
        head: n({ id: 'head', type: 'heading', parentId: 'wrap', props: { text: 'Stories, ideas & craft', level: 'h2' }, styles: { base: { fontSize: '2.6rem', fontWeight: '900', letterSpacing: '-0.03em', textAlign: 'center' } } }),
        sub: n({ id: 'sub', type: 'paragraph', parentId: 'wrap', props: { text: 'Dispatches from our team on design, engineering, and the future of the web.' }, styles: { base: { opacity: '0.5', textAlign: 'center', marginBottom: '32px' } } }),
        grid: n({ id: 'grid', type: 'container', parentId: 'wrap', children: ['c1','c2','c3'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '24px', width: '100%' } } }),
        c1:   n({ id: 'c1', type: 'container', parentId: 'grid', children: ['c1img','c1meta','c1title','c1exc','c1foot'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '16px', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' } } }),
        c1img:n({ id: 'c1img', type: 'container', parentId: 'c1', children: [], styles: { base: { height: '200px', background: 'linear-gradient(135deg,#7c3aed 0%,#2563eb 100%)', flexShrink: '0' } } }),
        c1meta:n({ id: 'c1meta', type: 'container', parentId: 'c1', children: ['c1cat','c1time'], styles: { base: { display: 'flex', gap: '12px', alignItems: 'center', padding: '0 24px' } } }),
        c1cat: n({ id: 'c1cat', type: 'heading', parentId: 'c1meta', props: { text: 'DESIGN', level: 'span' }, styles: { base: { fontSize: '0.6rem', fontWeight: '900', letterSpacing: '0.15em', color: '#a78bfa', background: 'rgba(124,58,237,0.15)', padding: '3px 8px', borderRadius: '40px' } } }),
        c1time:n({ id: 'c1time', type: 'heading', parentId: 'c1meta', props: { text: '5 min read', level: 'span' }, styles: { base: { fontSize: '0.75rem', opacity: '0.4' } } }),
        c1title:n({ id: 'c1title', type: 'heading', parentId: 'c1', props: { text: 'The case for opinionated defaults in design systems', level: 'h3' }, styles: { base: { fontSize: '1.1rem', fontWeight: '800', lineHeight: '1.4', padding: '0 24px' } } }),
        c1exc:n({ id: 'c1exc', type: 'paragraph', parentId: 'c1', props: { text: 'When teams fight over tokens instead of building products, something has gone wrong at the foundation level.' }, styles: { base: { fontSize: '0.875rem', opacity: '0.55', lineHeight: '1.7', padding: '0 24px' } } }),
        c1foot:n({ id: 'c1foot', type: 'container', parentId: 'c1', children: ['c1av','c1auth'], styles: { base: { display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' } } }),
        c1av:  n({ id: 'c1av', type: 'container', parentId: 'c1foot', children: [], styles: { base: { width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', flexShrink: '0' } } }),
        c1auth:n({ id: 'c1auth', type: 'heading', parentId: 'c1foot', props: { text: 'Leila Hassan · Apr 28', level: 'span' }, styles: { base: { fontSize: '0.8rem', opacity: '0.55' } } }),
        c2:   n({ id: 'c2', type: 'container', parentId: 'grid', children: ['c2img','c2meta','c2title','c2exc','c2foot'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '16px', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' } } }),
        c2img:n({ id: 'c2img', type: 'container', parentId: 'c2', children: [], styles: { base: { height: '200px', background: 'linear-gradient(135deg,#0ea5e9 0%,#10b981 100%)', flexShrink: '0' } } }),
        c2meta:n({ id: 'c2meta', type: 'container', parentId: 'c2', children: ['c2cat','c2time'], styles: { base: { display: 'flex', gap: '12px', alignItems: 'center', padding: '0 24px' } } }),
        c2cat: n({ id: 'c2cat', type: 'heading', parentId: 'c2meta', props: { text: 'ENGINEERING', level: 'span' }, styles: { base: { fontSize: '0.6rem', fontWeight: '900', letterSpacing: '0.15em', color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '3px 8px', borderRadius: '40px' } } }),
        c2time:n({ id: 'c2time', type: 'heading', parentId: 'c2meta', props: { text: '8 min read', level: 'span' }, styles: { base: { fontSize: '0.75rem', opacity: '0.4' } } }),
        c2title:n({ id: 'c2title', type: 'heading', parentId: 'c2', props: { text: 'How we cut our bundle size by 74% without rewriting a line of product code', level: 'h3' }, styles: { base: { fontSize: '1.1rem', fontWeight: '800', lineHeight: '1.4', padding: '0 24px' } } }),
        c2exc:n({ id: 'c2exc', type: 'paragraph', parentId: 'c2', props: { text: 'Tree-shaking alone will not save you. The real wins come from understanding exactly what runs in the critical path.' }, styles: { base: { fontSize: '0.875rem', opacity: '0.55', lineHeight: '1.7', padding: '0 24px' } } }),
        c2foot:n({ id: 'c2foot', type: 'container', parentId: 'c2', children: ['c2av','c2auth'], styles: { base: { display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' } } }),
        c2av:  n({ id: 'c2av', type: 'container', parentId: 'c2foot', children: [], styles: { base: { width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#10b981)', flexShrink: '0' } } }),
        c2auth:n({ id: 'c2auth', type: 'heading', parentId: 'c2foot', props: { text: 'Kai Nakamura · May 3', level: 'span' }, styles: { base: { fontSize: '0.8rem', opacity: '0.55' } } }),
        c3:   n({ id: 'c3', type: 'container', parentId: 'grid', children: ['c3img','c3meta','c3title','c3exc','c3foot'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '16px', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' } } }),
        c3img:n({ id: 'c3img', type: 'container', parentId: 'c3', children: [], styles: { base: { height: '200px', background: 'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)', flexShrink: '0' } } }),
        c3meta:n({ id: 'c3meta', type: 'container', parentId: 'c3', children: ['c3cat','c3time'], styles: { base: { display: 'flex', gap: '12px', alignItems: 'center', padding: '0 24px' } } }),
        c3cat: n({ id: 'c3cat', type: 'heading', parentId: 'c3meta', props: { text: 'PRODUCT', level: 'span' }, styles: { base: { fontSize: '0.6rem', fontWeight: '900', letterSpacing: '0.15em', color: '#fbbf24', background: 'rgba(245,158,11,0.15)', padding: '3px 8px', borderRadius: '40px' } } }),
        c3time:n({ id: 'c3time', type: 'heading', parentId: 'c3meta', props: { text: '4 min read', level: 'span' }, styles: { base: { fontSize: '0.75rem', opacity: '0.4' } } }),
        c3title:n({ id: 'c3title', type: 'heading', parentId: 'c3', props: { text: 'Why we shipped a worse feature on purpose — and what we learned', level: 'h3' }, styles: { base: { fontSize: '1.1rem', fontWeight: '800', lineHeight: '1.4', padding: '0 24px' } } }),
        c3exc:n({ id: 'c3exc', type: 'paragraph', parentId: 'c3', props: { text: 'Sometimes the most important signal comes not from your power users but from the people who almost churned.' }, styles: { base: { fontSize: '0.875rem', opacity: '0.55', lineHeight: '1.7', padding: '0 24px' } } }),
        c3foot:n({ id: 'c3foot', type: 'container', parentId: 'c3', children: ['c3av','c3auth'], styles: { base: { display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' } } }),
        c3av:  n({ id: 'c3av', type: 'container', parentId: 'c3foot', children: [], styles: { base: { width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', flexShrink: '0' } } }),
        c3auth:n({ id: 'c3auth', type: 'heading', parentId: 'c3foot', props: { text: 'Sofia Reyes · May 9', level: 'span' }, styles: { base: { fontSize: '0.8rem', opacity: '0.55' } } }),
      },
    },
  },
];

const PORTFOLIO_TEMPLATES: NexusTemplate[] = [
  // ── Creative Portfolio ────────────────────────────────────────────────────────
  {
    id: 'portfolio-creative', name: 'Creative Portfolio', category: 'Portfolio',
    description: 'Masonry-style project grid with hover overlays.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['wrap'] }),
        wrap: n({ id: 'wrap', type: 'container', parentId: 'root', children: ['header','grid'], styles: { base: { maxWidth: '1200px', margin: '0 auto', padding: '80px 32px', display: 'flex', flexDirection: 'column', gap: '60px' } } }),
        header: n({ id: 'header', type: 'container', parentId: 'wrap', children: ['eyebrow','head','sub','cta'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '700px' } } }),
        eyebrow:n({ id: 'eyebrow', type: 'heading', parentId: 'header', props: { text: 'PORTFOLIO', level: 'span' }, styles: { base: { fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.18em', color: '#f472b6' } } }),
        head:   n({ id: 'head', type: 'heading', parentId: 'header', props: { text: 'Work that speaks for itself.', level: 'h1' }, styles: { base: { fontSize: '3.5rem', fontWeight: '900', letterSpacing: '-0.04em', lineHeight: '1.1' } } }),
        sub:    n({ id: 'sub', type: 'paragraph', parentId: 'header', props: { text: 'Brand identities, digital experiences, and motion design from the past three years. Available for select projects in 2026.' }, styles: { base: { opacity: '0.55', lineHeight: '1.8', maxWidth: '500px' } } }),
        cta:    n({ id: 'cta', type: 'button', parentId: 'header', props: { text: 'Start a project →' }, styles: { base: { alignSelf: 'flex-start', padding: '14px 32px', borderRadius: '100px', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', border: 'none', fontSize: '0.95rem', fontWeight: '800', cursor: 'pointer', color: '#fff' } } }),
        grid:   n({ id: 'grid', type: 'container', parentId: 'wrap', children: ['p1','p2','p3','p4','p5','p6'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridAutoRows: '260px', gap: '16px' } } }),
        p1: n({ id: 'p1', type: 'container', parentId: 'grid', children: ['p1over'], styles: { base: { borderRadius: '16px', background: 'linear-gradient(135deg,#7c3aed 0%,#2563eb 100%)', position: 'relative', overflow: 'hidden', gridColumn: 'span 2' } } }),
        p1over:n({ id: 'p1over', type: 'container', parentId: 'p1', children: ['p1tag','p1n'], styles: { base: { position: 'absolute', bottom: '0', left: '0', right: '0', padding: '24px', background: 'linear-gradient(to top,rgba(0,0,0,0.75),transparent)' } } }),
        p1tag: n({ id: 'p1tag', type: 'heading', parentId: 'p1over', props: { text: 'Brand Identity', level: 'span' }, styles: { base: { fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.12em', opacity: '0.6' } } }),
        p1n:   n({ id: 'p1n', type: 'heading', parentId: 'p1over', props: { text: 'Luminary — Visual Identity System', level: 'h3' }, styles: { base: { fontSize: '1.1rem', fontWeight: '800' } } }),
        p2: n({ id: 'p2', type: 'container', parentId: 'grid', children: ['p2over'], styles: { base: { borderRadius: '16px', background: 'linear-gradient(135deg,#0ea5e9 0%,#10b981 100%)', position: 'relative', overflow: 'hidden' } } }),
        p2over:n({ id: 'p2over', type: 'container', parentId: 'p2', children: ['p2tag','p2n'], styles: { base: { position: 'absolute', bottom: '0', left: '0', right: '0', padding: '20px', background: 'linear-gradient(to top,rgba(0,0,0,0.7),transparent)' } } }),
        p2tag: n({ id: 'p2tag', type: 'heading', parentId: 'p2over', props: { text: 'Web Design', level: 'span' }, styles: { base: { fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.12em', opacity: '0.6' } } }),
        p2n:   n({ id: 'p2n', type: 'heading', parentId: 'p2over', props: { text: 'Tide — SaaS Dashboard', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '800' } } }),
        p3: n({ id: 'p3', type: 'container', parentId: 'grid', children: ['p3over'], styles: { base: { borderRadius: '16px', background: 'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)', position: 'relative', overflow: 'hidden' } } }),
        p3over:n({ id: 'p3over', type: 'container', parentId: 'p3', children: ['p3tag','p3n'], styles: { base: { position: 'absolute', bottom: '0', left: '0', right: '0', padding: '20px', background: 'linear-gradient(to top,rgba(0,0,0,0.7),transparent)' } } }),
        p3tag: n({ id: 'p3tag', type: 'heading', parentId: 'p3over', props: { text: 'Motion', level: 'span' }, styles: { base: { fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.12em', opacity: '0.6' } } }),
        p3n:   n({ id: 'p3n', type: 'heading', parentId: 'p3over', props: { text: 'Ember — Brand Film', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '800' } } }),
        p4: n({ id: 'p4', type: 'container', parentId: 'grid', children: ['p4over'], styles: { base: { borderRadius: '16px', background: 'linear-gradient(135deg,#ec4899 0%,#8b5cf6 100%)', position: 'relative', overflow: 'hidden' } } }),
        p4over:n({ id: 'p4over', type: 'container', parentId: 'p4', children: ['p4tag','p4n'], styles: { base: { position: 'absolute', bottom: '0', left: '0', right: '0', padding: '20px', background: 'linear-gradient(to top,rgba(0,0,0,0.7),transparent)' } } }),
        p4tag: n({ id: 'p4tag', type: 'heading', parentId: 'p4over', props: { text: 'Packaging', level: 'span' }, styles: { base: { fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.12em', opacity: '0.6' } } }),
        p4n:   n({ id: 'p4n', type: 'heading', parentId: 'p4over', props: { text: 'Grove — Organic Skincare', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '800' } } }),
        p5: n({ id: 'p5', type: 'container', parentId: 'grid', children: ['p5over'], styles: { base: { borderRadius: '16px', background: 'linear-gradient(135deg,#14b8a6 0%,#2563eb 100%)', position: 'relative', overflow: 'hidden', gridColumn: 'span 2' } } }),
        p5over:n({ id: 'p5over', type: 'container', parentId: 'p5', children: ['p5tag','p5n'], styles: { base: { position: 'absolute', bottom: '0', left: '0', right: '0', padding: '24px', background: 'linear-gradient(to top,rgba(0,0,0,0.7),transparent)' } } }),
        p5tag: n({ id: 'p5tag', type: 'heading', parentId: 'p5over', props: { text: 'Interactive', level: 'span' }, styles: { base: { fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.12em', opacity: '0.6' } } }),
        p5n:   n({ id: 'p5n', type: 'heading', parentId: 'p5over', props: { text: 'Atlas — Generative Data Art Installation', level: 'h3' }, styles: { base: { fontSize: '1.1rem', fontWeight: '800' } } }),
        p6: n({ id: 'p6', type: 'container', parentId: 'grid', children: ['p6over'], styles: { base: { borderRadius: '16px', background: 'linear-gradient(135deg,#6366f1 0%,#a855f7 100%)', position: 'relative', overflow: 'hidden' } } }),
        p6over:n({ id: 'p6over', type: 'container', parentId: 'p6', children: ['p6tag','p6n'], styles: { base: { position: 'absolute', bottom: '0', left: '0', right: '0', padding: '20px', background: 'linear-gradient(to top,rgba(0,0,0,0.7),transparent)' } } }),
        p6tag: n({ id: 'p6tag', type: 'heading', parentId: 'p6over', props: { text: 'Typography', level: 'span' }, styles: { base: { fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.12em', opacity: '0.6' } } }),
        p6n:   n({ id: 'p6n', type: 'heading', parentId: 'p6over', props: { text: 'Serif — Type Specimen', level: 'h3' }, styles: { base: { fontSize: '1rem', fontWeight: '800' } } }),
      },
    },
  },
  // ── Photography Portfolio ─────────────────────────────────────────────────────
  {
    id: 'portfolio-photography', name: 'Photography Portfolio', category: 'Portfolio',
    description: 'Full-screen cinematic photo studio with bold typography.',
    createdAt: new Date(0).toISOString(),
    snapshot: {
      rootNodeId: 'root', globalStyles: {},
      nodeMap: {
        root: n({ id: 'root', type: 'root', children: ['wrap'] }),
        wrap: n({ id: 'wrap', type: 'container', parentId: 'root', children: ['nav','hero','series'], styles: { base: { display: 'flex', flexDirection: 'column', minHeight: '100vh' } } }),
        nav:  n({ id: 'nav', type: 'container', parentId: 'wrap', children: ['logo','navlinks'], styles: { base: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 48px', position: 'sticky', top: '0', zIndex: '100', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' } } }),
        logo: n({ id: 'logo', type: 'heading', parentId: 'nav', props: { text: 'REYES', level: 'span' }, styles: { base: { fontSize: '1rem', fontWeight: '900', letterSpacing: '0.2em' } } }),
        navlinks: n({ id: 'navlinks', type: 'container', parentId: 'nav', children: ['nl1','nl2','nl3'], styles: { base: { display: 'flex', gap: '32px' } } }),
        nl1: n({ id: 'nl1', type: 'heading', parentId: 'navlinks', props: { text: 'Work', level: 'span' }, styles: { base: { fontSize: '0.85rem', opacity: '0.6', cursor: 'pointer' } } }),
        nl2: n({ id: 'nl2', type: 'heading', parentId: 'navlinks', props: { text: 'About', level: 'span' }, styles: { base: { fontSize: '0.85rem', opacity: '0.6', cursor: 'pointer' } } }),
        nl3: n({ id: 'nl3', type: 'heading', parentId: 'navlinks', props: { text: 'Contact', level: 'span' }, styles: { base: { fontSize: '0.85rem', opacity: '0.6', cursor: 'pointer' } } }),
        hero: n({ id: 'hero', type: 'container', parentId: 'wrap', children: ['heroimg','herotext'], styles: { base: { position: 'relative', height: '90vh', overflow: 'hidden' } } }),
        heroimg:n({ id: 'heroimg', type: 'container', parentId: 'hero', children: [], styles: { base: { position: 'absolute', inset: '0', background: 'linear-gradient(160deg,#0c0c14 0%,#1a0a2e 40%,#0a1a14 100%)' } } }),
        herotext:n({ id: 'herotext', type: 'container', parentId: 'hero', children: ['heyebrow','htitle','hsub','hcta'], styles: { base: { position: 'absolute', bottom: '80px', left: '80px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '700px' } } }),
        heyebrow:n({ id: 'heyebrow', type: 'heading', parentId: 'herotext', props: { text: 'DOCUMENTARY & PORTRAIT', level: 'span' }, styles: { base: { fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.2em', opacity: '0.5' } } }),
        htitle:n({ id: 'htitle', type: 'heading', parentId: 'herotext', props: { text: 'Capturing the human story.', level: 'h1' }, styles: { base: { fontSize: '5rem', fontWeight: '900', letterSpacing: '-0.04em', lineHeight: '1.05', whiteSpace: 'pre-line' } } }),
        hsub: n({ id: 'hsub', type: 'paragraph', parentId: 'herotext', props: { text: 'Award-winning documentary and portrait photography. Available for editorial, advertising, and personal projects worldwide.' }, styles: { base: { opacity: '0.55', lineHeight: '1.75', maxWidth: '480px' } } }),
        hcta: n({ id: 'hcta', type: 'container', parentId: 'herotext', children: ['hbtn1','hbtn2'], styles: { base: { display: 'flex', gap: '16px' } } }),
        hbtn1:n({ id: 'hbtn1', type: 'button', parentId: 'hcta', props: { text: 'View portfolio' }, styles: { base: { padding: '16px 36px', borderRadius: '100px', background: '#fff', color: '#000', border: 'none', fontSize: '0.95rem', fontWeight: '900', cursor: 'pointer' } } }),
        hbtn2:n({ id: 'hbtn2', type: 'button', parentId: 'hcta', props: { text: 'Book a session' }, styles: { base: { padding: '16px 36px', borderRadius: '100px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer' } } }),
        series:n({ id: 'series', type: 'container', parentId: 'wrap', children: ['stitle','sgrid'], styles: { base: { padding: '80px 48px', display: 'flex', flexDirection: 'column', gap: '40px' } } }),
        stitle:n({ id: 'stitle', type: 'heading', parentId: 'series', props: { text: 'Selected Series', level: 'h2' }, styles: { base: { fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.03em' } } }),
        sgrid: n({ id: 'sgrid', type: 'container', parentId: 'series', children: ['s1','s2','s3'], styles: { base: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' } } }),
        s1: n({ id: 's1', type: 'container', parentId: 'sgrid', children: ['s1img','s1info'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '12px' } } }),
        s1img:n({ id: 's1img', type: 'container', parentId: 's1', children: [], styles: { base: { height: '340px', borderRadius: '12px', background: 'linear-gradient(145deg,#1a1a2e 0%,#2d1b4e 100%)', overflow: 'hidden' } } }),
        s1info:n({ id: 's1info', type: 'container', parentId: 's1', children: ['s1n','s1d'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '4px' } } }),
        s1n:  n({ id: 's1n', type: 'heading', parentId: 's1info', props: { text: 'Portraits of Stillness', level: 'h4' }, styles: { base: { fontSize: '1rem', fontWeight: '800' } } }),
        s1d:  n({ id: 's1d', type: 'paragraph', parentId: 's1info', props: { text: '36 images · 2025' }, styles: { base: { fontSize: '0.8rem', opacity: '0.45' } } }),
        s2: n({ id: 's2', type: 'container', parentId: 'sgrid', children: ['s2img','s2info'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '12px' } } }),
        s2img:n({ id: 's2img', type: 'container', parentId: 's2', children: [], styles: { base: { height: '340px', borderRadius: '12px', background: 'linear-gradient(145deg,#0a1a0a 0%,#0d2a1a 100%)', overflow: 'hidden' } } }),
        s2info:n({ id: 's2info', type: 'container', parentId: 's2', children: ['s2n','s2d'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '4px' } } }),
        s2n:  n({ id: 's2n', type: 'heading', parentId: 's2info', props: { text: 'Urban Isolation', level: 'h4' }, styles: { base: { fontSize: '1rem', fontWeight: '800' } } }),
        s2d:  n({ id: 's2d', type: 'paragraph', parentId: 's2info', props: { text: '52 images · 2024' }, styles: { base: { fontSize: '0.8rem', opacity: '0.45' } } }),
        s3: n({ id: 's3', type: 'container', parentId: 'sgrid', children: ['s3img','s3info'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '12px' } } }),
        s3img:n({ id: 's3img', type: 'container', parentId: 's3', children: [], styles: { base: { height: '340px', borderRadius: '12px', background: 'linear-gradient(145deg,#1a0a0a 0%,#2e1a0a 100%)', overflow: 'hidden' } } }),
        s3info:n({ id: 's3info', type: 'container', parentId: 's3', children: ['s3n','s3d'], styles: { base: { display: 'flex', flexDirection: 'column', gap: '4px' } } }),
        s3n:  n({ id: 's3n', type: 'heading', parentId: 's3info', props: { text: 'Light & Grain', level: 'h4' }, styles: { base: { fontSize: '1rem', fontWeight: '800' } } }),
        s3d:  n({ id: 's3d', type: 'paragraph', parentId: 's3info', props: { text: '28 images · 2024' }, styles: { base: { fontSize: '0.8rem', opacity: '0.45' } } }),
      },
    },
  },
];

export const ALL_STARTERS = [...STARTERS, ...LANDING_TEMPLATES, ...SECTION_TEMPLATES, ...BLOG_TEMPLATES, ...PORTFOLIO_TEMPLATES];

const CATEGORIES = ['All', 'Starters', 'Landing Pages', 'Sections', 'Blog', 'Portfolio'] as const;
type Category = typeof CATEGORIES[number];

// ─── Thumbnail component ──────────────────────────────────────────────────────

function TemplateThumbnail({ id }: { id: string }) {
  const svg = THUMB_SVG[id];
  if (!svg) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: '#09100c' }}>
        <LayoutTemplate size={22} style={{ color: '#bbcabf', opacity: 0.3 }} />
      </div>
    );
  }
  return (
    <div
      className="w-full h-full"
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ lineHeight: 0 }}
    />
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template, isBuiltIn, onApply, onDelete,
}: {
  template:  NexusTemplate;
  isBuiltIn: boolean;
  onApply:   () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className="group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-[140ms]"
      style={{ background: '#1a211d', border: '1px solid rgba(255,255,255,0.10)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
    >
      {/* Thumbnail */}
      <div className="h-[70px] overflow-hidden" style={{ background: '#09100c' }}>
        <TemplateThumbnail id={template.id} />
      </div>

      {/* Info */}
      <div className="px-2 py-1.5">
        <p className="text-[11px] font-bold truncate" style={{ color: '#dde4dd' }}>
          {template.name}
        </p>
        {template.description && (
          <p className="text-[10px] leading-snug mt-0.5"
            style={{
              color: '#bbcabf',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
            {template.description}
          </p>
        )}
      </div>

      {/* Hover overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-[140ms]"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      >
        <button
          onClick={onApply}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold"
          style={{ background: '#10b77f', color: '#fff' }}
        >
          Apply <ChevronRight size={10} />
        </button>
        {!isBuiltIn && onDelete && (
          <button
            onClick={onDelete}
            className="h-7 w-7 flex items-center justify-center rounded-md"
            style={{ background: 'rgba(147,0,10,0.20)', color: '#ffb4ab' }}
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Save form ────────────────────────────────────────────────────────────────

function SaveTemplateForm({ onSaved }: { onSaved: (t: NexusTemplate) => void }) {
  const page = useCanvasStore((s) => s.page);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  const save = useCallback(async () => {
    if (!page || !name.trim()) return;
    setBusy(true);
    const descTrimmed = desc.trim();
    const tpl: NexusTemplate = {
      id:          `tpl-${Date.now()}`,
      name:        name.trim(),
      ...(descTrimmed ? { description: descTrimmed } : {}),
      category:    'Saved',
      createdAt:   new Date().toISOString(),
      snapshot:    clone({ rootNodeId: page.rootNodeId, nodeMap: page.nodeMap, globalStyles: page.globalStyles }),
    };
    onSaved(tpl);
    setName(''); setDesc('');
    setBusy(false);
  }, [page, name, desc, onSaved]);

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg"
      style={{ background: '#09100c', border: '1px solid rgba(255,255,255,0.10)' }}>
      <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#bbcabf' }}>
        Save current page as template
      </p>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Template name…" className="inspector-input" />
      <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
        placeholder="Optional description…" className="inspector-input" />
      <button
        onClick={save}
        disabled={!name.trim() || busy || !page}
        className="flex items-center justify-center gap-1.5 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 transition-all duration-[140ms]"
        style={{ background: '#10b77f', color: '#fff' }}
      >
        <Save size={12} />
        {busy ? 'Saving…' : 'Save Template'}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TemplatesPanel() {
  const page     = useCanvasStore((s) => s.page);
  const loadPage = useCanvasStore((s) => s.loadPage);
  const adapter  = useAdapter();

  const [userTemplates, setUserTemplates] = useState<NexusTemplate[]>([]);
  const [tab,           setTab]           = useState<'browse' | 'save'>('browse');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [loading,       setLoading]       = useState(false);

  const fetchTemplates = useCallback(async () => {
    const listFn = (adapter.data as unknown as { listTemplates?: () => Promise<NexusTemplate[]> }).listTemplates;
    if (!listFn) return;
    setLoading(true);
    try { setUserTemplates(await listFn()); } catch { /* silent */ } finally { setLoading(false); }
  }, [adapter]);

  useEffect(() => { void fetchTemplates(); }, [fetchTemplates]);

  const applyTemplate = useCallback((tpl: NexusTemplate) => {
    const activePage = page ?? createPage({ title: 'Untitled Page', slug: 'untitled-page' });
    if (!page) loadPage(activePage);

    const snap  = tpl.snapshot;
    const idMap = new Map<string, string>();

    const mapId = (oldId: string): string => {
      if (oldId === snap.rootNodeId) return activePage.rootNodeId;
      if (!idMap.has(oldId)) idMap.set(oldId, genId());
      return idMap.get(oldId)!;
    };

    const newNodeMap: typeof activePage.nodeMap = {};
    const walk = (id: string, parentId: string | null) => {
      const orig = snap.nodeMap[id];
      if (!orig) return;
      const newId       = mapId(id);
      const newChildren = orig.children.map((c) => mapId(c));
      newNodeMap[newId] = { ...clone(orig), id: newId, parentId, children: newChildren };
      orig.children.forEach((c) => walk(c, newId));
    };
    walk(snap.rootNodeId, null);

    loadPage({
      ...activePage,
      rootNodeId:   activePage.rootNodeId,
      nodeMap:      newNodeMap,
      globalStyles: { ...activePage.globalStyles, ...snap.globalStyles },
      updatedAt:    new Date().toISOString(),
    });

    useCanvasStore.getState().markDirty();
  }, [page, loadPage]);

  const saveTemplate = useCallback(async (tpl: NexusTemplate) => {
    setUserTemplates((prev) => [tpl, ...prev]);
    const saveFn = (adapter.data as unknown as { saveTemplate?: (t: NexusTemplate) => Promise<NexusTemplate> }).saveTemplate;
    if (saveFn) { try { await saveFn(tpl); } catch { /* silent */ } }
    setTab('browse');
    setActiveCategory('All');
  }, [adapter]);

  const deleteTemplate = useCallback(async (id: string) => {
    setUserTemplates((prev) => prev.filter((t) => t.id !== id));
    const delFn = (adapter.data as unknown as { deleteTemplate?: (id: string) => Promise<void> }).deleteTemplate;
    if (delFn) { try { await delFn(id); } catch { /* silent */ } }
  }, [adapter]);

  const allTemplates = [...ALL_STARTERS, ...userTemplates];

  // Filter by category + search
  const filtered = allTemplates.filter((t) => {
    const matchesCat    = activeCategory === 'All' || t.category === activeCategory;
    const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Group by category for "All" view
  const grouped: Record<string, NexusTemplate[]> = {};
  if (activeCategory === 'All') {
    for (const t of filtered) (grouped[t.category] ??= []).push(t);
  } else {
    grouped[activeCategory] = filtered;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
        {(['browse', 'save'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-[140ms]',
              tab === t
                ? 'border-b-2 border-[#10b77f] text-[#dde4dd] -mb-px'
                : 'text-[#bbcabf] hover:text-[#bbcabf]',
            )}>
            {t === 'browse' ? 'Browse' : 'Save Current'}
          </button>
        ))}
      </div>

      {tab === 'save' && (
        <div className="p-3">
          <SaveTemplateForm onSaved={saveTemplate} />
        </div>
      )}

      {tab === 'browse' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md"
              style={{ background: '#09100c', border: '1px solid rgba(255,255,255,0.10)' }}>
              <Search size={11} style={{ color: '#bbcabf' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates…"
                className="flex-1 bg-transparent text-[11px] outline-none"
                style={{ color: '#dde4dd' }}
              />
            </div>
          </div>

          {/* Category filter — dropdown */}
          <div className="flex items-center gap-2 px-3 py-2 shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value as Parameters<typeof setActiveCategory>[0])}
              className="flex-1 h-7 rounded-md px-2 text-[11px] font-semibold outline-none cursor-pointer"
              style={{
                background: '#09100c',
                border:     '1px solid rgba(255,255,255,0.10)',
                color:      '#dde4dd',
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={fetchTemplates}
              disabled={loading}
              title="Refresh templates"
              className="flex items-center justify-center w-7 h-7 rounded-md transition-colors disabled:opacity-50 shrink-0 hover:bg-[rgba(255,255,255,0.04)]"
              style={{ color: '#bbcabf' }}
            >
              <RefreshCw size={11} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Template grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 flex flex-col gap-4">
              {Object.entries(grouped).map(([cat, templates]) => (
                <div key={cat}>
                  {activeCategory === 'All' && (
                    <p className="text-[10px] font-black uppercase tracking-[0.10em] mb-2"
                      style={{ color: '#bbcabf' }}>
                      {cat}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {templates.map((tpl) => (
                      <TemplateCard
                        key={tpl.id}
                        template={tpl}
                        isBuiltIn={!tpl.id.startsWith('tpl-')}
                        onApply={() => applyTemplate(tpl)}
                        onDelete={() => deleteTemplate(tpl.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Plus size={20} style={{ color: '#bbcabf', opacity: 0.4 }} />
                  <p className="text-[11px]" style={{ color: '#bbcabf' }}>
                    {searchQuery ? 'No templates match your search' : 'No templates in this category'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setTab('save')}
                      className="text-[11px] font-bold underline"
                      style={{ color: '#50dea3' }}
                    >
                      Save current page as template
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
