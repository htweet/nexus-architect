<?php
/**
 * Plugin Loader — wires all feature classes to WP hooks.
 *
 * @package NexusArchitect
 */

declare(strict_types=1);

namespace NexusArchitect;

final class Loader {

    private Database       $db;
    private Security       $security;
    private InputValidator $validator;
    private AiDatabase     $ai_db;
    private AiService      $ai;
    private RestApi        $rest;
    private Enqueue        $enqueue;
    private SecurityHeaders $headers;

    public function init(): void {
        $this->db        = new Database();
        $this->security  = new Security();
        $this->validator = new InputValidator();
        $this->ai_db     = new AiDatabase();
        $this->ai        = new AiService($this->ai_db);
        $this->rest      = new RestApi($this->db, $this->security, $this->validator, $this->ai, $this->ai_db);
        $this->enqueue   = new Enqueue();
        $this->headers   = new SecurityHeaders();

        // REST routes.
        add_action('rest_api_init', [$this->rest, 'register_routes'], 15);

        // Security headers on all REST responses.
        add_filter('rest_pre_serve_request', [$this->headers, 'apply_rest_headers'], 10, 2);

        // Strip WP version headers.
        add_filter('wp_headers', [$this->headers, 'strip_wp_fingerprint_headers']);

        // Admin script enqueue — builder page only.
        add_action('admin_enqueue_scripts', [$this->enqueue, 'enqueue_builder']);

        // VAE Gap G: PWA root file serving (manifest.json, sw.js via rewrite rules).
        add_action('init', [$this->enqueue, 'register_pwa_hooks']);

        // Builder admin menu.
        add_action('admin_menu', [$this, 'add_admin_menu']);

        // Audit log purge cron.
        add_action('nexus_audit_log_purge', [AuditLog::class, 'purge_old_records']);

        // Rate limiter header injection on 429 responses.
        add_filter('rest_post_dispatch', [$this, 'inject_retry_after_header'], 10, 3);

        // Remove WP version from generator meta (information disclosure).
        remove_action('wp_head', 'wp_generator');
    }

    public function add_admin_menu(): void {
        add_menu_page(
            __('Nexus Architect', 'nexus-architect'),
            __('Nexus', 'nexus-architect'),
            'edit_pages',
            'nexus-architect',
            [$this, 'render_builder_page'],
            'data:image/svg+xml;base64,' . base64_encode(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26">'
                . '<rect width="26" height="26" rx="6" fill="#10b77f"/>'
                . '<path d="M7 19V7H9.6L16.4 15.4V7H19V19H16.4L9.6 10.6V19H7Z" fill="white"/>'
                . '</svg>'
            ),
            30,
        );
    }

    /**
     * Render the builder page HTML shell.
     *
     * Security measures:
     *   - CSP nonce generated fresh per render (random_bytes).
     *   - Security headers applied via SecurityHeaders::apply().
     *   - window.__NEXUS_CONFIG__ uses wp_json_encode() (not raw echo) — XSS safe.
     *   - Nonce created server-side; client cannot forge it.
     */
    public function render_builder_page(): void {
        // Generate a per-render CSP nonce.
        $csp_nonce = Security::generate_csp_nonce();

        // Apply all security headers before any output.
        $this->headers->apply($csp_nonce);

        // WP nonce for REST API calls.
        $api_nonce = Security::create_nonce();

        // Build config — wp_json_encode() escapes all values XSS-safely.
        $config = wp_json_encode([
            'apiUrl'    => rest_url('nexus/v1'),
            'nonce'     => $api_nonce,
            'siteUrl'   => get_site_url(),
            'version'   => NEXUS_VERSION,
            'userEmail' => sanitize_email(wp_get_current_user()->user_email),
        ]);

        // The nonce attribute allows this inline script under our CSP policy.
        ?>
        <div id="nexus-architect-root" style="height:100vh;overflow:hidden;"></div>
        <script nonce="<?php echo esc_attr($csp_nonce); ?>">
            window.__NEXUS_CONFIG__ = <?php echo $config; // phpcs:ignore -- already JSON-encoded ?>;
        </script>
        <?php
    }

    /**
     * Inject Retry-After header on 429 responses from the rate limiter.
     *
     * @param  \WP_REST_Response    $result
     * @param  \WP_REST_Server      $server
     * @param  \WP_REST_Request     $request
     */
    public function inject_retry_after_header(
        \WP_REST_Response $result,
        \WP_REST_Server   $server,
        \WP_REST_Request  $request,
    ): \WP_REST_Response {
        if ($result->get_status() === 429) {
            $data = $result->get_data();
            if (isset($data['data']['retry_after'])) {
                $result->header('Retry-After', (string) $data['data']['retry_after']);
            }
        }
        return $result;
    }
}
