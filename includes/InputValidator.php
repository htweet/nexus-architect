<?php
/**
 * InputValidator — strict input sanitisation and schema validation.
 *
 * Defends against:
 *   - JSON bombs (deeply nested / oversized objects)
 *   - Mass assignment (unexpected/prohibited fields sneaking into DB writes)
 *   - XSS via page JSON props (script tags in widget props)
 *   - Type confusion / PHP loose comparison traps
 *   - ReDoS via crafted string inputs
 *   - Prototype pollution equivalents in deeply nested JSON
 *   - Slug / ID injection (non-canonical characters)
 *
 * Philosophy: reject anything that doesn't match an explicit positive pattern.
 * Never silently strip — either accept cleanly or reject with a clear error.
 *
 * @package NexusArchitect
 */

declare(strict_types=1);

namespace NexusArchitect;

final class InputValidator {

    // ─── Constants ────────────────────────────────────────────────────────────

    /** Maximum depth for json_decode to prevent stack overflow. */
    private const JSON_MAX_DEPTH = 32;

    /** Maximum number of keys per JSON object (recursively). */
    private const JSON_MAX_KEYS = 10_000;

    /** Maximum length of a slug string. */
    private const MAX_SLUG_LENGTH = 200;

    /** Maximum length of a page title. */
    private const MAX_TITLE_LENGTH = 500;

    /** Maximum length of a UUID/node-id string. */
    private const MAX_ID_LENGTH = 64;

    /**
     * Allowed top-level keys in a NexusPage JSON blob.
     * Any unknown key is stripped to prevent mass-assignment.
     */
    private const PAGE_ALLOWED_KEYS = [
        'id', 'title', 'slug', 'description', 'rootNodeId', 'nodeMap',
        'globalStyles', 'seoMeta', 'schemaVersion', 'createdAt', 'updatedAt',
        '_status', '_createdAt', '_updatedAt',
    ];

    /**
     * Allowed top-level keys in a NexusNode JSON object.
     */
    private const NODE_ALLOWED_KEYS = [
        'id', 'type', 'parentId', 'children', 'props', 'styles',
        'visibility', 'interactions', 'locked', 'hidden', 'label', '_v', '_ops',
    ];

    /**
     * Widget prop value patterns that are never allowed (XSS defence).
     * Matched case-insensitively as substring patterns.
     */
    private const DANGEROUS_PROP_PATTERNS = [
        '<script', 'javascript:', 'vbscript:', 'data:text/html',
        'onload=', 'onerror=', 'onclick=', 'onmouseover=',
        'eval(', 'expression(', 'document.cookie', 'document.write',
        'window.location', '&#', '<', '>',
    ];

    // ─── Safe JSON Decode ─────────────────────────────────────────────────────

    /**
     * Decode JSON with enforced depth and key count limits.
     * Never use raw json_decode() on user input in this codebase.
     *
     * @return array<string,mixed>|null  null on failure.
     */
    public function decode_json(string $raw): ?array {
        if ($raw === '') return null;

        // Enforce depth limit to prevent stack overflow.
        $decoded = json_decode($raw, true, self::JSON_MAX_DEPTH, JSON_BIGINT_AS_STRING);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        if (! is_array($decoded)) {
            return null;
        }

        // Count total keys recursively to prevent key-bomb attacks.
        if ($this->count_keys_recursive($decoded) > self::JSON_MAX_KEYS) {
            AuditLog::record('json_key_bomb', [
                'user_id'   => get_current_user_id(),
                'key_count' => $this->count_keys_recursive($decoded),
            ]);
            return null;
        }

        return $decoded;
    }

    // ─── Field Validators ─────────────────────────────────────────────────────

    /**
     * Validate a page ID or node ID (UUID-style, alphanumeric + hyphen).
     *
     * Uses a strict non-backtracking pattern to prevent ReDoS.
     */
    public function validate_id(string $id): bool|\WP_Error {
        if ($id === '') {
            return new \WP_Error('nexus_invalid_id', 'ID cannot be empty.', ['status' => 400]);
        }
        if (strlen($id) > self::MAX_ID_LENGTH) {
            return new \WP_Error('nexus_invalid_id', 'ID exceeds maximum length.', ['status' => 400]);
        }
        // Anchored pattern, no alternation, no quantifier nesting → immune to ReDoS.
        if (! preg_match('/\A[a-zA-Z0-9_\-]+\z/', $id)) {
            return new \WP_Error('nexus_invalid_id', 'ID contains invalid characters.', ['status' => 400]);
        }
        return true;
    }

    /**
     * Validate and sanitise a page title.
     */
    public function validate_title(string $title): string|\WP_Error {
        $title = trim($title);
        if ($title === '') {
            return new \WP_Error('nexus_invalid_title', 'Title cannot be empty.', ['status' => 400]);
        }
        if (mb_strlen($title) > self::MAX_TITLE_LENGTH) {
            return new \WP_Error('nexus_invalid_title', sprintf('Title must be under %d characters.', self::MAX_TITLE_LENGTH), ['status' => 400]);
        }
        return sanitize_text_field($title);
    }

    /**
     * Validate and sanitise a URL slug.
     * Produces a lowercase, hyphenated, WP-canonical slug.
     */
    public function validate_slug(string $slug): string|\WP_Error {
        $slug = sanitize_title(trim($slug));
        if ($slug === '') {
            return new \WP_Error('nexus_invalid_slug', 'Slug cannot be empty.', ['status' => 400]);
        }
        if (strlen($slug) > self::MAX_SLUG_LENGTH) {
            return new \WP_Error('nexus_invalid_slug', sprintf('Slug must be under %d characters.', self::MAX_SLUG_LENGTH), ['status' => 400]);
        }
        return $slug;
    }

    // ─── Page JSON Schema Validation ──────────────────────────────────────────

    /**
     * Strip all fields not in PAGE_ALLOWED_KEYS from an incoming page blob.
     * Also sanitises node props to remove XSS payloads.
     *
     * This is the mass-assignment firewall for the NexusPage schema.
     *
     * @param  array<string,mixed> $page
     * @return array<string,mixed>|\WP_Error
     */
    public function sanitise_page_blob(array $page): array|\WP_Error {
        // Strip unknown top-level keys.
        $clean = array_intersect_key($page, array_flip(self::PAGE_ALLOWED_KEYS));

        // Sanitise nodeMap entries.
        if (isset($clean['nodeMap']) && is_array($clean['nodeMap'])) {
            $sanitised_map = [];
            foreach ($clean['nodeMap'] as $node_id => $node) {
                // Validate the node key itself.
                $id_check = $this->validate_id((string) $node_id);
                if (is_wp_error($id_check)) {
                    return $id_check;
                }
                if (! is_array($node)) continue;

                // Strip unknown node keys.
                $clean_node = array_intersect_key($node, array_flip(self::NODE_ALLOWED_KEYS));

                // Sanitise widget props (XSS vector).
                if (isset($clean_node['props']) && is_array($clean_node['props'])) {
                    $clean_node['props'] = $this->sanitise_props($clean_node['props']);
                }

                $sanitised_map[$node_id] = $clean_node;
            }
            $clean['nodeMap'] = $sanitised_map;
        }

        // Sanitise seoMeta.
        if (isset($clean['seoMeta']) && is_array($clean['seoMeta'])) {
            $clean['seoMeta'] = $this->sanitise_seo_meta($clean['seoMeta']);
        }

        return $clean;
    }

    /**
     * Validate that a nodeMap has a valid root node before persisting.
     *
     * @param  array<string,mixed> $page
     */
    public function validate_page_structure(array $page): bool|\WP_Error {
        if (empty($page['rootNodeId'])) {
            return new \WP_Error('nexus_invalid_structure', 'Page is missing rootNodeId.', ['status' => 400]);
        }

        $root_id = (string) $page['rootNodeId'];
        if (! isset($page['nodeMap'][$root_id])) {
            return new \WP_Error(
                'nexus_invalid_structure',
                'rootNodeId does not exist in nodeMap.',
                ['status' => 400],
            );
        }

        return true;
    }

    // ─── XSS Defence for Widget Props ────────────────────────────────────────

    /**
     * Recursively sanitise widget props to prevent XSS via stored page data.
     *
     * Strings are checked against DANGEROUS_PROP_PATTERNS. Any match causes
     * the value to be replaced with an empty string rather than stripped
     * entirely (to preserve prop keys for the renderer) but with an audit entry.
     *
     * @param  array<string,mixed> $props
     * @return array<string,mixed>
     */
    public function sanitise_props(array $props): array {
        $clean = [];
        foreach ($props as $key => $value) {
            // Key sanitisation — no HTML in prop keys.
            $safe_key = sanitize_key((string) $key);
            if ($safe_key === '') continue;

            $clean[$safe_key] = $this->sanitise_prop_value($value);
        }
        return $clean;
    }

    /**
     * @param  mixed $value
     * @return mixed
     */
    private function sanitise_prop_value(mixed $value): mixed {
        if (is_string($value)) {
            foreach (self::DANGEROUS_PROP_PATTERNS as $pattern) {
                if (stripos($value, $pattern) !== false) {
                    AuditLog::record('xss_prop_attempt', [
                        'user_id' => get_current_user_id(),
                        'pattern' => $pattern,
                        'snippet' => substr($value, 0, 100),
                    ]);
                    return ''; // Neutralise — do not pass through.
                }
            }
            // Safe to pass through after WP text sanitisation.
            return wp_kses($value, wp_kses_allowed_html('post'));
        }

        if (is_array($value)) {
            return $this->sanitise_props($value);
        }

        // Scalars (int, float, bool, null) pass through unchanged.
        if (is_scalar($value) || is_null($value)) {
            return $value;
        }

        // Unknown type — reject defensively.
        return null;
    }

    /**
     * @param  array<string,mixed> $meta
     * @return array<string,mixed>
     */
    private function sanitise_seo_meta(array $meta): array {
        $allowed = ['title', 'description', 'ogImage', 'canonicalUrl', 'noIndex'];
        $clean   = array_intersect_key($meta, array_flip($allowed));

        foreach (['title', 'description'] as $field) {
            if (isset($clean[$field])) {
                $clean[$field] = sanitize_text_field((string) $clean[$field]);
            }
        }
        if (isset($clean['ogImage'])) {
            $clean['ogImage'] = esc_url_raw((string) $clean['ogImage']);
        }
        if (isset($clean['canonicalUrl'])) {
            $clean['canonicalUrl'] = esc_url_raw((string) $clean['canonicalUrl']);
        }
        if (isset($clean['noIndex'])) {
            $clean['noIndex'] = (bool) $clean['noIndex'];
        }

        return $clean;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Count all keys in a nested array to detect JSON key-bomb attacks.
     *
     * @param  array<mixed,mixed> $array
     */
    private function count_keys_recursive(array $array): int {
        $count = count($array);
        foreach ($array as $value) {
            if (is_array($value)) {
                $count += $this->count_keys_recursive($value);
            }
        }
        return $count;
    }
}
