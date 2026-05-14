/**
 * PWA Configuration — Progressive Web App compilation settings.
 *
 * Stored on NexusPage.pwaConfig. When enabled, the publish pipeline
 * generates a web manifest, service worker, and head tags automatically.
 */

export interface PWAIconInput {
  sourceDataUrl: string;
  bgColor: string;
}

export interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
}

export interface PWAConfig {
  enabled: boolean;
  appName: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  startUrl: string;
  orientation: 'portrait' | 'landscape' | 'any';
  icon: PWAIconInput | null;
  cacheStrategy: {
    pages: 'network-first' | 'cache-first' | 'stale-while-revalidate';
    assets: 'cache-first' | 'network-first';
    images: 'cache-first' | 'network-first';
    api: 'network-only' | 'network-first';
  };
  offlinePage: string | null;
}
