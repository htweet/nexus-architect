<?php
/**
 * AiService — The AI brain of Nexus Architect.
 *
 * Implements all four Phase 7 AI capabilities:
 *   7.1 — Natural Language Layout Generation
 *   7.2 — AI Content Population
 *   7.3 — Predictive Global Style Suggestions
 *   7.4 — Auto-Performance Advisor
 *
 * Architecture:
 *   - API provider (OpenAI by default) is configurable via WP options.
 *   - API key stored encrypted in wp_options (nexus_ai_api_key).
 *   - Every call is logged in nexus_ai_logs (AiDatabase).
 *   - Usage limits enforced per tier BEFORE calling external API.
 *   - Gracefully degrades: if no API key, returns descriptive error.
 *   - System prompts are versioned and stored as constants.
 *
 * @package NexusArchitect
 */

declare(strict_types=1);

namespace NexusArchitect;

final class AiService {

    private const OPTION_API_KEY   = 'nexus_ai_api_key';
    private const OPTION_MODEL     = 'nexus_ai_model';
    private const OPTION_PROVIDER  = 'nexus_ai_provider';
    private const ENCRYPTION_KEY   = 'nexus_ai_enc_salt';

    private const DEFAULT_MODEL    = 'gpt-4o-mini';
    private const DEFAULT_PROVIDER = 'openai';

    // Tier monthly generation limits (matches FeatureFlags in TS)
    private const TIER_LIMITS = [
        'free'         => 10,
        'personal'     => 50,
        'professional' => 200,
        'agency'       => -1, // unlimited
    ];

    // ─── Node schema for NL generation prompt ─────────────────────────────────

    private const NODE_SCHEMA_PROMPT = <<<'PROMPT'
You are a web page layout generator for Nexus Architect, a professional page builder.
Your task is to generate a valid JSON node tree from a natural language description.

## Node Schema
Each node must follow this exact TypeScript interface:
{
  "id": "unique-string-id",
  "type": "container|heading|paragraph|button|image|divider|spacer",
  "parentId": "parent-id-or-null",
  "children": ["child-id-1", "child-id-2"],
  "props": { /* widget-specific props */ },
  "styles": { "base": { "cssProperty": "value" } },
  "visibility": {},
  "interactions": {},
  "locked": false,
  "hidden": false,
  "_v": 1,
  "_ops": []
}

## Widget Props
- heading: { text, level ("h1"|"h2"|"h3"|"h4"), align ("left"|"center"|"right") }
- paragraph: { html (HTML string) }
- button: { text, url, variant ("solid"|"outline"|"ghost"), size ("sm"|"md"|"lg") }
- container: { direction ("column"|"row"), justify, align, gap, padding, background, minHeight }
- image: { src, alt, objectFit ("cover"|"contain"|"fill") }
- divider: { color, thickness, margin }
- spacer: { height }

## Output Format
Return ONLY valid JSON with this structure:
{
  "rootNodeId": "root",
  "nodeMap": {
    "root": { ...rootNode with type "container" },
    "node-1": { ...node },
    ...
  }
}

Rules:
1. Every node MUST have a unique id
2. The root node has parentId: null
3. All child IDs in children[] must exist in nodeMap
4. parentId must be set correctly on every non-root node
5. Use realistic, professional copy — not lorem ipsum
6. Apply modern, attractive inline styles using the styles.base object
7. Dark-themed designs should use dark backgrounds (e.g., #050912)
8. Return ONLY the JSON object — no markdown, no explanation
PROMPT;

    // ─── Constructor ──────────────────────────────────────────────────────────

    public function __construct(
        private readonly AiDatabase $ai_db,
    ) {}

    // ─── Settings ─────────────────────────────────────────────────────────────

    public function get_settings(): array {
        return [
            'provider'  => get_option(self::OPTION_PROVIDER, self::DEFAULT_PROVIDER),
            'model'     => get_option(self::OPTION_MODEL, self::DEFAULT_MODEL),
            'hasApiKey' => ! empty($this->get_api_key()),
            'models'    => $this->available_models(),
        ];
    }

    public function save_settings(string $provider, string $model, string $api_key): void {
        update_option(self::OPTION_PROVIDER, sanitize_text_field($provider));
        update_option(self::OPTION_MODEL,    sanitize_text_field($model));
        if (!empty($api_key)) {
            update_option(self::OPTION_API_KEY, $this->encrypt($api_key));
        }
    }

    private function get_api_key(): string {
        $encrypted = (string) get_option(self::OPTION_API_KEY, '');
        return $encrypted ? $this->decrypt($encrypted) : '';
    }

    private function available_models(): array {
        return [
            ['id' => 'gpt-4o-mini',  'name' => 'GPT-4o Mini (fast, low cost)',  'provider' => 'openai'],
            ['id' => 'gpt-4o',       'name' => 'GPT-4o (best quality)',          'provider' => 'openai'],
            ['id' => 'gpt-3.5-turbo','name' => 'GPT-3.5 Turbo (fastest)',       'provider' => 'openai'],
        ];
    }

    // ─── 7.1 — Natural Language Layout Generation ─────────────────────────────

    /**
     * Generate a NexusNode tree from a natural language prompt.
     *
     * @return array{rootNodeId: string, nodeMap: array<string, mixed>}|\WP_Error
     */
    public function generate_layout(string $prompt, string $page_id, string $tier): array|\WP_Error {
        $check = $this->check_usage($tier, get_current_user_id());
        if (is_wp_error($check)) return $check;

        $model = get_option(self::OPTION_MODEL, self::DEFAULT_MODEL);

        $messages = [
            ['role' => 'system', 'content' => self::NODE_SCHEMA_PROMPT],
            ['role' => 'user',   'content' => 'Generate a page layout for: ' . $prompt],
        ];

        $result = $this->call_api($messages, $model, 4096);

        if (is_wp_error($result)) {
            $this->ai_db->log_generation('generate', $prompt, $model, 0, false, $page_id, $result->get_error_message());
            return $result;
        }

        ['content' => $content, 'tokens' => $tokens] = $result;

        // Parse and validate the JSON tree
        $tree = $this->parse_node_tree($content);
        if (is_wp_error($tree)) {
            $this->ai_db->log_generation('generate', $prompt, $model, $tokens, false, $page_id, 'JSON parse failed');
            return $tree;
        }

        $this->ai_db->log_generation('generate', $prompt, $model, $tokens, true, $page_id);
        return $tree;
    }

    // ─── 7.2 — AI Content Population ─────────────────────────────────────────

    /**
     * Fill a page's placeholder nodes with AI-generated contextual content.
     *
     * @param  array  $node_map  The page's nodeMap
     * @param  string $context   Brief description of the page purpose
     * @return array|\WP_Error   Updated nodeMap with AI content
     */
    public function populate_content(array $node_map, string $context, string $page_id, string $tier): array|\WP_Error {
        $check = $this->check_usage($tier, get_current_user_id());
        if (is_wp_error($check)) return $check;

        $model = get_option(self::OPTION_MODEL, self::DEFAULT_MODEL);

        // Extract text nodes for population
        $text_nodes = [];
        foreach ($node_map as $id => $node) {
            if (in_array($node['type'] ?? '', ['heading', 'paragraph', 'button'], true)) {
                $text_nodes[$id] = [
                    'type'  => $node['type'],
                    'props' => $node['props'] ?? [],
                ];
            }
        }

        if (empty($text_nodes)) {
            return new \WP_Error('nexus_ai_no_text', 'No text nodes found to populate.', ['status' => 400]);
        }

        $system = 'You are a professional copywriter for websites. Given text nodes and a page context, return updated props for each node with professional copy. Return ONLY valid JSON: {"nodeId": {"text": "...", "html": "..."}, ...}. Keys should only include relevant props for each node type.';

        $messages = [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => sprintf(
                "Page context: %s\n\nText nodes to populate:\n%s",
                $context,
                wp_json_encode($text_nodes),
            )],
        ];

        $result = $this->call_api($messages, $model, 2048);
        if (is_wp_error($result)) {
            $this->ai_db->log_generation('populate', $context, $model, 0, false, $page_id, $result->get_error_message());
            return $result;
        }

        ['content' => $content, 'tokens' => $tokens] = $result;

        $updates = $this->safe_json_decode($content);
        if (!is_array($updates)) {
            $this->ai_db->log_generation('populate', $context, $model, $tokens, false, $page_id, 'Invalid JSON response');
            return new \WP_Error('nexus_ai_parse', 'AI returned invalid content. Please try again.', ['status' => 500]);
        }

        // Apply updates to nodeMap
        foreach ($updates as $node_id => $prop_updates) {
            if (isset($node_map[$node_id]) && is_array($prop_updates)) {
                foreach ($prop_updates as $key => $value) {
                    $node_map[$node_id]['props'][$key] = $this->sanitize_prop_value($key, $value);
                }
            }
        }

        $this->ai_db->log_generation('populate', $context, $model, $tokens, true, $page_id);
        return $node_map;
    }

    // ─── 7.3 — Global Style Suggestions ──────────────────────────────────────

    /**
     * Suggest complementary global style changes based on current tokens.
     *
     * @param  array  $current_tokens  e.g. ['--color-accent': '#10b981', '--font-heading': 'Inter']
     * @param  string $changed_token   The token the user just changed
     * @return array|\WP_Error         Suggested full token set
     */
    public function suggest_styles(array $current_tokens, string $changed_token, string $tier): array|\WP_Error {
        $check = $this->check_usage($tier, get_current_user_id(), 'style_suggest');
        if (is_wp_error($check)) return $check;

        $model = get_option(self::OPTION_MODEL, self::DEFAULT_MODEL);

        $system = 'You are a professional web designer. Given a set of CSS design tokens and a recently changed token, suggest a harmonious complete token set. Return ONLY valid JSON: {"--token-name": "value"}. Use only CSS-valid values.';

        $messages = [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => sprintf(
                "Current tokens: %s\n\nUser just changed: %s\n\nSuggest a harmonious complete token set.",
                wp_json_encode($current_tokens),
                $changed_token,
            )],
        ];

        $result = $this->call_api($messages, $model, 1024);
        if (is_wp_error($result)) {
            $this->ai_db->log_generation('style_suggest', $changed_token, $model, 0, false);
            return $result;
        }

        ['content' => $content, 'tokens' => $tokens] = $result;
        $suggestions = $this->safe_json_decode($content);

        if (!is_array($suggestions)) {
            $this->ai_db->log_generation('style_suggest', $changed_token, $model, $tokens, false, '', 'Invalid JSON');
            return new \WP_Error('nexus_ai_parse', 'AI returned invalid style suggestions.', ['status' => 500]);
        }

        // Sanitize CSS values
        $safe = [];
        foreach ($suggestions as $token => $value) {
            if (is_string($token) && str_starts_with($token, '--') && is_string($value)) {
                $safe[sanitize_text_field($token)] = sanitize_text_field($value);
            }
        }

        $this->ai_db->log_generation('style_suggest', $changed_token, $model, $tokens, true);
        return $safe;
    }

    // ─── 7.4 — Performance Advisor ────────────────────────────────────────────

    /**
     * Analyze a published page's static HTML and return actionable advice.
     * Results are persisted in nexus_perf_audits.
     *
     * @return array|\WP_Error  { score, findings[], htmlSize, cssSize, auditId }
     */
    public function audit_performance(string $page_id, string $static_html, string $tier): array|\WP_Error {
        $model = get_option(self::OPTION_MODEL, self::DEFAULT_MODEL);

        // Measure sizes
        $html_size = strlen($static_html);
        $css_size  = 0;

        // Extract inline CSS for analysis
        preg_match_all('/<style[^>]*>(.*?)<\/style>/si', $static_html, $css_matches);
        $inline_css = implode(' ', $css_matches[1] ?? []);
        $css_size   = strlen($inline_css);

        // Build a condensed audit snapshot (not the full HTML — saves tokens)
        $audit_snapshot = $this->build_audit_snapshot($static_html, $html_size, $css_size);

        $system = <<<'SYSTEM'
You are a web performance expert. Analyze this web page snapshot and return a JSON performance audit.
Return ONLY valid JSON with this structure:
{
  "score": 85,
  "findings": [
    {
      "id": "unique-id",
      "severity": "high|medium|low",
      "category": "performance|seo|accessibility|best-practices",
      "title": "Short title",
      "description": "What the issue is",
      "recommendation": "Specific action to fix it",
      "impact": "High|Medium|Low"
    }
  ]
}
Score 0-100 (100 = perfect). Focus on real, actionable findings only. Maximum 8 findings.
SYSTEM;

        $messages = [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user',   'content' => "Audit this page:\n\n" . $audit_snapshot],
        ];

        $result = $this->call_api($messages, $model, 2048);
        if (is_wp_error($result)) {
            $this->ai_db->log_generation('audit', "page:{$page_id}", $model, 0, false, $page_id, $result->get_error_message());
            return $result;
        }

        ['content' => $content, 'tokens' => $tokens] = $result;
        $audit = $this->safe_json_decode($content);

        if (!is_array($audit) || !isset($audit['score'], $audit['findings'])) {
            $this->ai_db->log_generation('audit', "page:{$page_id}", $model, $tokens, false, $page_id, 'Invalid response');
            return new \WP_Error('nexus_ai_parse', 'Audit returned invalid response. Please try again.', ['status' => 500]);
        }

        $score    = max(0, min(100, (int) ($audit['score'] ?? 0)));
        $findings = array_slice(is_array($audit['findings']) ? $audit['findings'] : [], 0, 8);

        // Persist to DB
        $audit_id = $this->ai_db->save_audit($page_id, $score, $findings, $html_size, $css_size);

        $this->ai_db->log_generation('audit', "page:{$page_id}", $model, $tokens, true, $page_id);

        return [
            'auditId'  => $audit_id,
            'score'    => $score,
            'findings' => $findings,
            'htmlSize' => $html_size,
            'cssSize'  => $css_size,
        ];
    }

    // ─── API Call ─────────────────────────────────────────────────────────────

    /**
     * @param  array<int, array{role: string, content: string}> $messages
     * @return array{content: string, tokens: int}|\WP_Error
     */
    private function call_api(array $messages, string $model, int $max_tokens): array|\WP_Error {
        $api_key = $this->get_api_key();
        if (empty($api_key)) {
            return new \WP_Error(
                'nexus_ai_no_key',
                'AI features require an API key. Configure it in Nexus → Settings → AI.',
                ['status' => 422],
            );
        }

        $provider = get_option(self::OPTION_PROVIDER, self::DEFAULT_PROVIDER);

        if ($provider === 'openai') {
            return $this->call_openai($messages, $model, $max_tokens, $api_key);
        }

        return new \WP_Error('nexus_ai_provider', 'Unsupported AI provider.', ['status' => 400]);
    }

    /**
     * @param  array<int, array{role: string, content: string}> $messages
     * @return array{content: string, tokens: int}|\WP_Error
     */
    private function call_openai(array $messages, string $model, int $max_tokens, string $api_key): array|\WP_Error {
        $body = wp_json_encode([
            'model'       => $model,
            'messages'    => $messages,
            'max_tokens'  => $max_tokens,
            'temperature' => 0.7,
        ]);

        $response = wp_remote_post('https://api.openai.com/v1/chat/completions', [
            'timeout' => 60,
            'headers' => [
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type'  => 'application/json',
            ],
            'body' => $body,
        ]);

        if (is_wp_error($response)) {
            return new \WP_Error('nexus_ai_network', 'AI service unreachable. Please try again.', ['status' => 503]);
        }

        $status = wp_remote_retrieve_response_code($response);
        $raw    = wp_remote_retrieve_body($response);
        $data   = json_decode($raw, true);

        if ($status === 401) {
            return new \WP_Error('nexus_ai_auth', 'Invalid API key. Please check your AI settings.', ['status' => 422]);
        }

        if ($status === 429) {
            return new \WP_Error('nexus_ai_rate', 'AI rate limit exceeded. Please wait a moment and try again.', ['status' => 429]);
        }

        if ($status !== 200 || !isset($data['choices'][0]['message']['content'])) {
            $msg = $data['error']['message'] ?? 'Unknown error from AI service.';
            return new \WP_Error('nexus_ai_error', $msg, ['status' => 500]);
        }

        return [
            'content' => trim($data['choices'][0]['message']['content']),
            'tokens'  => (int) ($data['usage']['total_tokens'] ?? 0),
        ];
    }

    // ─── Usage Enforcement ────────────────────────────────────────────────────

    private function check_usage(string $tier, int $user_id, string $feature = 'generate'): true|\WP_Error {
        $limit = self::TIER_LIMITS[$tier] ?? self::TIER_LIMITS['free'];
        if ($limit === -1) return true; // Unlimited

        $used = $this->ai_db->count_monthly_generations($user_id);
        if ($used >= $limit) {
            return new \WP_Error(
                'nexus_ai_limit',
                sprintf(
                    'Monthly AI generation limit reached (%d/%d). Upgrade your plan for more.',
                    $used,
                    $limit,
                ),
                ['status' => 429, 'used' => $used, 'limit' => $limit],
            );
        }

        return true;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Parse and validate the AI-generated node tree JSON.
     * Rejects malformed trees before they reach the canvas.
     *
     * @return array{rootNodeId: string, nodeMap: array}|\WP_Error
     */
    private function parse_node_tree(string $content): array|\WP_Error {
        // Strip markdown code fences if present
        $content = preg_replace('/^```(?:json)?\s*/m', '', $content);
        $content = preg_replace('/\s*```$/m', '', $content);
        $content = trim($content);

        $tree = $this->safe_json_decode($content);

        if (!is_array($tree)) {
            return new \WP_Error('nexus_ai_parse', 'AI returned invalid JSON. Please try again.', ['status' => 500]);
        }

        if (!isset($tree['rootNodeId'], $tree['nodeMap']) || !is_array($tree['nodeMap'])) {
            return new \WP_Error('nexus_ai_schema', 'AI returned an unexpected tree structure. Please try again.', ['status' => 500]);
        }

        // Validate root node exists
        $root_id = $tree['rootNodeId'];
        if (!isset($tree['nodeMap'][$root_id])) {
            return new \WP_Error('nexus_ai_schema', 'AI tree is missing the root node.', ['status' => 500]);
        }

        // Validate all children references exist
        foreach ($tree['nodeMap'] as $node_id => $node) {
            if (!is_array($node)) continue;
            foreach ($node['children'] ?? [] as $child_id) {
                if (!isset($tree['nodeMap'][$child_id])) {
                    // Remove the invalid reference rather than failing hard
                    $tree['nodeMap'][$node_id]['children'] = array_filter(
                        $node['children'],
                        fn($cid) => isset($tree['nodeMap'][$cid]),
                    );
                    break;
                }
            }
        }

        // Sanitize all props (XSS protection)
        foreach ($tree['nodeMap'] as $id => $node) {
            $tree['nodeMap'][$id] = $this->sanitize_node($node);
        }

        return $tree;
    }

    /**
     * Sanitize a node's props to prevent XSS injection.
     */
    private function sanitize_node(array $node): array {
        if (isset($node['props']) && is_array($node['props'])) {
            foreach ($node['props'] as $key => $value) {
                $node['props'][$key] = $this->sanitize_prop_value($key, $value);
            }
        }
        // Ensure required CRDT fields are present
        $node['_v']   = 1;
        $node['_ops'] = [];
        return $node;
    }

    private function sanitize_prop_value(string $key, mixed $value): mixed {
        if (!is_string($value)) return $value;

        // URL props — validate
        if (in_array($key, ['src', 'href', 'url'], true)) {
            return esc_url_raw($value);
        }

        // HTML props (paragraph content) — wp_kses_post
        if ($key === 'html') {
            return wp_kses_post($value);
        }

        // Everything else — sanitize as text
        return sanitize_text_field($value);
    }

    /**
     * Build a condensed page snapshot for the performance audit prompt.
     * Avoids sending full HTML (saves tokens, avoids PII in prompts).
     */
    private function build_audit_snapshot(string $html, int $html_size, int $css_size): string {
        $lines = [];

        // Page structure stats
        $lines[] = "HTML size: {$html_size} bytes";
        $lines[] = "Inline CSS size: {$css_size} bytes";

        // Count elements
        $img_count = preg_match_all('/<img\b/i', $html, $_m);
        $lines[] = "Images: {$img_count}";

        // Check for lazy loading
        $lazy_count = preg_match_all('/loading="lazy"/i', $html, $_m);
        $lines[] = "Lazy-loaded images: {$lazy_count}";

        // Check for alt attributes
        $no_alt = preg_match_all('/<img(?![^>]*\balt=)[^>]*>/i', $html, $_m);
        if ($no_alt > 0) $lines[] = "Images missing alt text: {$no_alt}";

        // Check for heading hierarchy
        preg_match_all('/<h([1-6])\b/i', $html, $h_matches);
        if (!empty($h_matches[1])) {
            $lines[] = "Heading levels used: H" . implode(', H', array_unique($h_matches[1]));
        }

        // Check for H1 presence
        if (!preg_match('/<h1\b/i', $html)) {
            $lines[] = "WARNING: No H1 tag found";
        }

        // Check for viewport meta
        if (!preg_match('/<meta[^>]+name="viewport"/i', $html)) {
            $lines[] = "WARNING: No viewport meta tag";
        }

        // Check for external scripts
        $ext_scripts = preg_match_all('/<script[^>]+src=["\']https?:/i', $html, $_m);
        if ($ext_scripts > 0) $lines[] = "External scripts: {$ext_scripts} (potential render-blocking)";

        // Check for inline event handlers (basic security/best-practices)
        $inline_handlers = preg_match_all('/\bon\w+\s*=\s*["\'][^"\']*["\']/i', $html, $_m);
        if ($inline_handlers > 0) $lines[] = "Inline event handlers: {$inline_handlers}";

        // Check for meta description
        if (!preg_match('/<meta[^>]+name="description"/i', $html)) {
            $lines[] = "WARNING: No meta description";
        }

        return implode("\n", $lines);
    }

    /**
     * Safe JSON decode with depth and size limits.
     */
    private function safe_json_decode(string $json): mixed {
        if (strlen($json) > 500000) return null; // 500KB limit
        return json_decode($json, true, 10);
    }

    // ─── Encryption ───────────────────────────────────────────────────────────

    private function get_enc_key(): string {
        $key = get_option(self::ENCRYPTION_KEY, '');
        if (empty($key)) {
            $key = wp_generate_password(64, true, true);
            update_option(self::ENCRYPTION_KEY, $key);
        }
        return $key;
    }

    private function encrypt(string $plaintext): string {
        if (!function_exists('openssl_encrypt')) return base64_encode($plaintext);
        $key  = substr(hash('sha256', $this->get_enc_key(), true), 0, 32);
        $iv   = random_bytes(16);
        $enc  = openssl_encrypt($plaintext, 'AES-256-CBC', $key, 0, $iv);
        return base64_encode($iv . $enc);
    }

    private function decrypt(string $ciphertext): string {
        if (!function_exists('openssl_decrypt')) return (string) base64_decode($ciphertext);
        try {
            $key    = substr(hash('sha256', $this->get_enc_key(), true), 0, 32);
            $data   = base64_decode($ciphertext);
            $iv     = substr($data, 0, 16);
            $enc    = substr($data, 16);
            $result = openssl_decrypt($enc, 'AES-256-CBC', $key, 0, $iv);
            return $result ?: '';
        } catch (\Throwable) {
            return '';
        }
    }
}
