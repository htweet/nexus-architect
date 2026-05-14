import type { Config } from 'tailwindcss';

/**
 * Nexus Architect — Executive Dark Tailwind Config v2
 *
 * Single source of truth: MD3 "Charcoal & Emerald" palette from DESIGN.md.
 * No CSS custom-property indirection — all values are concrete hex / rgba.
 */

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/core/src/**/*.{ts,tsx}',
  ],

  theme: {
    extend: {

      /* ── MD3 colour palette ───────────────────────────────────────── */
      colors: {

        /* Surface scale */
        'surface':                    '#0e1511',
        'surface-dim':                '#0e1511',
        'surface-bright':             '#343b36',
        'surface-container-lowest':   '#09100c',
        'surface-container-low':      '#161d19',
        'surface-container':          '#1a211d',
        'surface-container-high':     '#242c27',
        'surface-container-highest':  '#2f3632',
        'surface-variant':            '#2f3632',
        'surface-tint':               '#50dea3',

        /* On-surface */
        'on-surface':                 '#dde4dd',
        'on-surface-variant':         '#bbcabf',
        'inverse-surface':            '#dde4dd',
        'inverse-on-surface':         '#2b322d',

        /* Primary / emerald */
        'primary':                    '#50dea3',
        'on-primary':                 '#003824',
        'primary-container':          '#10b77f',
        'on-primary-container':       '#00402a',
        'primary-fixed':              '#70fbbd',
        'primary-fixed-dim':          '#50dea3',
        'on-primary-fixed':           '#002113',
        'on-primary-fixed-variant':   '#005236',
        'inverse-primary':            '#006c49',

        /* Secondary */
        'secondary':                  '#c8c6c5',
        'on-secondary':               '#303030',
        'secondary-container':        '#474746',
        'on-secondary-container':     '#b6b5b4',
        'secondary-fixed':            '#e4e2e1',
        'secondary-fixed-dim':        '#c8c6c5',
        'on-secondary-fixed':         '#1b1c1c',
        'on-secondary-fixed-variant': '#474746',

        /* Tertiary */
        'tertiary':                   '#ffb3af',
        'on-tertiary':                '#650912',
        'tertiary-container':         '#f97a77',
        'on-tertiary-container':      '#6f1218',
        'tertiary-fixed':             '#ffdad7',
        'tertiary-fixed-dim':         '#ffb3af',
        'on-tertiary-fixed':          '#410006',
        'on-tertiary-fixed-variant':  '#842325',

        /* Error */
        'error':                      '#ffb4ab',
        'on-error':                   '#690005',
        'error-container':            '#93000a',
        'on-error-container':         '#ffdad6',

        /* Background / outline */
        'background':                 '#0e1511',
        'on-background':              '#dde4dd',
        'outline':                    '#86948a',
        'outline-variant':            '#3c4a42',

        /* Warning (non-MD3 utility) */
        'warning':                    '#f59e0b',
        'on-warning':                 '#000000',
        'warning-subtle':             'rgba(245,158,11,0.10)',

        /* Canvas (always white) */
        'canvas':                     '#ffffff',

        /* Emerald semantic aliases (convenience) */
        'accent':                     '#10b77f',
        'accent-hover':               '#0da870',
        'accent-pressed':             '#0a9668',
        'accent-subtle':              'rgba(16,183,127,0.08)',
        'accent-muted':               'rgba(16,183,127,0.15)',
        'accent-text':                '#50dea3',
      },

      /* ── Typography ────────────────────────────────────────────────── */
      fontFamily: {
        'display':    ['Inter', 'system-ui', 'sans-serif'],
        'headline':   ['Inter', 'system-ui', 'sans-serif'],
        'body-lg':    ['Inter', 'system-ui', 'sans-serif'],
        'body-sm':    ['Inter', 'system-ui', 'sans-serif'],
        'label-caps': ['Inter', 'system-ui', 'sans-serif'],
        'mono-label': ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans:         ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono:         ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      fontSize: {
        'display':    ['32px', { lineHeight: '1.2',  letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline':   ['20px', { lineHeight: '1.4',  letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg':    ['16px', { lineHeight: '1.5',  letterSpacing: '0',       fontWeight: '400' }],
        'body-sm':    ['14px', { lineHeight: '1.5',  letterSpacing: '0',       fontWeight: '400' }],
        'label-caps': ['11px', { lineHeight: '1rem', letterSpacing: '0.05em',  fontWeight: '700' }],
        'mono-label': ['12px', { lineHeight: '1rem',                           fontWeight: '400' }],
        '2xs': ['10px', { lineHeight: '1.4', fontWeight: '700', letterSpacing: '0.07em' }],
        xs:    ['11px', { lineHeight: '1.4', fontWeight: '600' }],
        sm:    ['13px', { lineHeight: '1.5' }],
        base:  ['14px', { lineHeight: '1.5' }],
        md:    ['14px', { lineHeight: '1.5' }],
        lg:    ['16px', { lineHeight: '1.4' }],
        xl:    ['18px', { lineHeight: '1.3' }],
        '2xl': ['22px', { lineHeight: '1.3' }],
      },

      /* ── Spacing — 4px grid ─────────────────────────────────────────── */
      spacing: {
        'unit':           '4px',
        'xs':             '4px',
        'sm':             '8px',
        'md':             '16px',
        'lg':             '24px',
        'xl':             '48px',
        'panel-width':    '280px',
        'toolbar-height': '40px',
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '13':  '3.25rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
      },

      /* ── Border radius — "Soft-Sharp" ───────────────────────────────── */
      borderRadius: {
        DEFAULT: '0.125rem',  /* 2px   rounded        */
        lg:      '0.25rem',   /* 4px   rounded-lg     */
        xl:      '0.5rem',    /* 8px   rounded-xl     */
        full:    '0.75rem',   /* 12px  rounded-full   */
        sm:      '0.125rem',
        md:      '0.25rem',
        '2xl':   '0.75rem',
      },

      /* ── Shadows ────────────────────────────────────────────────────── */
      boxShadow: {
        'input-inset':  'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
        'glow-emerald': '0 0 0 2px rgba(16, 183, 127, 0.5)',
        'sm':           '0 1px 3px rgba(0,0,0,0.40)',
        'md':           '0 4px 12px rgba(0,0,0,0.50)',
        'lg':           '0 10px 30px rgba(0,0,0,0.50)',
        'xl':           '0 20px 50px rgba(0,0,0,0.60)',
        '2xl':          '0 25px 60px rgba(0,0,0,0.70)',
      },

      /* ── Animations ─────────────────────────────────────────────────── */
      animation: {
        'accordion-down':  'accordion-down 200ms cubic-bezier(0.2,0,0.2,1)',
        'accordion-up':    'accordion-up   200ms cubic-bezier(0.2,0,0.2,1)',
        'fade-in':         'fade-in        200ms cubic-bezier(0.2,0,0.2,1)',
        'slide-in-right':  'slide-in-right 200ms cubic-bezier(0.2,0,0.2,1)',
        'slide-in-left':   'slide-in-left  200ms cubic-bezier(0.2,0,0.2,1)',
        'scale-in':        'scale-in       200ms cubic-bezier(0.2,0,0.2,1)',
        'emerald-pulse':   'emerald-pulse  2s ease-in-out infinite',
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0', opacity: '0' },
          to:   { height: 'var(--radix-accordion-content-height)', opacity: '1' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
          to:   { height: '0', opacity: '0' },
        },
        'fade-in':        { from: { opacity: '0', transform: 'translateY(-2px)' },   to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-right': { from: { opacity: '0', transform: 'translateX(8px)' },    to: { opacity: '1', transform: 'translateX(0)' } },
        'slide-in-left':  { from: { opacity: '0', transform: 'translateX(-8px)' },   to: { opacity: '1', transform: 'translateX(0)' } },
        'scale-in':       { from: { opacity: '0', transform: 'scale(0.97)' },        to: { opacity: '1', transform: 'scale(1)' } },
        'emerald-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16,183,127,0.30)' },
          '50%':       { boxShadow: '0 0 0 6px transparent' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
