import { config } from '@/constants/config';
import { AppError, toAppError } from '@/utils/errors';
import { log } from '@/utils/log';
import { secureKeys, secureStorage } from '@/utils/storage';

/**
 * The HTTP client the real services will use.
 *
 * It is written and wired now, before any endpoint exists, because the shape
 * of error handling is what the UI is built against. When `useMockServices`
 * flips to false the mock modules are swapped for ones that call `request()`
 * and every screen keeps working: they already only ever see `AppError`.
 *
 * No secrets live here. The bearer token comes from SecureStore at call time;
 * nothing is baked into the bundle.
 */

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Query string params; undefined values are dropped rather than sent as "undefined". */
  params?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  /** Set false for endpoints that must not carry credentials (public search). */
  authenticated?: boolean;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(path.replace(/^\//, ''), `${config.apiBaseUrl.replace(/\/$/, '')}/`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function errorForStatus(status: number, detail?: string): AppError {
  if (status === 401) return new AppError('unauthorized', { debugMessage: detail });
  if (status === 403) return new AppError('forbidden', { debugMessage: detail });
  if (status === 404) return new AppError('not-found', { debugMessage: detail });
  if (status === 409) return new AppError('slot-taken', { debugMessage: detail });
  if (status === 422) return new AppError('validation', { debugMessage: detail });
  if (status === 429) return new AppError('rate-limited', { debugMessage: detail });
  if (status >= 500) return new AppError('server', { debugMessage: detail });
  return new AppError('unknown', { debugMessage: `HTTP ${status}: ${detail ?? ''}` });
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, signal, authenticated = true } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  signal?.addEventListener('abort', () => controller.abort());

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (authenticated) {
      const token = await secureStorage.get(secureKeys.accessToken);
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      // The provider's own message is logged, never surfaced. Users get the
      // mapped copy from AppError instead.
      const detail =
        parsed && typeof parsed === 'object' && 'message' in parsed
          ? String((parsed as { message: unknown }).message)
          : text.slice(0, 300);
      const error = errorForStatus(response.status, detail);
      log.error('http', `${method} ${path} failed`, { status: response.status, detail });
      throw error;
    }

    return parsed as T;
  } catch (error) {
    throw toAppError(error);
  } finally {
    clearTimeout(timeout);
  }
}
