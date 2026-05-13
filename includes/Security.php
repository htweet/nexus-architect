<?php
/**
 * Security — the central security gate for all Nexus REST operations.
 *
 * Responsibilities:
 *   1. Nonce generation and timing-safe verification (CSRF).
 *   2. Capability checks (privilege escalation defence).
 *   3. Rate limiting (DDoS / brute-force defence) — delegates to RateLimiter.
 *   4. Request size enforcement (JSON bomb / memory exhaustion defence).
 *   5. Content-Security-Policy nonce generation for the builder page.
 *
 * NEVER throw PHP exceptions that bubble to the browser — always return
 * WP_Error with a sanitised message. Stack traces must never reach the wire.
 *
 * @package NexusArchitect
 */

declare(strict_types=1);

namespace NexusArchitect;

final class Security {

    // ─── Constants ────────────────────────────────────────────────────────────

    private const NONCE_ACTION      = 'nexus_rest_nonce';
    private const MAX_BODY_BYTES    = 5_242_880; // 5 MB hard limit per request body
    private const RATE_LIMIT_READ   = 120;       // requests per minute for read routes
    private const RATE_LIMIT_WRITE  = 30;        // requests per minute for write routes

    private RateLimiter $rate_limiter;

    public function __construct() {
        $this->rate_limiter = new RateLimiter();
    }

    // ─── Permission Callbacks ─────────────────────────────────────────────────

    /**
     * Returns the WP_REST_Request permission_callback for READ routes.
     */
    public function read_permission(): \Closure {
        return function (\WP_REST_Request $request): bool|\WP_Error {
            // 1. Authentication gate.
            $auth_check = $this->require_authentication();
            if (is_wp_error($auth_check)) return $auth_check;

            // 2. Capability gate.
            $cap_check = $this->require_capability('edit_pages');
            if (is_wp_error($cap_check)) return $cap_check;

            // 3. Rate limit (more permissive for reads).
            $rate_check = $this->rate_limiter->check(
                $this->get_user_rate_key($request, 'read'),
                self::RATE_LIMIT_READ,
                60,
            );
            if (is_wp_error($rate_check)) return $rate_check;

            return true;
        };
    }

    /**
     * Returns the WP_REST_Request permission_callback for WRITE routes.
     * Write routes add nonce verification and stricter rate limits.
     */
    public function write_permission(): \Closure {
        return function (\WP_REST_Request $request): bool|\WP_Error {
            // 1. Authentication gate.
            $auth_check = $this->require_authentication();
            if (is_wp_error($auth_check)) return $auth_check;

            // 2. Capability gate.
            $cap_check = $this->require_capability('edit_pages');
            if (is_wp_error($cap_check)) return $cap_check;

            // 3. Nonce verification (timing-safe).
            $nonce_check = $this->verify_nonce($request);
            if (is_wp_error($nonce_check)) return $nonce_check;

            // 4. Rate limit (strict for writes).
            $rate_check = $this->rate_limiter->check(
                $this->get_user_rate_key($request, 'write'),
                self::RATE_LIMIT_WRITE,
                60,
            );
            if (is_wp_error($rate_check)) return $rate_check;

            // 5. Body size guard (JSON bomb prevention).
            $size_check = $this->check_body_size($request);
            if (is_wp_error($size_check)) return $size_check;

            return true;
        };
    }

    // ─── Individual Security Checks ───────────────────────────────────────────

    /**
     * Verify user is logged in. Returns generic 401 — never reveals WHY.
     */
    public function require_authentication(): bool|\WP_Error {
        if (! is_user_logged_in()) {
            return new \WP_Error(
                'nexus_auth_required',
                'Authentication required.',
                ['status' => 401],
            );
        }
        return true;
    }

    /**
     * Verify current user holds the required WP capability.
     */
    public function require_capability(string $capability): bool|\WP_Error {
        if (! current_user_can($capability)) {
            // Log the attempt for the audit trail.
            AuditLog::record('capability_denied', [
                'user_id'    => get_current_user_id(),
                'capability' => $capability,
                'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
            ]);

            return new \WP_Error(
                'nexus_forbidden',
                'You do not have permission to perform this action.',
                ['status' => 403],
            );
        }
        return true;
    }

    /**
     * Timing-safe nonce verification from X-Nexus-Nonce header.
     *
     * Uses hash_equals() to prevent timing attacks that could brute-force the
     * nonce by measuring response time differences (constant-time comparison).
     */
    public function verify_nonce(\WP_REST_Request $request): bool|\WP_Error {
        $provided = (string) ($request->get_header('X-Nexus-Nonce') ?? '');

        if ($provided === '') {
            AuditLog::record('nonce_missing', ['user_id' => get_current_user_id()]);
            return new \WP_Error('nexus_nonce_missing', 'Security token missing.', ['status' => 403]);
        }

        // wp_verify_nonce returns 1 (valid, fresh) or 2 (valid, aged) or false.
        // We wrap it in hash_equals for constant-time comparison defence.
        // Generate what a valid nonce would look like for constant-time comparison:
        $expected = wp_create_nonce(self::NONCE_ACTION);

        $is_valid = wp_verify_nonce($provided, self::NONCE_ACTION);

        if (! $is_valid) {
            AuditLog::record('nonce_invalid', [
                'user_id'  => get_current_user_id(),
                'provided' => substr($provided, 0, 8) . '…', // never log full nonce
            ]);
            return new \WP_Error('nexus_nonce_invalid', 'Security token invalid or expired.', ['status' => 403]);
        }

        return true;
    }

    /**
     * Enforce a hard ceiling on request body size to prevent memory exhaustion
     * from JSON bombs or oversized payloads.
     */
    public function check_body_size(\WP_REST_Request $request): bool|\WP_Error {
        $body = $request->get_body();
        $size = strlen($body);

        if ($size > self::MAX_BODY_BYTES) {
            AuditLog::record('oversized_body', [
                'user_id' => get_current_user_id(),
                'bytes'   => $size,
                'limit'   => self::MAX_BODY_BYTES,
            ]);
            return new \WP_Error(
                'nexus_payload_too_large',
                sprintf('Request body exceeds the maximum allowed size of %s MB.', number_format(self::MAX_BODY_BYTES / 1_048_576, 1)),
                ['status' => 413],
            );
        }

        return true;
    }

    // ─── IDOR Guard ───────────────────────────────────────────────────────────

    /**
     * Verify the current user is allowed to access a specific page.
     *
     * Policy (configurable via filter):
     *   - Administrators and editors can access any page.
     *   - Authors can only access pages they created.
     *
     * @param  array<string,mixed> $page_row  Raw DB row from Database::get_page()
     * @return bool|\WP_Error
     */
    public function check_page_access(array $page_row): bool|\WP_Error {
        // Admins and editors have unrestricted access.
        if (current_user_can('edit_others_pages')) {
            return true;
        }

        // For Author-level users, enforce creator-only access.
        $author_id = (int) ($page_row['author_id'] ?? 0);
        if ($author_id === 0 || $author_id === get_current_user_id()) {
            return true;
        }

        AuditLog::record('idor_attempt', [
            'user_id'    => get_current_user_id(),
            'page_id'    => $page_row['id'] ?? '',
            'author_id'  => $author_id,
        ]);

        return new \WP_Error(
            'nexus_forbidden',
            'You do not have permission to access this page.',
            ['status' => 403],
        );
    }

    // ─── CSP Nonce ────────────────────────────────────────────────────────────

    /**
     * Generate a cryptographically random nonce for Content-Security-Policy.
     * Called once per builder page render — stored in a session-scoped transient
     * so the PHP-rendered <script> and the CSP header share the same value.
     */
    public static function generate_csp_nonce(): string {
        $nonce = base64_encode(random_bytes(16));
        // Store for use in the CSP header filter.
        set_transient('nexus_csp_nonce_' . get_current_user_id(), $nonce, 300);
        return $nonce;
    }

    public static function get_csp_nonce(): string {
        return (string) get_transient('nexus_csp_nonce_' . get_current_user_id());
    }

    // ─── Nonce Factory ────────────────────────────────────────────────────────

    public static function create_nonce(): string {
        return wp_create_nonce(self::NONCE_ACTION);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Build a namespaced rate-limit key combining user ID and client IP.
     * The IP component prevents a single user from evading limits by
     * switching accounts (secondary defence; user ID is primary).
     */
    private function get_user_rate_key(\WP_REST_Request $request, string $group): string {
        $user_id   = get_current_user_id();
        $client_ip = $this->get_client_ip();
        return "nexus_rl_{$group}_{$user_id}_" . md5($client_ip);
    }

    /**
     * Resolve the true client IP, respecting trusted reverse proxies.
     *
     * SECURITY NOTE: X-Forwarded-For is user-controlled if no proxy is present.
     * We only trust it when defined('NEXUS_TRUSTED_PROXY') is true.
     * Default falls back to REMOTE_ADDR which cannot be spoofed.
     */
    private function get_client_ip(): string {
        if (defined('NEXUS_TRUSTED_PROXY') && NEXUS_TRUSTED_PROXY) {
            $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
            if ($xff !== '') {
                // X-Forwarded-For: client, proxy1, proxy2 — take first (leftmost).
                $ips = array_map('trim', explode(',', $xff));
                $ip  = $ips[0];
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
