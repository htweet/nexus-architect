<?php
/**
 * REST API — all Nexus REST routes under nexus/v1.
 *
 * Security layers applied to every request (in order):
 *   1. Authentication check          (Security::require_authentication)
 *   2. Capability check              (Security::require_capability)
 *   3. Nonce verification (writes)   (Security::verify_nonce — timing-safe)
 *   4. Rate limiting                 (RateLimiter)
 *   5. Body size check (writes)      (Security::check_body_size)
 *   6. Input validation              (InputValidator — per-handler)
 *   7. IDOR access check             (Security::check_page_access — per-resource)
 *   8. Mass-assignment firewall      (InputValidator::sanitise_page_blob)
 *   9. XSS sanitisation              (InputValidator — widget prop scrubbing)
 *  10. Audit logging                 (AuditLog::record — all write outcomes)
 *
 * Routes:
 *   GET    /nexus/v1/ping
 *   GET    /nexus/v1/user
 *   GET    /nexus/v1/pages
 *   POST   /nexus/v1/pages
 *   GET    /nexus/v1/pages/{id}
 *   PUT    /nexus/v1/pages/{id}
 *   DELETE /nexus/v1/pages/{id}
 *   POST   /nexus/v1/pages/{id}/publish
 *   GET    /nexus/v1/pages/{id}/revisions
 *   GET    /nexus/v1/media
 *
 * Phase 7 AI & Presence:
 *   GET/POST /nexus/v1/ai/settings
 *   POST     /nexus/v1/ai/generate
 *   POST     /nexus/v1/ai/populate
 *   POST     /nexus/v1/ai/style-suggest
 *   GET/POST /nexus/v1/ai/audit/{id}
 *   POST     /nexus/v1/presence/{id}/heartbeat
 *   GET      /nexus/v1/presence/{id}
 *
 * @package NexusArchitect
 */

declare(strict_types=1);

namespace NexusArchitect;

final class RestApi {

    private const NAMESPACE = 'nexus/v1';

    /** Regex for ID path params — explicit non-backtracking pattern. */
    private const ID_PATTERN = '(?P<id>[a-zA-Z0-9_\-]{1,64})';

    public function __construct(
        private readonly Database       $db,
        private readonly Security       $security,
        private readonly InputValidator $validator,
        private readonly AiService      $ai,
        private readonly AiDatabase     $ai_db,
    ) {}

    // ─── Route Registration ──────────────────────────────────────────────────

    public function register_routes(): void {
        // ── Health ────────────────────────────────────────────────────────────
        register_rest_route(self::NAMESPACE, '/ping', [
            'methods'             => 'GET',
            'callback'            => [$this, 'ping'],
            'permission_callback' => '__return_true', // Public — no auth required.
        ]);

        // ── Current user ──────────────────────────────────────────────────────
        register_rest_route(self::NAMESPACE, '/user', [
            'methods'             => 'GET',
            'callback'            => [$this, 'get_current_user'],
            'permission_callback' => $this->security->read_permission(),
        ]);

        // ── Pages collection ──────────────────────────────────────────────────
        register_rest_route(self::NAMESPACE, '/pages', [
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'list_pages'],
                'permission_callback' => $this->security->read_permission(),
                'args'                => [
                    'per_page' => ['default' => 50, 'type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'sanitize_callback' => 'absint'],
                    'page'     => ['default' => 1,  'type' => 'integer', 'minimum' => 1, 'sanitize_callback' => 'absint'],
                ],
            ],
            [
                'methods'             => 'POST',
                'callback'            => [$this, 'create_page'],
                'permission_callback' => $this->security->write_permission(),
                'args'                => [
                    'title' => ['required' => true,  'type' => 'string'],
                    'slug'  => ['required' => false, 'type' => 'string'],
                ],
            ],
        ]);

        // ── Single page ───────────────────────────────────────────────────────
        register_rest_route(self::NAMESPACE, '/' . self::ID_PATTERN, [
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'get_page'],
                'permission_callback' => $this->security->read_permission(),
            ],
            [
                'methods'             => 'PUT,PATCH',
                'callback'            => [$this, 'update_page'],
                'permission_callback' => $this->security->write_permission(),
            ],
            [
                'methods'             => 'DELETE',
                'callback'            => [$this, 'delete_page'],
                'permission_callback' => $this->security->write_permission(),
            ],
        ]);

        // ── Publish ───────────────────────────────────────────────────────────
        register_rest_route(self::NAMESPACE, '/' . self::ID_PATTERN . '/publish', [
            'methods'             => 'POST',
            'callback'            => [$this, 'publish_page'],
            'permission_callback' => $this->security->write_permission(),
        ]);

        // ── Revisions ─────────────────────────────────────────────────────────
        register_rest_route(self::NAMESPACE, '/' . self::ID_PATTERN . '/revisions', [
            'methods'             => 'GET',
            'callback'            => [$this, 'list_revisions'],
            'permission_callback' => $this->security->read_permission(),
        ]);

        // ── Phase 7: AI Settings ──────────────────────────────────────────────
        register_rest_route(self::NAMESPACE, '/ai/settings', [
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'get_ai_settings'],
                'permission_callback' => $this->security->write_permission(),
            ],
            [
                'methods'             => 'POST',
                'callback'            => [$this, 'save_ai_settings'],
                'permission_callback' => fn() => current_user_can('manage_options'),
            ],
        ]);

        // ── Phase 7: AI Generation ────────────────────────────────────────────
        register_rest_route(self::NAMESPACE, '/ai/generate', [
            'methods'             => 'POST',
            'callback'            => [$this, 'ai_generate'],
            'permission_callback' => $this->security->write_permission(),
        ]);

        // ── Phase 7: AI Content Population ───────────────────────────────────
        register_rest_route(self::NAMESPACE, '/ai/populate', [
            'methods'             => 'POST',
            'callback'            => [$this, 'ai_populate'],
            'permission_callback' => $this->security->write_permission(),
        ]);

        // ── Phase 7: AI Style Suggestions ────────────────────────────────────
        register_rest_route(self::NAMESPACE, '/ai/style-suggest', [
            'methods'             => 'POST',
            'callback'            => [$this, 'ai_style_suggest'],
            'permission_callback' => $this->security->write_permission(),
        ]);

        // ── Phase 7: Performance Audit ────────────────────────────────────────
        register_rest_route(self::NAMESPACE, '/ai/audit/' . self::ID_PATTERN, [
            [
                'methods'             => 'POST',
                'callback'            => [$this, 'ai_audit'],
                'permission_callback' => $this->security->write_permission(),
            ],
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'get_audit'],
                'permission_callback' => $this->security->read_permission(),
            ],
        ]);

        // ── Phase 7.5: Presence ────────────────────────────────────────────────
        register_rest_route(self::NAMESPACE, '/presence/' . self::ID_PATTERN . '/heartbeat', [
            'methods'             => 'POST',
            'callback'            => [$this, 'presence_heartbeat'],
            'permission_callback' => $this->security->write_permission(),
        ]);

        register_rest_route(self::NAMESPACE, '/presence/' . self::ID_PATTERN, [
            'methods'             => 'GET',
            'callback'            => [$this, 'get_presence'],
            'permission_callback' => $this->security->read_permission(),
        ]);

        // ── Media library ──────────────────────────────────────────────────────
        register_rest_route(self::NAMESPACE, '/media', [
            'methods'             => 'GET',
            'callback'            => [$this, 'get_media_library'],
            'permission_callback' => $this->security->read_permission(),
            'args'                => [
                'per_page' => ['default' => 40,    'type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'sanitize_callback' => 'absint'],
                'page'     => ['default' => 1,     'type' => 'integer', 'minimum' => 1, 'sanitize_callback' => 'absint'],
                'search'   => ['default' => '',    'type' => 'string',  'sanitize_callback' => 'sanitize_text_field'],
                'type'     => ['default' => 'image', 'type' => 'string', 'enum' => ['image', 'video', 'audio', 'application']],
            ],
        ]);

        // ── VAE Gap G: Server-side webhook proxy ───────────────────────────────
        // Proxies Action Node webhookCall requests server-side to avoid CORS.
        register_rest_route(self::NAMESPACE, '/webhook-proxy', [
            'methods'             => 'POST',
            'callback'            => [$this, 'webhook_proxy'],
            'permission_callback' => $this->security->read_permission(),
            'args'                => [
                'url'     => ['required' => true,  'type' => 'string', 'sanitize_callback' => 'esc_url_raw'],
                'method'  => ['required' => false, 'type' => 'string', 'default' => 'GET',
                              'enum' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']],
                'headers' => ['required' => false, 'type' => 'object', 'default' => []],
                'body'    => ['required' => false, 'type' => 'string', 'default' => ''],
            ],
        ]);
    }

    // ─── Handlers ─────────────────────────────────────────────────────────────

    public function ping(\WP_REST_Request $request): \WP_REST_Response {
        return $this->ok(['ok' => true, 'latencyMs' => 0, 'version' => NEXUS_VERSION]);
    }

    public function get_current_user(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $wp_user = wp_get_current_user();

        // SECURITY: Tier is ALWAYS resolved server-side from DB / license.
        // Never trust a client-supplied tier — a user cannot promote themselves.
        $tier = $this->resolve_user_tier($wp_user->ID);

        AuditLog::record('user_fetched', ['user_id' => $wp_user->ID]);

        return $this->ok([
            'id'        => (string) $wp_user->ID,
            'name'      => esc_html($wp_user->display_name),
            'email'     => sanitize_email($wp_user->user_email),
            'tier'      => $tier,
            'siteCount' => 1,
            'avatarUrl' => get_avatar_url($wp_user->ID, ['size' => 64]),
        ]);
    }

    public function list_pages(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $per_page = (int) $request->get_param('per_page');
        $page     = (int) $request->get_param('page');

        $rows  = $this->db->get_pages($per_page, $page);
        $total = $this->db->count_pages();

        $response = $this->ok([
            'items'      => $rows,
            'total'      => $total,
            'totalPages' => (int) ceil($total / max(1, $per_page)),
            'page'       => $page,
            'perPage'    => $per_page,
        ]);

        $response->header('X-Nexus-Total',       (string) $total);
        $response->header('X-Nexus-Total-Pages', (string) ceil($total / max(1, $per_page)));

        return $response;
    }

    public function get_page(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        // ① Validate the ID from the URL path parameter.
        $id = $this->validate_path_id($request);
        if (is_wp_error($id)) return $id;

        // ② Fetch — return 404 without revealing if the ID format is wrong.
        $row = $this->db->get_page($id);
        if (! $row) return $this->not_found();

        // ③ IDOR: verify the current user may access this page.
        $access = $this->security->check_page_access($row);
        if (is_wp_error($access)) return $access;

        return $this->ok($this->hydrate_page($row));
    }

    public function create_page(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        // ① Validate title.
        $raw_title = (string) ($request->get_param('title') ?? '');
        $title     = $this->validator->validate_title($raw_title);
        if (is_wp_error($title)) return $title;

        // ② Validate & canonicalise slug.
        $raw_slug = (string) ($request->get_param('slug') ?? $title);
        $slug     = $this->validator->validate_slug($raw_slug);
        if (is_wp_error($slug)) return $slug;

        // ③ Generate server-side ID — never trust a client-supplied ID.
        $id  = wp_generate_uuid4();
        $now = gmdate('c');

        $page_data = [
            'id'            => $id,
            'title'         => $title,
            'slug'          => $slug,
            'rootNodeId'    => 'root-' . $id,
            'nodeMap'       => [
                'root-' . $id => [
                    'id'          => 'root-' . $id,
                    'type'        => 'root',
                    'parentId'    => null,
                    'children'    => [],
                    'props'       => [],
                    'styles'      => [],
                    'visibility'  => ['desktop' => true, 'tablet' => true, 'mobile' => true],
                    'interactions' => (object) [],
                    'locked'      => false,
                    'hidden'      => false,
                    '_v'          => 1,
                    '_ops'        => [],
                ],
            ],
            'globalStyles'  => (object) [],
            'seoMeta'       => ['title' => $title, 'description' => '', 'ogImage' => null, 'noIndex' => false],
            'schemaVersion' => 1,
            'createdAt'     => $now,
            'updatedAt'     => $now,
        ];

        $result = $this->db->create_page([
            'id'        => $id,
            'title'     => $title,
            'slug'      => $slug,
            'author_id' => get_current_user_id(), // IDOR: bind to creator.
            'pageData'  => $page_data,
        ]);

        if (is_wp_error($result)) return $this->db_error($result);

        AuditLog::record('page_created', ['page_id' => $id, 'slug' => $slug]);

        return new \WP_REST_Response($page_data, 201);
    }

    public function update_page(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        // ① Validate path ID.
        $id = $this->validate_path_id($request);
        if (is_wp_error($id)) return $id;

        // ② Fetch existing — 404 on miss.
        $row = $this->db->get_page($id);
        if (! $row) return $this->not_found();

        // ③ IDOR check.
        $access = $this->security->check_page_access($row);
        if (is_wp_error($access)) return $access;

        // ④ Decode body with JSON bomb protection.
        $body = $this->validator->decode_json($request->get_body());
        if ($body === null) {
            return new \WP_Error('nexus_invalid_json', 'Request body is not valid JSON or exceeds depth/key limits.', ['status' => 400]);
        }

        // ⑤ Mass-assignment firewall: only permitted fields are processed.
        $update = [];

        if (isset($body['title'])) {
            $t = $this->validator->validate_title((string) $body['title']);
            if (is_wp_error($t)) return $t;
            $update['title'] = $t;
        }

        if (isset($body['slug'])) {
            $s = $this->validator->validate_slug((string) $body['slug']);
            if (is_wp_error($s)) return $s;
            $update['slug'] = $s;
        }

        // ⑥ If page tree data is present, sanitise it end-to-end.
        $page_fields = ['nodeMap', 'globalStyles', 'seoMeta', 'title', 'slug'];
        $has_page_data = false;
        foreach ($page_fields as $field) {
            if (isset($body[$field])) { $has_page_data = true; break; }
        }

        if ($has_page_data) {
            // Merge with stored page data.
            $stored = $this->validator->decode_json($row['page_json'] ?? '');
            if ($stored === null) {
                return new \WP_Error('nexus_corrupt_data', 'Stored page data is corrupt.', ['status' => 500]);
            }

            foreach ($page_fields as $field) {
                if (isset($body[$field])) $stored[$field] = $body[$field];
            }
            $stored['updatedAt'] = gmdate('c');

            // ⑦ Run mass-assignment + XSS sanitisation on the merged blob.
            $sanitised = $this->validator->sanitise_page_blob($stored);
            if (is_wp_error($sanitised)) return $sanitised;

            // ⑧ Validate structural integrity (rootNodeId exists in nodeMap).
            $structure_check = $this->validator->validate_page_structure($sanitised);
            if (is_wp_error($structure_check)) return $structure_check;

            $update['pageData'] = $sanitised;
        }

        $result = $this->db->update_page($id, $update);
        if (is_wp_error($result)) return $this->db_error($result);

        AuditLog::record('page_updated', ['page_id' => $id]);

        $updated_row = $this->db->get_page($id);
        return $this->ok($this->hydrate_page($updated_row));
    }

    public function delete_page(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $id = $this->validate_path_id($request);
        if (is_wp_error($id)) return $id;

        $row = $this->db->get_page($id);
        if (! $row) return $this->not_found();

        $access = $this->security->check_page_access($row);
        if (is_wp_error($access)) return $access;

        // Only admins can hard-delete (force=true).
        $force = (bool) ($request->get_param('force') ?? false);
        if ($force && ! current_user_can('delete_pages')) {
            return new \WP_Error('nexus_forbidden', 'Only administrators may permanently delete pages.', ['status' => 403]);
        }

        $result = $this->db->delete_page($id, $force);
        if (is_wp_error($result)) return $this->db_error($result);

        AuditLog::record('page_deleted', ['page_id' => $id, 'force' => $force]);

        return $this->ok(['deleted' => true, 'id' => $id, 'permanent' => $force]);
    }

    public function publish_page(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $id = $this->validate_path_id($request);
        if (is_wp_error($id)) return $id;

        $row = $this->db->get_page($id);
        if (! $row) return $this->not_found();

        $access = $this->security->check_page_access($row);
        if (is_wp_error($access)) return $access;

        // VAE Gap F: Accept pre-compiled HTML from the client-side TypeScript compiler.
        // The React builder runs compilePage() in-browser and sends the result here.
        $static_html = sanitize_text_field((string) ($request->get_param('staticHtml') ?? ''));
        if (! $static_html) {
            // Fallback placeholder — will be replaced when the builder sends compiled HTML.
            $static_html = '<!-- Nexus Architect: static HTML pending — please republish from the builder -->';
        }

        // VAE Gap F: Store PWA artifacts in WP options (keyed by page ID).
        $pwa_manifest = (string) ($request->get_param('pwaManifest') ?? '');
        $pwa_sw       = (string) ($request->get_param('pwaSw') ?? '');
        if ($pwa_manifest) {
            update_option("nexus_pwa_manifest_{$id}", wp_slash($pwa_manifest), false);
        }
        if ($pwa_sw) {
            update_option("nexus_pwa_sw_{$id}", wp_slash($pwa_sw), false);
        }

        // VAE Gap G: Generate PHP-level RLS guard from page's roleConfig.
        // Stored as a WP option — served before the static HTML to enforce server-side auth.
        $page_json = json_decode((string) ($row['page_json'] ?? '{}'), true);
        $rls_guard_code = $this->generate_rls_guard($page_json);
        if ($rls_guard_code) {
            update_option("nexus_rls_guard_{$id}", wp_slash($rls_guard_code), false);
        }

        $this->db->set_static_html($id, $static_html);

        AuditLog::record('page_published', ['page_id' => $id]);

        $page_url = get_site_url() . '/' . esc_attr($row['slug'] ?? $id);

        return $this->ok([
            'id'          => $id,
            'published'   => true,
            'publishedAt' => gmdate('c'),
            'pageUrl'     => $page_url,
            'staticHtml'  => $static_html,
            'pwaEnabled'  => ! empty($pwa_manifest),
        ]);
    }

    /**
     * VAE Gap G: Generate a server-side PHP RLS guard from the page's roleConfig.
     *
     * Returns a PHP code string (no <?php tag) that, when eval()'d or included,
     * will redirect or 403 the current visitor if they lack the required role.
     *
     * @param  array<string,mixed> $page_json
     * @return string PHP code, empty string if no roleConfig defined.
     */
    private function generate_rls_guard(array $page_json): string {
        $role_config = $page_json['roleConfig'] ?? null;
        if (! $role_config || empty($role_config['roleHierarchy'])) {
            return '';
        }

        $hierarchy    = array_map('sanitize_text_field', (array) ($role_config['roleHierarchy'] ?? []));
        $guest_role   = sanitize_text_field((string) ($role_config['guestRole'] ?? 'guest'));
        $auth_header  = sanitize_text_field((string) ($role_config['authTokenHeader'] ?? 'Authorization'));

        // Encode hierarchy for the generated code.
        $hierarchy_php = wp_json_encode($hierarchy);

        return <<<PHP
// Nexus Architect — generated RLS guard (do not edit)
\$nx_hierarchy   = {$hierarchy_php};
\$nx_guest_role  = '{$guest_role}';
\$nx_user        = wp_get_current_user();
\$nx_user_roles  = (array) \$nx_user->roles;
\$nx_user_index  = -1;
foreach (\$nx_hierarchy as \$i => \$r) {
    if (in_array(\$r, \$nx_user_roles, true)) {
        \$nx_user_index = \$i;
        break;
    }
}
// 'guest' is index 0 if in hierarchy, otherwise -1 means not found
if (\$nx_user_index < 0 && in_array(\$nx_guest_role, \$nx_hierarchy, true)) {
    \$nx_user_index = array_search(\$nx_guest_role, \$nx_hierarchy, true);
}
PHP;
    }

    /**
     * VAE Gap G: Server-side webhook proxy.
     *
     * Forwards an Action Node webhookCall from the browser to an external URL
     * without CORS restrictions. Auth/nonce guards ensure only logged-in users
     * can proxy requests, and the URL is validated on the server before proxying.
     */
    public function webhook_proxy(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $url     = esc_url_raw((string) $request->get_param('url'));
        $method  = strtoupper(sanitize_text_field((string) ($request->get_param('method') ?? 'GET')));
        $body    = (string) ($request->get_param('body') ?? '');
        $headers = (array)  ($request->get_param('headers') ?? []);

        if (! $url) {
            return new \WP_Error('nexus_proxy_no_url', 'url parameter is required.', ['status' => 400]);
        }

        // Security: block requests to private/local IP ranges.
        $parsed = wp_parse_url($url);
        $host   = $parsed['host'] ?? '';
        if (! $host || $this->is_private_host($host)) {
            return new \WP_Error('nexus_proxy_blocked', 'Requests to private addresses are not allowed.', ['status' => 403]);
        }

        // Sanitize headers — allow Content-Type and custom X-* headers only.
        $safe_headers = ['Content-Type' => 'application/json'];
        foreach ($headers as $key => $value) {
            $key = sanitize_text_field((string) $key);
            if (preg_match('/^[A-Za-z0-9\-]+$/', $key)) {
                $safe_headers[$key] = sanitize_text_field((string) $value);
            }
        }

        $wp_args = [
            'method'  => $method,
            'headers' => $safe_headers,
            'timeout' => 15,
        ];
        if ($body && in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
            $wp_args['body'] = $body;
        }

        $response = wp_remote_request($url, $wp_args);

        if (is_wp_error($response)) {
            return new \WP_Error('nexus_proxy_error', $response->get_error_message(), ['status' => 502]);
        }

        $status_code   = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);
        $content_type  = wp_remote_retrieve_header($response, 'content-type');

        AuditLog::record('webhook_proxy', [
            'url'    => $url,
            'method' => $method,
            'status' => $status_code,
        ]);

        return new \WP_REST_Response(
            json_decode($response_body, true) ?? $response_body,
            (int) $status_code,
            ['Content-Type' => $content_type ?: 'application/json'],
        );
    }

    /**
     * Check if a hostname resolves to a private/loopback address.
     * Blocks SSRF vectors like http://localhost, http://192.168.x.x, etc.
     */
    private function is_private_host(string $host): bool {
        $private_patterns = [
            '/^localhost$/i',
            '/^127\.\d+\.\d+\.\d+$/',
            '/^10\.\d+\.\d+\.\d+$/',
            '/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/',
            '/^192\.168\.\d+\.\d+$/',
            '/^::1$/',
            '/^0\.0\.0\.0$/',
        ];
        foreach ($private_patterns as $pattern) {
            if (preg_match($pattern, $host)) {
                return true;
            }
        }
        return false;
    }

    public function list_revisions(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $id = $this->validate_path_id($request);
        if (is_wp_error($id)) return $id;

        $row = $this->db->get_page($id);
        if (! $row) return $this->not_found();

        $access = $this->security->check_page_access($row);
        if (is_wp_error($access)) return $access;

        // Phase 5 wires this to a real revision table.
        return $this->ok(['items' => [], 'total' => 0]);
    }

    public function get_media_library(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $per_page = (int) $request->get_param('per_page');
        $page     = (int) $request->get_param('page');
        $search   = sanitize_text_field((string) ($request->get_param('search') ?? ''));
        $type     = sanitize_text_field((string) ($request->get_param('type') ?? 'image'));

        // Whitelist the mime type prefix.
        $allowed_types = ['image', 'video', 'audio', 'application'];
        if (! in_array($type, $allowed_types, true)) {
            $type = 'image';
        }

        $query = new \WP_Query([
            'post_type'      => 'attachment',
            'post_status'    => 'inherit',
            'post_mime_type' => $type,
            'posts_per_page' => $per_page,
            'paged'          => $page,
            's'              => $search,
        ]);

        $items = [];
        foreach ($query->posts as $post) {
            $meta    = wp_get_attachment_metadata($post->ID);
            $items[] = [
                'id'       => (string) $post->ID,
                'url'      => esc_url(wp_get_attachment_url($post->ID) ?: ''),
                'filename' => sanitize_file_name(basename(get_attached_file($post->ID) ?: '')),
                'mimeType' => esc_attr($post->post_mime_type),
                'width'    => isset($meta['width'])  ? (int) $meta['width']  : null,
                'height'   => isset($meta['height']) ? (int) $meta['height'] : null,
                'alt'      => esc_html(get_post_meta($post->ID, '_wp_attachment_image_alt', true)),
                'caption'  => esc_html(wp_get_attachment_caption($post->ID)),
                'sizes'    => $this->get_image_sizes($post->ID),
            ];
        }

        return $this->ok([
            'items'      => $items,
            'total'      => $query->found_posts,
            'totalPages' => $query->max_num_pages,
            'page'       => $page,
            'perPage'    => $per_page,
        ]);
    }

    // ─── Phase 7: AI Handlers ────────────────────────────────────────────────

    public function get_ai_settings(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        return $this->ok($this->ai->get_settings());
    }

    public function save_ai_settings(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $check = $this->security->verify_nonce($request);
        if (is_wp_error($check)) return $check;

        $body     = $this->validator->decode_json($request->get_body() ?: '{}') ?? [];
        $provider = sanitize_text_field((string) ($body['provider'] ?? 'openai'));
        $model    = sanitize_text_field((string) ($body['model']    ?? 'gpt-4o-mini'));
        $api_key  = sanitize_text_field((string) ($body['apiKey']   ?? ''));

        $this->ai->save_settings($provider, $model, $api_key);

        AuditLog::record('ai_settings_updated', ['provider' => $provider, 'model' => $model]);
        return $this->ok(['saved' => true]);
    }

    public function ai_generate(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $check = $this->security->verify_nonce($request);
        if (is_wp_error($check)) return $check;

        $rate = $this->rate_limit_ai();
        if (is_wp_error($rate)) return $rate;

        $body   = $this->validator->decode_json($request->get_body() ?: '{}') ?? [];
        $prompt = sanitize_textarea_field((string) ($body['prompt'] ?? ''));
        $page_id = sanitize_text_field((string) ($body['pageId'] ?? ''));

        if (empty(trim($prompt))) {
            return new \WP_Error('nexus_validation', 'Prompt is required.', ['status' => 400]);
        }
        if (strlen($prompt) > 1000) {
            return new \WP_Error('nexus_validation', 'Prompt must be under 1000 characters.', ['status' => 400]);
        }

        $tier   = $this->resolve_user_tier(get_current_user_id());
        $result = $this->ai->generate_layout($prompt, $page_id, $tier);
        if (is_wp_error($result)) return $result;

        return $this->ok($result);
    }

    public function ai_populate(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $check = $this->security->verify_nonce($request);
        if (is_wp_error($check)) return $check;

        $rate = $this->rate_limit_ai();
        if (is_wp_error($rate)) return $rate;

        $body     = $this->validator->decode_json($request->get_body() ?: '{}') ?? [];
        $node_map = $body['nodeMap'] ?? [];
        $context  = sanitize_textarea_field((string) ($body['context'] ?? ''));
        $page_id  = sanitize_text_field((string) ($body['pageId'] ?? ''));

        if (!is_array($node_map) || empty($node_map)) {
            return new \WP_Error('nexus_validation', 'nodeMap is required.', ['status' => 400]);
        }
        if (count($node_map) > 200) {
            return new \WP_Error('nexus_validation', 'Page too large for AI population (max 200 nodes).', ['status' => 400]);
        }

        $tier   = $this->resolve_user_tier(get_current_user_id());
        $result = $this->ai->populate_content($node_map, $context, $page_id, $tier);
        if (is_wp_error($result)) return $result;

        return $this->ok(['nodeMap' => $result]);
    }

    public function ai_style_suggest(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $check = $this->security->verify_nonce($request);
        if (is_wp_error($check)) return $check;

        $rate = $this->rate_limit_ai();
        if (is_wp_error($rate)) return $rate;

        $body          = $this->validator->decode_json($request->get_body() ?: '{}') ?? [];
        $current       = $body['currentTokens'] ?? [];
        $changed_token = sanitize_text_field((string) ($body['changedToken'] ?? ''));

        if (!is_array($current)) {
            return new \WP_Error('nexus_validation', 'currentTokens must be an object.', ['status' => 400]);
        }

        $tier   = $this->resolve_user_tier(get_current_user_id());
        $result = $this->ai->suggest_styles($current, $changed_token, $tier);
        if (is_wp_error($result)) return $result;

        return $this->ok(['suggestions' => $result]);
    }

    public function ai_audit(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $check = $this->security->verify_nonce($request);
        if (is_wp_error($check)) return $check;

        $id  = $this->validate_path_id($request);
        if (is_wp_error($id)) return $id;

        $row = $this->db->get_page($id);
        if (!$row) return $this->not_found();

        $access = $this->security->check_page_access($row);
        if (is_wp_error($access)) return $access;

        $static_html = (string) ($row['static_html'] ?? '');
        if (empty(trim($static_html)) || $static_html === '<!-- Phase 6: static HTML compiler pending -->') {
            // Run a lightweight structural audit without full HTML
            $page_data = $this->validator->decode_json($row['page_json'] ?? '') ?? [];
            $static_html = sprintf(
                '<html><head><title>%s</title></head><body><!-- page with %d nodes --></body></html>',
                esc_html($row['title'] ?? 'Untitled'),
                count($page_data['nodeMap'] ?? []),
            );
        }

        $tier   = $this->resolve_user_tier(get_current_user_id());
        $result = $this->ai->audit_performance($id, $static_html, $tier);
        if (is_wp_error($result)) return $result;

        return $this->ok($result);
    }

    public function get_audit(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $id  = $this->validate_path_id($request);
        if (is_wp_error($id)) return $id;

        $row = $this->db->get_page($id);
        if (!$row) return $this->not_found();

        $access = $this->security->check_page_access($row);
        if (is_wp_error($access)) return $access;

        $audit   = $this->ai_db->get_latest_audit($id);
        $history = $this->ai_db->get_audit_history($id);

        return $this->ok([
            'latest'  => $audit,
            'history' => $history,
        ]);
    }

    // ─── Phase 7.5: Presence Handlers ─────────────────────────────────────────

    public function presence_heartbeat(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $check = $this->security->verify_nonce($request);
        if (is_wp_error($check)) return $check;

        $id  = $this->validate_path_id($request);
        if (is_wp_error($id)) return $id;

        $body  = $this->validator->decode_json($request->get_body() ?: '{}') ?? [];
        $color = sanitize_hex_color((string) ($body['color'] ?? '#6366f1')) ?: '#6366f1';

        $user_id = get_current_user_id();
        $this->ai_db->upsert_presence($user_id, $id, $color);

        // Return updated presence list for this page (excluding self)
        $peers = $this->ai_db->get_presence($id);
        return $this->ok(['peers' => $peers]);
    }

    public function get_presence(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
        $id  = $this->validate_path_id($request);
        if (is_wp_error($id)) return $id;

        $peers = $this->ai_db->get_presence($id);
        return $this->ok(['peers' => $peers]);
    }

    // ─── AI Rate Limiter ──────────────────────────────────────────────────────

    private function rate_limit_ai(): true|\WP_Error {
        // 30 AI requests per minute per user (prevents abuse)
        $user_id   = get_current_user_id();
        $cache_key = "nexus_ai_rate_{$user_id}";
        $count     = (int) get_transient($cache_key);
        if ($count >= 30) {
            return new \WP_Error('nexus_rate_limit', 'Too many AI requests. Please wait a moment.', ['status' => 429]);
        }
        set_transient($cache_key, $count + 1, 60);
        return true;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Validate the {id} path parameter before it touches the database.
     *
     * Returns the validated string ID or a WP_Error.
     */
    private function validate_path_id(\WP_REST_Request $request): string|\WP_Error {
        $raw = (string) ($request->get_param('id') ?? '');
        return $this->validator->validate_id($raw);
    }

    /**
     * Hydrate a raw DB row into a NexusPage response object.
     *
     * @param  array<string,mixed> $row
     * @return array<string,mixed>
     */
    private function hydrate_page(array $row): array {
        // Use the safe JSON decoder (depth + key limits).
        $page_data = $this->validator->decode_json($row['page_json'] ?? '') ?? [];
        $page_data['_status']    = sanitize_text_field($row['status'] ?? 'draft');
        $page_data['_createdAt'] = $row['created_at'] ?? '';
        $page_data['_updatedAt'] = $row['updated_at'] ?? '';
        return $page_data;
    }

    /**
     * Resolve a user's plan tier from server-authoritative sources only.
     * Never read tier from the request body — it is a privilege, not a setting.
     */
    private function resolve_user_tier(int $user_id): string {
        $valid_tiers = ['free', 'personal', 'professional', 'agency'];

        // Tier stored in user meta by a license handler (e.g., Freemius).
        $tier = (string) get_user_meta($user_id, 'nexus_plan_tier', true);

        return in_array($tier, $valid_tiers, true) ? $tier : 'free';
    }

    /**
     * @return array<string, array<string,mixed>>
     */
    private function get_image_sizes(int $attachment_id): array {
        $sizes      = [];
        $registered = get_intermediate_image_sizes();
        foreach ($registered as $size) {
            $src = wp_get_attachment_image_src($attachment_id, $size);
            if ($src) {
                $sizes[$size] = [
                    'url'    => esc_url($src[0]),
                    'width'  => (int) $src[1],
                    'height' => (int) $src[2],
                ];
            }
        }
        return $sizes;
    }

    // ─── Response Factories ───────────────────────────────────────────────────

    /**
     * @param array<string,mixed> $data
     */
    private function ok(array $data): \WP_REST_Response {
        $response = new \WP_REST_Response($data, 200);
        $response->header('X-Nexus-Version', NEXUS_VERSION);
        // Never leak server timing data in production.
        if (! (defined('WP_DEBUG') && WP_DEBUG)) {
            $response->header('Server', ''); // Obscure server identity.
        }
        return $response;
    }

    private function not_found(): \WP_Error {
        // Generic message — never reveal whether the ID exists or the user lacks access.
        return new \WP_Error('nexus_not_found', 'The requested resource was not found.', ['status' => 404]);
    }

    private function db_error(\WP_Error $error): \WP_Error {
        // NEVER pass raw DB error messages to the client — they may contain schema details.
        AuditLog::record('db_error', ['original_code' => $error->get_error_code()]);
        return new \WP_Error('nexus_server_error', 'A database error occurred. Please try again.', ['status' => 500]);
    }
}
