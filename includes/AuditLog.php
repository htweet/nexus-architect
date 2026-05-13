<?php
/**
 * AuditLog — immutable security event log.
 *
 * Every security-relevant event is written here:
 *   - Failed nonce verification
 *   - Capability denial
 *   - Rate limit breach
 *   - IDOR attempts
 *   - XSS prop injection attempts
 *   - JSON bomb attempts
 *   - All successful write operations (create/update/delete/publish)
 *
 * Storage strategy:
 *   Phase 1: WP custom table `wp_nexus_audit_log` — append-only, no deletes.
 *   Phase 10: Exportable to external SIEM / Sentry.
 *
 * Design principles:
 *   - All writes are fire-and-forget (never block the request path).
 *   - Audit records are NEVER modifiable or deletable via the REST API.
 *   - Sensitive values (nonces, passwords) are never stored.
 *   - The log is truncated by a WP-Cron job after 90 days (configurable).
 *
 * @package NexusArchitect
 */

declare(strict_types=1);

namespace NexusArchitect;

final class AuditLog {

    private const TABLE_SUFFIX  = 'nexus_audit_log';
    private const RETENTION_DAYS = 90;

    // ─── Table Management ────────────────────────────────────────────────────

    public static function create_table(): void {
        global $wpdb;
        $table           = $wpdb->prefix . self::TABLE_SUFFIX;
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$table} (
            id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            event_type  VARCHAR(64)     NOT NULL,
            user_id     BIGINT UNSIGNED NOT NULL DEFAULT 0,
            ip_address  VARCHAR(45)     NOT NULL DEFAULT '',
            user_agent  VARCHAR(512)    NOT NULL DEFAULT '',
            payload     TEXT            NOT NULL,
            created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY event_type (event_type),
            KEY user_id    (user_id),
            KEY created_at (created_at)
        ) {$charset_collate};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);
    }

    // ─── Event Recording ─────────────────────────────────────────────────────

    /**
     * Record a security event.
     *
     * This method is intentionally static and never throws — a failure to
     * write an audit record must NEVER break the main request path.
     *
     * @param  string              $event_type  e.g. 'nonce_invalid', 'page_created'
     * @param  array<string,mixed> $payload     Event-specific context. Sanitised before storage.
     */
    public static function record(string $event_type, array $payload = []): void {
        try {
            global $wpdb;
            $table = $wpdb->prefix . self::TABLE_SUFFIX;

            // Sanitise event type — alphanumeric + underscores only.
            $event_type = substr(preg_replace('/[^a-z0-9_]/i', '_', $event_type) ?? 'unknown', 0, 64);

            // Strip any value that looks like a credential or token.
            $payload = self::redact_sensitive($payload);

            $wpdb->insert(
                $table,
                [
                    'event_type' => $event_type,
                    'user_id'    => get_current_user_id(),
                    'ip_address' => self::get_ip(),
                    'user_agent' => substr(sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 512),
                    'payload'    => wp_json_encode($payload),
                    'created_at' => current_time('mysql'),
                ],
                ['%s', '%d', '%s', '%s', '%s', '%s'],
            );
        } catch (\Throwable) {
            // Silent — audit log failure must never break the application.
        }
    }

    // ─── Retention ───────────────────────────────────────────────────────────

    /**
     * Purge records older than RETENTION_DAYS. Hooked to WP-Cron daily.
     */
    public static function purge_old_records(): void {
        global $wpdb;
        $table      = $wpdb->prefix . self::TABLE_SUFFIX;
        $cutoff_date = gmdate('Y-m-d H:i:s', strtotime('-' . self::RETENTION_DAYS . ' days'));

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$table} WHERE created_at < %s LIMIT 1000",
            $cutoff_date,
        ));
    }

    /**
     * Schedule the daily purge cron job.
     */
    public static function schedule_purge(): void {
        if (! wp_next_scheduled('nexus_audit_log_purge')) {
            wp_schedule_event(time(), 'daily', 'nexus_audit_log_purge');
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Remove values that could be credentials, tokens, or PII from the payload.
     *
     * @param  array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private static function redact_sensitive(array $payload): array {
        $sensitive_keys = ['password', 'nonce', 'token', 'secret', 'key', 'auth', 'cookie', 'hash'];

        foreach ($payload as $key => $value) {
            foreach ($sensitive_keys as $sensitive) {
                if (stripos((string) $key, $sensitive) !== false) {
                    $payload[$key] = '[REDACTED]';
                    break;
                }
            }
            if (is_array($value)) {
                $payload[$key] = self::redact_sensitive($value);
            }
        }

        return $payload;
    }

    private static function get_ip(): string {
        // Only trust X-Forwarded-For with explicit proxy config.
        if (defined('NEXUS_TRUSTED_PROXY') && NEXUS_TRUSTED_PROXY) {
            $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
            if ($xff !== '') {
                $ip = trim(explode(',', $xff)[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
