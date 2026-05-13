/**
 * Addon Micro-Package System — types (Phase 8.4)
 */

export type AddonStatus = 'installed' | 'available' | 'updating' | 'error';
export type AddonCategory = 'widgets' | 'integrations' | 'templates' | 'utilities';
export type AddonTier = 'free' | 'professional' | 'agency';

export interface AddonManifest {
  /** Globally unique addon identifier — reverse DNS format preferred. */
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  version: string;
  minNexusVersion: string;
  author: string;
  authorUrl?: string;
  iconUrl: string;
  thumbnailUrl?: string;
  screenshotUrls?: string[];
  category: AddonCategory;
  tags: string[];
  /** Minimum plan tier required to install and activate. */
  requiredTier: AddonTier;
  /** Widget type IDs this addon registers. */
  widgets?: string[];
  status: AddonStatus;
  isInstalled: boolean;
  isActive: boolean;
  /** Remote download endpoint. Null for built-in addons. */
  downloadUrl?: string;
  /** 0 = free */
  price: number;
  rating?: number;
  reviewCount?: number;
  installCount?: number;
  lastUpdated?: string;
  changelog?: string;
}

// ─── Built-in addon catalogue (shown in marketplace before real API) ───────

export const BUILT_IN_ADDONS: AddonManifest[] = [
  {
    id: 'nexus.widgets.forms',
    name: 'Form Builder',
    description: 'Drag-and-drop contact, lead capture, and survey forms with validation.',
    version: '1.0.0',
    minNexusVersion: '1.0.0',
    author: 'Nexus Team',
    iconUrl: '',
    category: 'widgets',
    tags: ['forms', 'contact', 'lead'],
    requiredTier: 'professional',
    widgets: ['form', 'form-input', 'form-textarea', 'form-select', 'form-submit'],
    status: 'available',
    isInstalled: false,
    isActive: false,
    price: 0,
    rating: 4.9,
    reviewCount: 312,
    installCount: 8400,
  },
  {
    id: 'nexus.widgets.popup',
    name: 'Popup Builder',
    description: 'Create exit-intent, scroll-trigger, and timed popups with targeting rules.',
    version: '1.0.0',
    minNexusVersion: '1.0.0',
    author: 'Nexus Team',
    iconUrl: '',
    category: 'widgets',
    tags: ['popup', 'modal', 'overlay', 'marketing'],
    requiredTier: 'professional',
    widgets: ['popup-trigger', 'popup-container'],
    status: 'available',
    isInstalled: false,
    isActive: false,
    price: 0,
    rating: 4.7,
    reviewCount: 198,
    installCount: 5200,
  },
  {
    id: 'nexus.widgets.slider',
    name: 'Advanced Slider',
    description: 'Full-featured image and content slider with parallax, Ken Burns, and custom transitions.',
    version: '1.0.0',
    minNexusVersion: '1.0.0',
    author: 'Nexus Team',
    iconUrl: '',
    category: 'widgets',
    tags: ['slider', 'carousel', 'gallery'],
    requiredTier: 'professional',
    widgets: ['slider', 'slide'],
    status: 'available',
    isInstalled: false,
    isActive: false,
    price: 0,
    rating: 4.8,
    reviewCount: 241,
    installCount: 6100,
  },
  {
    id: 'nexus.integration.mailchimp',
    name: 'Mailchimp Integration',
    description: 'Connect form submissions directly to Mailchimp audiences with tag and segment support.',
    version: '1.0.0',
    minNexusVersion: '1.0.0',
    author: 'Nexus Team',
    iconUrl: '',
    category: 'integrations',
    tags: ['email', 'mailchimp', 'marketing'],
    requiredTier: 'professional',
    status: 'available',
    isInstalled: false,
    isActive: false,
    price: 0,
    rating: 4.6,
    reviewCount: 89,
    installCount: 2300,
  },
  {
    id: 'nexus.integration.analytics',
    name: 'Analytics Dashboard',
    description: 'Per-page analytics showing views, bounce rate, and conversion events without leaving the builder.',
    version: '1.0.0',
    minNexusVersion: '1.0.0',
    author: 'Nexus Team',
    iconUrl: '',
    category: 'utilities',
    tags: ['analytics', 'stats', 'tracking'],
    requiredTier: 'agency',
    status: 'available',
    isInstalled: false,
    isActive: false,
    price: 0,
    rating: 4.5,
    reviewCount: 67,
    installCount: 1800,
  },
  {
    id: 'nexus.templates.agency-pack',
    name: 'Agency Template Pack',
    description: '50 premium page templates across 10 industries — SaaS, healthcare, legal, real estate, and more.',
    version: '1.0.0',
    minNexusVersion: '1.0.0',
    author: 'Nexus Team',
    iconUrl: '',
    category: 'templates',
    tags: ['templates', 'premium', 'agency'],
    requiredTier: 'agency',
    status: 'available',
    isInstalled: false,
    isActive: false,
    price: 0,
    rating: 4.9,
    reviewCount: 156,
    installCount: 3400,
  },
];
