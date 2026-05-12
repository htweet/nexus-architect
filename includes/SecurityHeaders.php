<?php
/**
 * SecurityHeaders — HTTP security headers for the builder admin page.
 *
 * Applied headers:
 *
 *   Content-Security-Policy
 *     Nonce-based CSP allows only our own scripts to execute.
 *     No 'unsafe-eval' in production — Vite removes it in the built bundle.
 *     Dev mode adds 'unsafe-eval' for HMR (restricted to NEXUS_DEV_SERVER_URL origin).
 *
 *   X-Content-Type-Options: nosniff
 *     Prevents MIME-sniffing attacks where browsers would execute a response
 *     as a different content type than what was declared.
 *
 *   X-Frame-Options: SAMEORIGIN
 *     Prevents clickjacking — the builder iframe cannot be embedded on foreign domains.
 *
 *   Referrer-Policy: strict-origin-when-cross-origin
 *     Prevents the full URL (including page slugs and query params) from leaking
 *     to third-party origins via the Referer header.
 *
 *   Permissions-Policy
 *     Locks down browser APIs the builder does not use (camera, geolocation, etc.)
 *     to minimise the blast radius of any future XSS vulnerability.
 *
 *   Strict-Transport-Security (HSTS)
 *     Only applied on HTTPS — forces all future connections to use TLS.
 *     Prevents SSL stripping attacks.
 *
 * @package NexusArchitect
 */

declare(strict_types=1);

namespace NexusArchitect;

final class SecurityHeaders {

    /**
     * Hook this to 'admin_init' to apply headers before any output.
     *
     * @param string $csp_nonce  A per-request random nonce from Security::generate_csp_nonce().
     */
    public function apply(string $csp_nonce): void {
        if (headers_sent()) {
            return; // Can't set headers after output has started.
        }

        $is_dev  = defined('NEXUS_DEV_SERVER_URL');
        $dev_url = defined('NEXUS_DEV_SERVER_URL') ? rtrim(NEXUS_DEV_SERVER_URL, '/') : '';

        // ── Content-Security-Policy ───────────────────────────────────────────

        $script_src = $is_dev
            // Dev: allow Vite dev server + HMR WebSocket + eval for module hot reload.
            ? "script-src 'self' 'nonce-{$csp_nonce}' 'unsafe-eval' {$dev_url}"
            // Prod: nonce-only — no inline scripts, no eval.
            : "script-src 'self' 'nonce-{$csp_nonce}'";

        $style_src  = $is_dev
            ? "style-src 'self' 'unsafe-inline' {$dev_url}"
            : "style-src 'self' 'unsafe-inline'"; // Inline styles needed for Tailwind runtime

        $connect_src = $is_dev
            // Dev: allow Vite WebSocket for HMR.
            ? "connect-src 'self' {$dev_url} ws://localhost:3000 wss://localhost:3000"
            : "connect-src 'self'";

        $csp = implode('; ', array_filter([
            "default-src 'self'",
            $script_src,
            $style_src,
            $connect_src,
            "img-src 'self' data: blob: https:",        // blob: for canvas, data: for SVG icons
            "font-src 'self' data:",
            "media-src 'self' blob:",                    // blob: for WP media preview
            "object-src 'none'",                         // No plugins (Flash etc.)
            "base-uri 'self'",                           // Prevent base-tag injection
            "form-action 'self'",                        // No form exfiltration to third parties
            "frame-ancestors 'self'",                    // Clickjacking (modern equivalent of X-Frame-Options)
            "upgrade-insecure-requests",
        ]));

        header("Content-Security-Policy: {$csp}");

        // ── Anti-sniffing / Clickjacking ─────────────────────────────────────
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');

        // ── Referrer Policy ───────────────────────────────────────────────────
        header('Referrer-Policy: strict-origin-when-cross-origin');

        // ── Permissions Policy ────────────────────────────────────────────────
        // Lock down browser APIs we don't use. This limits XSS blast radius.
        header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), hid=()');

        // ── HSTS (HTTPS only) ────────────────────────────────────────────────
        if (is_ssl()) {
            // max-age=31536000 = 1 year; includeSubDomains optional per site config.
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }

        // ── Cache control for the builder page ───────────────────────────────
        // The builder page itself should not be cached by proxies/CDNs.
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
    }

    /**
     * Apply security headers to all Nexus REST API responses.
     * Hooked to 'rest_pre_serve_request'.
     */
    public function apply_rest_headers(bool $served, \WP_HTTP_Response $result): bool {
        if (headers_sent()) {
            return $served;
        }

        // Prevent REST responses from being cached.
        header('Cache-Control: no-store, no-cache, must-revalidate');
        header('X-Content-Type-Options: nosniff');

        // Remove headers that leak information about the server stack.
        header_remove('X-Powered-By');
        header_remove('Server');

        return $served;
    }

    /**
     * Strip sensitive WordPress headers that reveal version information.
     * Applied via 'wp_headers' filter.
     *
     * @param  array<string,string> $headers
     * @return array<string,string>
     */
    public function strip_wp_fingerprint_headers(array $headers): array {
        unset($headers['X-Pingback']);
        return $headers;
    }
}
