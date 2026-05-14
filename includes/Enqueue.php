<?php
/**
 * Enqueue — loads the React builder into WordPress admin.
 *
 * Strategy:
 *   Development  →  loads Vite dev server (@vite/client + main.tsx via HMR)
 *   Production   →  loads the compiled dist bundle from /apps/builder/dist/
 *
 * Detection: if NEXUS_DEV_SERVER_URL is defined (set in wp-config.php during dev),
 * we use HMR mode. Otherwise production bundle.
 *
 * @package NexusArchitect
 */

declare(strict_types=1);

namespace NexusArchitect;

final class Enqueue {

    /** Vite dev server URL. Define in wp-config.php during development. */
    private const DEV_SERVER = 'http://localhost:3000';

    /**
     * VAE Gap G: Register PWA root-file serving hooks.
     *
     * Call this from the plugin bootstrap (nexus-architect.php) during 'init':
     *   add_action('init', [$enqueue, 'register_pwa_hooks']);
     *
     * When a request comes in for /manifest.json or /sw.js, we check if there's
     * a published Nexus page whose PWA artifacts should be served and output them.
     *
     * Strategy: Use WP query vars (nexus_pwa_file, nexus_pwa_page_id) injected by
     * add_rewrite_rule so WP's router picks them up before the 404 handler.
     */
    public function register_pwa_hooks(): void {
        // Add rewrite rules for PWA root files.
        add_rewrite_rule('^manifest\.json$', 'index.php?nexus_pwa_file=manifest', 'top');
        add_rewrite_rule('^sw\.js$',         'index.php?nexus_pwa_file=sw',       'top');

        // Register our custom query var.
        add_filter('query_vars', function (array $vars): array {
            $vars[] = 'nexus_pwa_file';
            return $vars;
        });

        // Serve the file when the query var is present.
        add_action('template_redirect', [$this, 'serve_pwa_file']);
    }

    /**
     * Serve manifest.json or sw.js from WP options if they were stored by publish_page.
     *
     * Looks up the most-recently-published PWA page; if multiple pages have PWA
     * enabled, the most recently published one wins for the root manifest/SW.
     * (Future: per-slug routing via dedicated rewrite rules.)
     */
    public function serve_pwa_file(): void {
        $file_type = get_query_var('nexus_pwa_file');
        if (! $file_type) {
            return;
        }

        // Find any published page that has PWA artifacts.
        // We search options with the nexus_pwa_manifest_ prefix.
        global $wpdb;
        $row = $wpdb->get_row(
            "SELECT option_name FROM {$wpdb->options}
             WHERE option_name LIKE 'nexus_pwa_manifest_%'
             ORDER BY option_id DESC
             LIMIT 1",
            ARRAY_A,
        );

        if (! $row) {
            return; // No PWA published yet — fall through to normal 404.
        }

        $page_id = str_replace('nexus_pwa_manifest_', '', (string) $row['option_name']);

        if ($file_type === 'manifest') {
            $content = get_option("nexus_pwa_manifest_{$page_id}", '');
            if (! $content) return;
            header('Content-Type: application/manifest+json; charset=utf-8');
            header('Cache-Control: public, max-age=3600');
            echo wp_unslash($content); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
            exit;
        }

        if ($file_type === 'sw') {
            $content = get_option("nexus_pwa_sw_{$page_id}", '');
            if (! $content) return;
            header('Content-Type: application/javascript; charset=utf-8');
            header('Cache-Control: public, max-age=86400');
            header('Service-Worker-Allowed: /');
            echo wp_unslash($content); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
            exit;
        }
    }

    public function enqueue_builder(string $hook): void {
        // Only load on our admin page.
        if ('toplevel_page_nexus-architect' !== $hook) {
            return;
        }

        if ($this->is_dev()) {
            $this->enqueue_vite_dev();
        } else {
            $this->enqueue_production();
        }
    }

    private function is_dev(): bool {
        return defined('NEXUS_DEV_SERVER_URL') || (defined('WP_DEBUG') && WP_DEBUG);
    }

    /**
     * Vite HMR mode — inject the Vite client then the entry module.
     * React Fast Refresh will work out of the box.
     */
    private function enqueue_vite_dev(): void {
        $dev_url = defined('NEXUS_DEV_SERVER_URL') ? NEXUS_DEV_SERVER_URL : self::DEV_SERVER;

        // Vite client (enables HMR websocket).
        add_action('admin_head', function () use ($dev_url): void {
            echo '<script type="module" src="' . esc_url($dev_url . '/@vite/client') . '"></script>' . "\n";
            echo '<script type="module" src="' . esc_url($dev_url . '/src/main.tsx') . '"></script>' . "\n";
        });

        // Allow the Vite origin through CSP-like WP nonce restrictions.
        add_filter('admin_body_class', fn(string $c) => $c . ' nexus-builder-active');
    }

    /**
     * Production mode — load from compiled Vite output in dist/.
     * Vite outputs a manifest.json we use to cache-bust correctly.
     */
    private function enqueue_production(): void {
        $dist_dir = NEXUS_PLUGIN_DIR . 'apps/builder/dist/';
        $dist_url = NEXUS_PLUGIN_URL . 'apps/builder/dist/';

        $manifest_path = $dist_dir . '.vite/manifest.json';
        if (! file_exists($manifest_path)) {
            // Fallback: bundle not built yet.
            add_action('admin_notices', function (): void {
                echo '<div class="notice notice-error"><p>';
                echo esc_html__('Nexus Architect: production bundle not found. Run `npm run build` in apps/builder.', 'nexus-architect');
                echo '</p></div>';
            });
            return;
        }

        $manifest = json_decode((string) file_get_contents($manifest_path), true);
        $entry    = $manifest['src/main.tsx'] ?? null;

        if (! $entry) {
            return;
        }

        // Main JS bundle.
        wp_enqueue_script(
            'nexus-architect-builder',
            $dist_url . $entry['file'],
            [],
            NEXUS_VERSION,
            ['in_footer' => true, 'strategy' => 'defer'],
        );

        // CSS bundle.
        if (! empty($entry['css'])) {
            foreach ($entry['css'] as $css_file) {
                wp_enqueue_style(
                    'nexus-architect-' . md5($css_file),
                    $dist_url . $css_file,
                    [],
                    NEXUS_VERSION,
                );
            }
        }

        // Mark as ESM.
        add_filter('script_loader_tag', function (string $tag, string $handle) use ($dist_url): string {
            if (str_contains($handle, 'nexus-architect-')) {
                $tag = str_replace('<script ', '<script type="module" ', $tag);
            }
            return $tag;
        }, 10, 2);
    }
}
