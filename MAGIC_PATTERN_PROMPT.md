# Magic Pattern — Nexus Architect Design System Repair Brief

> **Copy this entire document into Magic Pattern's prompt field.**  
> Goal: Generate a corrected CSS token layer + component overrides that fix critical contrast failures in a professional dark-theme page builder UI.

---

## 1. Project Context

**Product:** Nexus Architect — a drag-and-drop visual page builder (think Elementor / Webflow / Framer)  
**Stack:** React + TypeScript + Tailwind CSS v3 + Radix UI primitives  
**Theme:** Dark-only. No light mode. The UI is the "chrome" that frames a white canvas where users build pages.  
**Architecture:** All colors live in CSS custom properties on `:root`. Tailwind's config references them via `var()`. Components use semantic Tailwind classes like `bg-[var(--color-surface)]`, `text-text-secondary`, `border-[var(--color-border)]`.

---

## 2. Design Vision — "Arc" System

The aesthetic is **ultra-deep space** — a near-black navy background with a **Violet (#8B5CF6) + Cyan (#22D3EE)** accent palette. The builder UI should feel like a professional tool: precise, focused, and recessive so the white canvas commands attention. Think: Figma's dark sidebar × Framer's slick inspector × a subtle violet aura.

**Brand gradient:** `linear-gradient(135deg, #8B5CF6 0%, #22D3EE 100%)`  
**Primary interactive color:** Violet `#8B5CF6` (buttons, selection rings, active states)  
**Energy/data color:** Cyan `#22D3EE` (live indicators, badges, highlights)  

---

## 3. Current Token Inventory (the broken system)

```css
/* CURRENT :root values — these have critical contrast failures */

--color-bg:              #06091A;   /* outermost shell / canvas frame area */
--color-surface:         #0C1025;   /* panel / sidebar ground */
--color-surface-hover:   #111830;   /* hover lift */
--color-surface-active:  #16203C;   /* pressed / selected surface */

--color-text-primary:   #F1F5F9;
--color-text-secondary: #94A3B8;
--color-text-muted:     #4A5568;   /* ← WCAG FAIL: 2.46:1 on surface */
--color-text-disabled:  #2D3748;   /* ← nearly invisible: 1.57:1 */

--color-accent:         #8B5CF6;   /* ← borderline AA: 4.37:1 on surface */
--color-border:         rgba(139, 92, 246, 0.12);  /* ← near-invisible borders */
--color-border-strong:  rgba(139, 92, 246, 0.28);
```

---

## 4. Diagnosed Problems (with WCAG contrast ratios)

### Problem A — Panel surfaces are imperceptible (the #1 complaint)

| Pair | Current contrast | Target |
|------|-----------------|--------|
| bg `#06091A` vs surface `#0C1025` | **1.05:1** | ≥ 1.40:1 |
| surface vs surface-hover | **1.07:1** | ≥ 1.25:1 |
| surface vs surface-active | **1.09:1** | ≥ 1.40:1 |

The left and right inspector panels, palette cards, section headers, and accordion groups all vanish into the background. Users cannot perceive panel boundaries or interactive state changes.

### Problem B — Text hierarchy is broken

| Token | Hex | Ratio on surface | WCAG |
|-------|-----|-----------------|------|
| `text-muted` | `#4A5568` | **2.46:1** | ❌ FAIL |
| `text-disabled` | `#2D3748` | **1.57:1** | ❌ FAIL |
| `accent` (as text) | `#8B5CF6` | **4.37:1** | ⚠️ borderline |

`text-muted` is used extensively for inspector labels, panel section headers, placeholder text, and icon labels. Every one of these is currently unreadable.

### Problem C — Borders are invisible

`rgba(139, 92, 246, 0.12)` at 12% opacity on a `#0C1025` surface produces **no perceptible edge**. Inspector inputs, palette card outlines, panel separators, and accordion dividers are invisible. The entire UI reads as one flat slab.

### Problem D — No elevation depth language

There are only 4 surface steps, all within a 1.09:1 contrast range of each other. Professional tools use a clear elevation model: **ground → raised → overlay → modal** — each layer perceptibly lighter, signaling interactability and depth.

---

## 5. Required Output — Corrected CSS Custom Properties

Generate a complete `:root { }` block with these token groups. Keep ALL existing token names — only change values. Also add the new tokens marked `[NEW]`.

### 5a. Surface Elevation Model

The deep navy hue is `232°`. Maintain it. Increase lightness in ~5-point HSL steps so each level is perceptibly distinct. Target ratios:

| Token | vs `--color-bg` | vs previous step |
|-------|----------------|-----------------|
| `--color-surface` | ≥ 1.35:1 | — |
| `--color-surface-hover` | ≥ 1.60:1 | ≥ 1.20:1 |
| `--color-surface-active` | ≥ 1.90:1 | ≥ 1.18:1 |
| `--color-surface-raised` [NEW] | ≥ 2.30:1 | ≥ 1.20:1 |
| `--color-overlay` [NEW] | ≥ 2.80:1 | ≥ 1.20:1 |

`--color-surface-raised` is for dropdowns, context menus, and tooltips.  
`--color-overlay` is for modals and floating panels.

### 5b. Text Hierarchy

All text tokens must pass WCAG AA (4.5:1) on `--color-surface`. Use the slate/blue-gray family. Maintain perceptible 4-step hierarchy: primary → secondary → muted → disabled.

| Token | Min ratio | Character |
|-------|-----------|-----------|
| `--color-text-primary` | ≥ 15:1 | Slate-100 family |
| `--color-text-secondary` | ≥ 7:1 | Slate-400 family |
| `--color-text-muted` | ≥ 4.5:1 | **Fix required** — use ≈ slate-500/400 |
| `--color-text-disabled` | ≥ 3:1 | ≈ slate-600 |
| `--color-text-on-accent` [NEW] | ≥ 4.5:1 | White/near-white, for text on violet bg |

### 5c. Borders — Visible but Subtle

Replace the opacity-based border system with values that are perceptible on dark surfaces.

| Token | Requirement |
|-------|-------------|
| `--color-border` | Minimum **20% opacity** violet, or neutral rgba(255,255,255,0.08) |
| `--color-border-strong` | Minimum **35% opacity** violet |
| `--color-border-accent` | 60% opacity violet |
| `--color-border-subtle` [NEW] | Neutral: `rgba(255,255,255,0.06)` — for elevation separators |
| `--color-border-vivid` | 40% opacity cyan |

### 5d. Accent Colors

The accent must pass WCAG AA (4.5:1) as foreground text on `--color-surface`.

| Token | Requirement |
|-------|-------------|
| `--color-accent` | Keep violet hue. If `#8B5CF6` fails AA on new surface, lighten to `#9B76FA` or `#A78BFA` |
| `--color-accent-text` [NEW] | Lighter violet for use as TEXT on dark surfaces. Must hit ≥ 5:1 |
| `--color-accent-hover` | Keep darker violet for hover state on buttons |
| `--color-accent-subtle` | 12–15% opacity violet — used for selected row tints |
| `--color-accent-glow` | 35% opacity violet — for shadow/glow effects |

### 5e. Keep Unchanged

These tokens are working correctly. Do not modify:
- All `--gradient-*` tokens (keep brand gradient)
- `--color-vivid` + `--color-vivid-hover` + `--color-vivid-glow`
- All `--color-canvas` and `--color-canvas-frame` tokens
- All `--btn-*` sizing tokens
- All `--ease-*` and `--duration-*` motion tokens
- `--color-success / --color-warning / --color-error / --color-info`

---

## 6. Required Output — Component CSS Classes

Generate the following utility/component classes for `@layer components {}` or `@layer utilities {}` in a Tailwind CSS globals.css file. These supplement the token fixes.

### 6a. Panel & Surface Classes

```
.panel-base        — bg: --color-surface, border: 1px --color-border-subtle, appropriate shadow
.panel-raised      — bg: --color-surface-raised, stronger border, box-shadow for elevation
.inspector-section — Visual separator between inspector accordion groups
.palette-card      — Draggable widget tile: defined background, visible border, hover state
.palette-card:hover — Lifted state with border-strong + subtle glow
```

### 6b. Input Fields (Inspector Controls)

Inspector inputs sit inside dark panels. They must look like inputs, not invisible text.

```
.inspector-input   — bg slightly lighter than surface, visible border, text-primary, 
                     focus ring: 2px --color-accent
.inspector-label   — text-muted (the fixed one), text-[11px], font-medium, uppercase tracking
.inspector-select  — Same as input but with dropdown arrow in --color-text-muted
```

### 6c. Interactive State Classes

```
.node-selected     — 2px solid --color-accent ring + subtle --color-accent-subtle bg tint
.node-hovered      — 1px dashed --color-accent at 50% opacity
.layer-row-active  — --color-accent-subtle bg, text-primary, left border accent line
.tab-active        — Bottom border 2px --color-accent, text-primary weight-medium
.tab-inactive      — text-muted, hover: text-secondary
```

### 6d. Depth / Elevation Shadows

```css
/* Define these as CSS custom properties: */
--shadow-sm:   0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04);
--shadow-md:   0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
--shadow-lg:   0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.15);
--shadow-accent: 0 0 20px rgba(139,92,246,0.40);
--shadow-vivid:  0 0 16px rgba(34,211,238,0.25);
```

### 6e. Topbar

```
.topbar            — bg: slightly lighter than --color-bg (or --color-surface), 
                     bottom border: 1px --color-border-subtle,
                     ::after pseudo: 1px gradient line (violet → cyan) at very bottom
.topbar-btn        — Rounded pill/rect button, text-secondary, hover bg: --color-surface-hover
.topbar-btn-active — bg: --color-accent-subtle, text: --color-accent-text, border: --color-border-accent
```

---

## 7. Output Format Instructions

Please generate the following files:

### File 1: `arc-tokens.css`
Complete `:root { }` block with ALL token groups. Comment each group. Show the contrast ratio of each text/surface pairing in a comment.

### File 2: `arc-components.css`
All `@layer components {}` classes listed in Section 6. Use `var(--token-name)` for all colors. Each class should have a comment explaining what it styles.

### File 3: `arc-tailwind-patch.ts` (TypeScript)
A partial Tailwind config `theme.extend` object showing only the tokens that need to change. Format:
```typescript
// Paste this into tailwind.config.ts → theme.extend
export const arcThemeExtend = { colors: { ... }, boxShadow: { ... } }
```

### File 4: `arc-audit.md`
Before/after contrast ratio table for every changed token pair. Mark WCAG AA pass (✓) or fail (✗).

---

## 8. Hard Constraints

1. **Dark-only.** No light mode. No `@media (prefers-color-scheme: light)`.
2. **Tailwind-compatible.** Every color must be expressible as `var(--token)` inside Tailwind's config.
3. **Same hue family.** Keep hue 228–235° (deep navy/indigo) for all surface tokens. Do not shift to pure black (#000) or neutral gray.
4. **Violet + Cyan palette.** Do not introduce new accent colors. The only interactive colors are violet and cyan.
5. **No external deps.** Output must be pure CSS + TypeScript config — no SASS, no PostCSS plugins, no JS runtime.
6. **Preserve all token names.** Components import these by name. Renaming breaks the build.
7. **WCAG 2.1 AA minimum.** Every text/background pair that appears in body copy, labels, or interactive elements must pass 4.5:1. Large text / decorative elements minimum 3:1.

---

## 9. Reference: Component Inventory (what gets restyled)

The following React components consume these tokens and must look correct after your output is applied:

| Component | Key tokens consumed |
|-----------|-------------------|
| `TopBar.tsx` | bg, border-subtle, text-primary, accent-gradient |
| `LeftPanel.tsx` | surface, border, text-muted, text-secondary, accent |
| `RightPanel.tsx` | surface, border, text-muted, inspector-input, accordion |
| `Canvas.tsx` | canvas-frame (bg), canvas (white), selection chrome |
| `PaletteCard` | surface, border, border-strong, text-secondary, accent icon |
| `LayerRow` | surface-hover, layer-row-active, text-muted, accent |
| `Inspector inputs` | surface, border, text-primary, text-muted (labels), focus accent |
| `AccordionSection` | border (divider), text-muted (label), text-primary (open) |
| `Button` variants | accent (primary), surface-raised (secondary), error |
| `CanvasNodeWrapper` | node-selected, node-hovered, accent badge |

---

## 10. Tone & Quality Bar

This is a premium commercial product competing with Elementor and Framer. The design system must feel:
- **Precise** — every spacing and color choice intentional
- **Recessive** — the builder UI should not distract from the canvas
- **Professional** — not "dark hacker terminal" — more "Figma professional dark"
- **Vibrant accents** — the violet/cyan should pop against the muted chrome, not blend in

Think of it as: the panels are shadows, the accents are light.

---

*End of brief. Generate all 4 files listed in Section 7.*
