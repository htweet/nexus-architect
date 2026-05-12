<?php
/**
 * AiDatabase — manages three tables for Phase 7 AI features.
 *
 * Tables:
 *   nexus_ai_logs       — every AI generation call (audit + usage tracking)
 *   nexus_perf_audits   — per-page performance audit results (persistent)
 *   nexus_presence      — real-time presence heartbeats (TTL-based, Phase 7.5)
 *
 * @package NexusArchitect
 */

declare(strict_types=1);

namespace NexusArchitect;

final class AiDatabase {

    // ─── Table Names ──────────────────────────────────────────────────────────

    public static function logs_table(): string {
        global $wpdb;
        return $wpdb->prefix . 'nexus_ai_logs';
    }

    public static function audits_table(): string {
        global $wpdb;
        return $wpdb->prefix . 'nexus_perf_audits';
    }

    public static function presence_table(): string {
        global $wpdb;
        return $wpdb->prefix . 'nexus_presence';
    }

    // ─── Schema Installation ──────────────────────────────────────────────────

    public static function install(): void {
        global $wpdb;
        $charset = $wpdb->get_charset_collate();

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        // AI generation log
        $logs = self::logs_table();
        dbDelta("CREATE TABLE IF NOT EXISTS {$logs} (
            id          VARCHAR(36)     NOT NULL,
            user_id     BIGINT UNSIGNED NOT NULL DEFAULT 0,
            page_id     VARCHAR(36)     NOT NULL DEFAULT '',
            feature     VARCHAR(50)     NOT NULL DEFAULT '',
            prompt      TEXT            NOT NULL,
            model       VARCHAR(100)    NOT NULL DEFAULT '',
            tokens_used INT UNSIGNED    NOT NULL DEFAULT 0,
            success     TINYINT(1)      NOT NULL DEFAULT 0,
            error_msg   TEXT            NULL,
            created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY page_id (page_id),
            KEY feature (feature),
            KEY created_at (created_at)
        ) {$charset};");

        // Performance audit results
        $audits = self::audits_table();
        dbDelta("CREATE TABLE IF NOT EXISTS {$audits} (
            id          VARCHAR(36)     NOT NULL,
            page_id     VARCHAR(36)     NOT NULL,
            user_id     BIGINT UNSIGNED NOT NULL DEFAULT 0,
            score       TINYINT UNSIGNED NOT NULL DEFAULT 0,
            findings    LONGTEXT        NOT NULL,
            html_size   INT UNSIGNED    NOT NULL DEFAULT 0,
            css_size    INT UNSIGNED    NOT NULL DEFAULT 0,
            created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY page_id (page_id),
            KEY created_at (created_at)
        ) {$charset};");

        // Presence heartbeats (Phase 7.5)
        $presence = self::presence_table();
        dbDelta("CREATE TABLE IF NOT EXISTS {$presence} (
            user_id     BIGINT UNSIGNED NOT NULL,
            page_id     VARCHAR(36)     NOT NULL,
            user_name   VARCHAR(200)    NOT NULL DEFAULT '',
            avatar_url  VARCHAR(500)    NOT NULL DEFAULT '',
            color       VARCHAR(20)     NOT NULL DEFAULT '#6366f1',
            last_seen   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, page_id),
            KEY page_id (page_id),
            KEY last_seen (last_seen)
        ) {$charset};");
    }

    // ─── AI Log CRUD ──────────────────────────────────────────────────────────

    /**
     * Record an AI generation attempt.
     */
    public function log_generation(
        string $feature,
        string $prompt,
        string $model,
        int    $tokens,
        bool   $success,
        string $page_id  = '',
        string $error    = '',
    ): void {
        global $wpdb;
        $wpdb->insert(
            self::logs_table(),
            [
                'id'         => wp_generate_uuid4(),
                'user_id'    => get_current_user_id(),
                'page_id'    => $page_id,
                'feature'    => $feature,
                'prompt'     => mb_substr($prompt, 0, 2000),
                'model'      => $model,
                'tokens_used' => $tokens,
                'success'    => $success ? 1 : 0,
                'error_msg'  => $error ?: null,
                'created_at' => current_time('mysql'),
            ],
            ['%s','%d','%s','%s','%s','%s','%d','%d','%s','%s'],
        );
    }

    /**
     * Count generations for a user in the current billing month.
     */
    public function count_monthly_generations(int $user_id): int {
        global $wpdb;
        $table = self::logs_table();
        return (int) $wpdb->get_var(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT COUNT(*) FROM {$table}
                  WHERE user_id = %d
                    AND feature = 'generate'
                    AND success = 1
                    AND created_at >= DATE_FORMAT(NOW(), '%%Y-%%m-01')",
                $user_id,
            ),
        );
    }

    // ─── Performance Audit CRUD ───────────────────────────────────────────────

    /**
     * Persist a new audit result for a page.
     */
    public function save_audit(
        string $page_id,
        int    $score,
        array  $findings,
        int    $html_size,
        int    $css_size,
    ): string {
        global $wpdb;
        $id = wp_generate_uuid4();
        $wpdb->insert(
            self::audits_table(),
            [
                'id'         => $id,
                'page_id'    => $page_id,
                'user_id'    => get_current_user_id(),
                'score'      => max(0, min(100, $score)),
                'findings'   => wp_json_encode($findings),
                'html_size'  => $html_size,
                'css_size'   => $css_size,
                'created_at' => current_time('mysql'),
            ],
            ['%s','%s','%d','%d','%s','%d','%d','%s'],
        );
        return $id;
    }

    /**
     * Get the latest audit result for a page.
     */
    public function get_latest_audit(string $page_id): ?array {
        global $wpdb;
        $table = self::audits_table();
        $row   = $wpdb->get_row(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} WHERE page_id = %s ORDER BY created_at DESC LIMIT 1",
                $page_id,
            ),
            ARRAY_A,
        );
        if (!$row) return null;
        $row['findings'] = json_decode($row['findings'] ?? '[]', true) ?? [];
        return $row;
    }

    /**
     * Get audit history for a page (last 10).
     */
    public function get_audit_history(string $page_id): array {
        global $wpdb;
        $table = self::audits_table();
        $rows  = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT id, score, html_size, css_size, created_at FROM {$table}
                  WHERE page_id = %s ORDER BY created_at DESC LIMIT 10",
                $page_id,
            ),
            ARRAY_A,
        );
        return $rows ?: [];
    }

    // ─── Presence CRUD (Phase 7.5) ────────────────────────────────────────────

    /**
     * Upsert the current user's presence on a page (heartbeat).
     */
    public function upsert_presence(int $user_id, string $page_id, string $color): void {
        global $wpdb;
        $user      = get_userdata($user_id);
        $name      = $user ? ($user->display_name ?: $user->user_login) : 'Unknown';
        $avatar    = get_avatar_url($user_id, ['size' => 32]) ?: '';

        $wpdb->replace(
            self::presence_table(),
            [
                'user_id'   => $user_id,
                'page_id'   => $page_id,
                'user_name' => $name,
                'avatar_url' => $avatar,
                'color'     => $color,
                'last_seen' => current_time('mysql'),
            ],
            ['%d','%s','%s','%s','%s','%s'],
        );

        // Purge stale presences (> 45 seconds old) for this page.
        $table = self::presence_table();
        $wpdb->query(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "DELETE FROM {$table} WHERE page_id = %s AND last_seen < DATE_SUB(NOW(), INTERVAL 45 SECOND)",
                $page_id,
            ),
        );
    }

    /**
     * Get all active presences on a page (last 45s).
     */
    public function get_presence(string $page_id): array {
        global $wpdb;
        $current_user_id = get_current_user_id();
        $table = self::presence_table();
        return $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT user_id, user_name, avatar_url, color, last_seen
                   FROM {$table}
                  WHERE page_id = %s
                    AND user_id != %d
                    AND last_seen >= DATE_SUB(NOW(), INTERVAL 45 SECOND)
                  ORDER BY last_seen DESC",
                $page_id,
                $current_user_id,
            ),
            ARRAY_A,
        ) ?: [];
    }

    /**
     * Remove a user's presence (on logout or explicit leave).
     */
    public function remove_presence(int $user_id, string $page_id): void {
        global $wpdb;
        $wpdb->delete(
            self::presence_table(),
            ['user_id' => $user_id, 'page_id' => $page_id],
            ['%d', '%s'],
        );
    }
}
