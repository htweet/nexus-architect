/**
 * White-Label System — types (Phase 8.2)
 * Professional & Agency tiers only.
 */

export interface WhiteLabelConfig {
  /** Master toggle — when false all other fields are ignored. */
  enabled: boolean;
  /** Replaces "Nexus Architect" in the builder chrome. */
  brandName: string;
  /** Base64 data-URL or absolute URL to agency logo (SVG preferred). */
  logoUrl: string;
  /** Logo render width in px. Default 120. */
  logoWidth: number;
  /** Primary accent colour that replaces #10b77f in the builder UI. */
  primaryColor: string;
  /**
   * Custom admin URL slug.
   * e.g. "my-builder" renders at /wp-admin/admin.php?page=my-builder
   */
  adminSlug: string;
  /** Remove "Built with Nexus Architect" from front-end output. */
  hideFooterCredit: boolean;
  /**
   * Client mode: grant clients a restricted view that hides advanced
   * settings, prevents template deletion, and locks specified elements.
   */
  clientModeEnabled: boolean;
  /** Node IDs the client cannot modify. */
  clientModeLockedElements: string[];
  /** Custom email sender name for builder notifications. */
  emailSenderName: string;
  /** Custom email sender address (must be verified on sending domain). */
  emailSenderAddress: string;
}

export const DEFAULT_WHITE_LABEL: WhiteLabelConfig = {
  enabled: false,
  brandName: 'Nexus Architect',
  logoUrl: '',
  logoWidth: 120,
  primaryColor: '#10b77f',
  adminSlug: 'nexus-architect',
  hideFooterCredit: false,
  clientModeEnabled: false,
  clientModeLockedElements: [],
  emailSenderName: 'Nexus Architect',
  emailSenderAddress: '',
};
