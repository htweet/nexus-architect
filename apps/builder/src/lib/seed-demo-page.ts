/**
 * seedDemoPage — generates a rich, pre-populated demo page for the Sandbox.
 *
 * Contains: Heading, Text, Button, Section, Columns (2-col), Image placeholder,
 * Divider, Icon, Alert, and a Testimonial — covering every major widget category.
 * Automatically stamped with the current schema version.
 */

import { createPage, createNode, CURRENT_SCHEMA_VERSION } from '@nexus/core';
import type { NexusPage, NexusNode } from '@nexus/core';

export function seedDemoPage(): NexusPage {
  const page = createPage({
    id:    'sandbox-demo-page',
    title: 'Nexus Sandbox — Demo Page',
    slug:  'sandbox-demo',
  });

  // Helper: add node to page and attach as child
  function addNode(
    parent: NexusNode,
    type: string,
    props: Record<string, unknown>,
    styles: Record<string, string> = {},
    label?: string,
  ): NexusNode {
    const node = createNode({
      id:       `demo-${type}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      parentId: parent.id,
      props,
      styles:   Object.keys(styles).length ? { base: styles } : {},
      ...(label !== undefined ? { label } : {}),
    });
    page.nodeMap[node.id] = node;
    parent.children.push(node.id);
    return node;
  }

  const root = page.nodeMap[page.rootNodeId]!;

  // ── Hero section ─────────────────────────────────────────────────────────

  const hero = addNode(root, 'section', {
    tag: 'section',
    htmlId: 'hero',
  }, {
    padding:         '80px 40px',
    background:      'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    textAlign:       'center',
    minHeight:       '400px',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             '24px',
  }, 'Hero Section');

  addNode(hero, 'heading', {
    text:  'Build Faster. Launch Smarter.',
    level: 'h1',
  }, {
    fontSize:     '3.5rem',
    fontWeight:   '800',
    color:        '#ffffff',
    lineHeight:   '1.15',
    letterSpacing:'-0.02em',
    maxWidth:     '700px',
    margin:       '0 auto',
  }, 'Hero Heading');

  addNode(hero, 'text', {
    text: 'Nexus Architect is the page builder that lets you move at the speed of your ideas — without writing a single line of code.',
  }, {
    fontSize:   '1.2rem',
    color:      'rgba(255,255,255,0.75)',
    maxWidth:   '560px',
    lineHeight: '1.7',
    margin:     '0 auto',
  }, 'Hero Subheading');

  const heroCta = addNode(hero, 'container', { tag: 'div' }, {
    display:    'flex',
    gap:        '16px',
    justifyContent: 'center',
    flexWrap:   'wrap',
  }, 'CTA Row');

  addNode(heroCta, 'button', {
    text:   'Start Building Free',
    href:   '#',
    target: '_self',
    variant: 'primary',
  }, {
    background:   '#10b77f',
    color:        '#ffffff',
    padding:      '14px 32px',
    borderRadius: '8px',
    fontSize:     '1rem',
    fontWeight:   '600',
    border:       'none',
    cursor:       'pointer',
  }, 'Primary CTA');

  addNode(heroCta, 'button', {
    text:    'View Demo',
    href:    '#demo',
    target:  '_self',
    variant: 'outline',
  }, {
    background:   'transparent',
    color:        '#ffffff',
    padding:      '14px 32px',
    borderRadius: '8px',
    fontSize:     '1rem',
    fontWeight:   '600',
    border:       '2px solid rgba(255,255,255,0.3)',
    cursor:       'pointer',
  }, 'Secondary CTA');

  // ── Features section ─────────────────────────────────────────────────────

  const features = addNode(root, 'section', {}, {
    padding:   '80px 40px',
    background:'#ffffff',
    textAlign: 'center',
  }, 'Features Section');

  addNode(features, 'heading', {
    text:  'Everything you need to launch',
    level: 'h2',
  }, {
    fontSize:   '2.25rem',
    fontWeight: '700',
    color:      '#111827',
    marginBottom: '12px',
  }, 'Section Heading');

  addNode(features, 'text', {
    text: 'From drag-and-drop to AI-powered generation — every tool is built for speed.',
  }, {
    fontSize:     '1.1rem',
    color:        '#6b7280',
    marginBottom: '56px',
  }, 'Section Subheading');

  // 3-column feature grid
  const grid = addNode(features, 'columns', {
    columns: 3,
    gap: '24px',
  }, { marginTop: '40px' }, 'Feature Grid');

  const featureItems = [
    { icon: 'Zap',        title: 'Lightning Fast DnD', desc: 'Drag, drop, and rearrange any element in real-time. Zero lag. Pure speed.' },
    { icon: 'Shield',     title: 'Enterprise Security', desc: 'Built-in XSS sanitization, schema validation, and error boundaries at every layer.' },
    { icon: 'Cpu',        title: 'AI-Powered',          desc: 'Generate full page layouts from a single prompt. Populate content with one click.' },
  ];

  for (const f of featureItems) {
    const card = addNode(grid, 'container', { tag: 'div' }, {
      background:   '#f9fafb',
      borderRadius: '12px',
      padding:      '32px 24px',
      textAlign:    'center',
      border:       '1px solid #e5e7eb',
    }, `Feature: ${f.title}`);

    addNode(card, 'icon', { name: f.icon, size: 32 }, {
      color:        '#10b77f',
      marginBottom: '16px',
      display:      'block',
    });
    addNode(card, 'heading', { text: f.title, level: 'h3' }, {
      fontSize:     '1.15rem',
      fontWeight:   '600',
      color:        '#111827',
      marginBottom: '8px',
    });
    addNode(card, 'text', { text: f.desc }, {
      fontSize: '0.9rem',
      color:    '#6b7280',
      lineHeight: '1.6',
    });
  }

  // ── Divider ───────────────────────────────────────────────────────────────

  addNode(root, 'divider', { style: 'solid' }, {
    borderTop: '1px solid #e5e7eb',
    margin:    '0 40px',
  }, 'Section Divider');

  // ── Testimonial ───────────────────────────────────────────────────────────

  const testimonialSection = addNode(root, 'section', {}, {
    padding:    '80px 40px',
    background: '#f0fdf4',
    textAlign:  'center',
  }, 'Testimonial Section');

  addNode(testimonialSection, 'heading', {
    text:  'Trusted by 10,000+ builders',
    level: 'h2',
  }, {
    fontSize:     '2rem',
    fontWeight:   '700',
    color:        '#111827',
    marginBottom: '48px',
  });

  addNode(testimonialSection, 'testimonial', {
    quote:      '"Nexus Architect cut our landing page build time from 4 hours to 20 minutes. It\'s the tool we\'ve been waiting for."',
    author:     'Sarah Chen',
    role:       'Lead Designer at Acme Agency',
    avatarUrl:  'https://i.pravatar.cc/80?img=47',
  }, {
    maxWidth:     '640px',
    margin:       '0 auto',
    background:   '#ffffff',
    padding:      '32px',
    borderRadius: '16px',
    boxShadow:    '0 4px 24px rgba(0,0,0,0.06)',
  }, 'Testimonial');

  // ── Alert banner ──────────────────────────────────────────────────────────

  addNode(root, 'alert', {
    type:    'info',
    title:   'Sandbox Mode Active',
    message: 'You\'re running the Nexus Architect developer sandbox. All data is saved to localStorage. No WordPress installation required.',
    dismissible: false,
  }, { margin: '40px', borderRadius: '12px' }, 'Sandbox Alert');

  // Stamp schema version on page
  (page as unknown as Record<string, unknown>)['schemaVersion'] = CURRENT_SCHEMA_VERSION;

  return page;
}
