/**
 * ApiClient — typed fetch wrapper for the Nexus REST API.
 *
 * This is the ONLY place in the wp-adapter that makes HTTP calls.
 * It injects the nonce header on every mutating request, handles
 * JSON serialization, and maps HTTP errors to typed Error instances.
 *
 * Zero WordPress globals — it receives baseUrl and nonce as constructor args.
 */

export class NexusApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'NexusApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean>;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly nonce: string;

  constructor(baseUrl: string, nonce: string) {
    // Normalise — strip trailing slash.
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.nonce   = nonce;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params } = options;

    // Build URL with query params.
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    // Inject nonce on all mutating requests.
    if (method !== 'GET') {
      headers['X-Nexus-Nonce'] = this.nonce;
    }

    // exactOptionalPropertyTypes: don't spread `body: undefined` — omit it for GET.
    const fetchInit: RequestInit = {
      method,
      headers,
      credentials: 'same-origin',
      ...(body !== undefined && { body: JSON.stringify(body) }),
    };

    const response = await fetch(url.toString(), fetchInit);

    if (!response.ok) {
      let code    = `http_${response.status}`;
      let message = response.statusText;

      try {
        const errorData = await response.json() as { code?: string; message?: string };
        code    = errorData.code    ?? code;
        message = errorData.message ?? message;
      } catch {
        // JSON parse failed — use HTTP status text as message.
      }

      throw new NexusApiError(response.status, code, message);
    }

    // 204 No Content — return null cast to T.
    if (response.status === 204) {
      return null as T;
    }

    return response.json() as Promise<T>;
  }

  // ─── Convenience methods ──────────────────────────────────────────────────

  get<T>(path: string, params?: RequestOptions['params']): Promise<T> {
    // exactOptionalPropertyTypes: omit params key entirely when undefined.
    return this.request<T>(path, { method: 'GET', ...(params !== undefined && { params }) });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', ...(body !== undefined && { body }) });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', ...(body !== undefined && { body }) });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}
