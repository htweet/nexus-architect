<?php
/**
 * RateLimiter — token-bucket rate limiting via WordPress transients.
 *
 * Algorithm: Sliding-window counter.
 *   - Each (user+action) key maintains a request count + window start timestamp.
 *   - On each request: if the window has expired, reset. Otherwise increment.
 *   - If count exceeds the limit, return 429 with a Retry-After header.
 *
 * Transients use the object cache (Memcached / Redis) if available, falling
 * back to the WP options table. This means rate limits survive page reloads
 * but are per-server in a multi-node setup. For strict multi-node limiting,
 * define NEXUS_REDIS_RATE_LIMIT in wp-config.php (Phase 10 feature).
 *
 * @package NexusArchitect
 */

declare(strict_types=1);

namespace NexusArchitect;

final class RateLimiter {

    /**
     * Check whether the given key is within the allowed rate.
     *
     * @param  string $key      Unique identifier for this client+action pair.
     * @param  int    $limit    Maximum number of requests permitted per $window seconds.
     * @param  int    $window   Window duration in seconds.
     * @return true|\WP_Error   true = allowed; WP_Error = rate limit exceeded.
     */
    public function check(string $key, int $limit, int $window): true|\WP_Error {
        $now   = time();
        $data  = $this->get($key);

        if ($data === null || ($now - $data['window_start']) >= $window) {
            // Window expired or first request — start a fresh window.
            $this->set($key, ['window_start' => $now, 'count' => 1], $window);
            return true;
        }

        $new_count = $data['count'] + 1;

        if ($new_count > $limit) {
            $retry_after = $window - ($now - $data['window_start']);

            AuditLog::record('rate_limit_exceeded', [
                'key'         => $key,
                'count'       => $new_count,
                'limit'       => $limit,
                'retry_after' => $retry_after,
            ]);

            return new \WP_Error(
                'nexus_rate_limit',
                sprintf(
                    'Too many requests. Please wait %d second(s) before retrying.',
                    max(1, $retry_after),
                ),
                [
                    'status'      => 429,
                    'retry_after' => max(1, $retry_after),
                ],
            );
        }

        $this->set($key, ['window_start' => $data['window_start'], 'count' => $new_count], $window);
        return true;
    }

    /**
     * Manually reset the rate limit for a key (e.g., after a successful auth).
     */
    public function reset(string $key): void {
        delete_transient($key);
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    /**
     * @return array{window_start:int,count:int}|null
     */
    private function get(string $key): ?array {
        $value = get_transient($this->sanitise_key($key));
        if (! is_array($value)) return null;
        return $value;
    }

    /**
     * @param array{window_start:int,count:int} $data
     */
    private function set(string $key, array $data, int $ttl): void {
        set_transient($this->sanitise_key($key), $data, $ttl);
    }

    /**
     * WordPress transient keys have a 172-char limit and no slashes.
     */
    private function sanitise_key(string $key): string {
        return substr(preg_replace('/[^a-z0-9_]/i', '_', $key) ?? $key, 0, 172);
    }
}
