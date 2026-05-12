/**
 * Shared constants for the preview system (Phase 6.2).
 * Extracted to prevent PreviewPage from being statically bundled
 * into the main chunk when TopBar only needs the key string.
 */

/** localStorage key used to bridge page data between builder and preview tabs */
export const PREVIEW_STORAGE_KEY = 'nx-preview-draft' as const;
