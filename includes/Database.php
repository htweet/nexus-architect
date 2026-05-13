<?php
/**
 * Database — manages the wp_nexus_pages custom table.
 *
 * Schema v2 (security update):
 *   id         VARCHAR(36)   PK  — UUID, server-generated (never client-supplied)
 *   author_id  BIGINT        NOT NULL  — WP user ID; enforces IDOR access control
 *   title      VARCHAR(500)  NOT NULL
 *   slug       VARCHAR(200)  NOT NULL UNIQUE
 *   page_json  LONGTEXT      NOT NULL  — the full NexusPage JSON blob
 *   status     VARCHAR(20)   NOT NULL DEFAULT 'draft'
 *   static_html LONGTEXT     NULL  — compiled output (Phase 6)
 *   created_at DATETIME      NOT NULL
 *   updated_at DATETIME      NOT NULL
 *
 * @package NexusArchitect
 */

declare(strict_types=1);

namespace NexusArchitect;

final class Database {

    public static function table(): string {
        global $wpdb;
        return $wpdb->prefix . 'nexus_pages';
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    public static function install(): void {
        global $wpdb;

        $table          = self::table();
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$table} (
            id          VARCHAR(36)     NOT NULL,
            author_id   BIGINT UNSIGNED NOT NULL DEFAULT 0,
            title       VARCHAR(500)    NOT NULL DEFAULT '',
            slug        VARCHAR(200)    NOT NULL DEFAULT '',
            page_json   LONGTEXT        NOT NULL,
            status      VARCHAR(20)     NOT NULL DEFAULT 'draft',
            static_html LONGTEXT        NULL,
            created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY slug (slug),
            KEY status (status),
            KEY author_id (author_id)
        ) {$charset_collate};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);

        // Install audit log table.
        AuditLog::create_table();

        // Schedule the daily audit log purge cron.
        AuditLog::schedule_purge();

        // Install Phase 7 AI + Presence tables.
        AiDatabase::install();

        update_option('nexus_db_version', NEXUS_DB_VERSION);
    }

    public static function on_deactivate(): void {
        // Flush rewrite rules — keeps WP clean.
        flush_rewrite_rules();
    }

    public static function uninstall(): void {
        global $wpdb;
        // Only wipe data on explicit uninstall, not deactivation.
        $wpdb->query("DROP TABLE IF EXISTS " . self::table()); // phpcs:ignore
        delete_option('nexus_db_version');
    }

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    /**
     * Fetch all pages (metadata only — no page_json for perf).
     *
     * @return array<int, array<string,mixed>>
     */
    public function get_pages(int $per_page = 50, int $page = 1): array {
        global $wpdb;
        $table  = self::table();
        $offset = ($page - 1) * $per_page;

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT id, title, slug, status, created_at, updated_at
                 FROM {$table}
                 ORDER BY updated_at DESC
                 LIMIT %d OFFSET %d",
                $per_page,
                $offset,
            ),
            ARRAY_A,
        );

        return $rows ?: [];
    }

    /**
     * Fetch one page by ID (includes page_json).
     *
     * @return array<string,mixed>|null
     */
    public function get_page(string $id): ?array {
        global $wpdb;
        $table = self::table();

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $row = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM {$table} WHERE id = %s", $id),
            ARRAY_A,
        );

        return $row ?: null;
    }

    /**
     * Insert a new page row.
     *
     * @param  array<string,mixed> $data
     * @return true|\WP_Error
     */
    public function create_page(array $data): true|\WP_Error {
        global $wpdb;

        $result = $wpdb->insert(
            self::table(),
            [
                'id'         => $data['id'],
                'author_id'  => (int) ($data['author_id'] ?? get_current_user_id()),
                'title'      => $data['title'],
                'slug'       => $data['slug'],
                'page_json'  => wp_json_encode($data['pageData']),
                'status'     => 'draft',
                'created_at' => current_time('mysql'),
                'updated_at' => current_time('mysql'),
            ],
            ['%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s'],
        );

        if (false === $result) {
            return new \WP_Error('nexus_db_error', $wpdb->last_error, ['status' => 500]);
        }

        return true;
    }

    /**
     * Update an existing page row.
     *
     * @param  string              $id
     * @param  array<string,mixed> $data
     * @return true|\WP_Error
     */
    public function update_page(string $id, array $data): true|\WP_Error {
        global $wpdb;

        $update_data   = ['updated_at' => current_time('mysql')];
        $update_format = ['%s'];

        if (isset($data['title'])) {
            $update_data['title']  = $data['title'];
            $update_format[]       = '%s';
        }
        if (isset($data['slug'])) {
            $update_data['slug']   = $data['slug'];
            $update_format[]       = '%s';
        }
        if (isset($data['pageData'])) {
            $update_data['page_json'] = wp_json_encode($data['pageData']);
            $update_format[]          = '%s';
        }

        $result = $wpdb->update(
            self::table(),
            $update_data,
            ['id' => $id],
            $update_format,
            ['%s'],
        );

        if (false === $result) {
            return new \WP_Error('nexus_db_error', $wpdb->last_error, ['status' => 500]);
        }

        return true;
    }

    /**
     * Soft-delete: set status = 'trashed'. Hard delete via param.
     *
     * @return true|\WP_Error
     */
    public function delete_page(string $id, bool $force = false): true|\WP_Error {
        global $wpdb;

        if ($force) {
            $result = $wpdb->delete(self::table(), ['id' => $id], ['%s']);
        } else {
            $result = $wpdb->update(
                self::table(),
                ['status' => 'trashed', 'updated_at' => current_time('mysql')],
                ['id'     => $id],
                ['%s',    '%s'],
                ['%s'],
            );
        }

        if (false === $result) {
            return new \WP_Error('nexus_db_error', $wpdb->last_error, ['status' => 500]);
        }

        return true;
    }

    /**
     * Store compiled static HTML for a page (Phase 6).
     */
    public function set_static_html(string $id, string $html): void {
        global $wpdb;
        $wpdb->update(
            self::table(),
            ['static_html' => $html, 'status' => 'published', 'updated_at' => current_time('mysql')],
            ['id' => $id],
            ['%s', '%s', '%s'],
            ['%s'],
        );
    }

    /**
     * Total page count (for pagination).
     */
    public function count_pages(): int {
        global $wpdb;
        $table = self::table();
        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        return (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE status != 'trashed'");
    }
}
