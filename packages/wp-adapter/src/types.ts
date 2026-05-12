/**
 * WP REST API response shapes.
 *
 * These map the JSON that comes over the wire from /nexus/v1/* endpoints.
 * They are separate from the core NexusPage schema to avoid coupling.
 */

export interface WPUserResponse {
  id: string;
  name: string;
  email: string;
  tier: 'free' | 'personal' | 'professional' | 'agency';
  siteCount: number;
  avatarUrl?: string;
}

export interface WPPageListItem {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'trashed';
  created_at: string;
  updated_at: string;
}

export interface WPPaginatedResponse<T> {
  items: T[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
}

export interface WPMediaItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string;
  sizes: Record<string, { url: string; width: number; height: number }>;
}

export interface WPPublishResult {
  id: string;
  published: boolean;
  publishedAt: string;
  pageUrl: string;
  staticHtml: string | null;
}

export interface WPPingResult {
  ok: boolean;
  latencyMs: number;
  version: string;
}

/** Shape of window.__NEXUS_CONFIG__ injected by PHP */
export interface NexusWindowConfig {
  apiUrl: string;
  nonce: string;
  siteUrl: string;
  version: string;
  userEmail: string;
}

declare global {
  interface Window {
    __NEXUS_CONFIG__?: NexusWindowConfig;
  }
}
