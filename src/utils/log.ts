/**
 * Logging with a scrubber in front of it.
 *
 * Every printer routes through `scrub`, because the fastest way to leak a token
 * is to `console.log(response)` while debugging and forget to take it out.
 */

const SENSITIVE_KEYS = /^(password|token|accessToken|refreshToken|otp|secret|authorization)$/i;

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.test(key) ? '[redacted]' : scrubValue(val, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 400) return `${value.slice(0, 400)}…`;
  return value;
}

function emit(level: 'log' | 'warn' | 'error', scope: string, message: string, meta?: unknown) {
  if (!__DEV__ && level === 'log') return;
  const payload = meta === undefined ? '' : scrubValue(meta);
  console[level](`[mesa:${scope}] ${message}`, payload);
}

export const log = {
  debug: (scope: string, message: string, meta?: unknown) => emit('log', scope, message, meta),
  warn: (scope: string, message: string, meta?: unknown) => emit('warn', scope, message, meta),
  error: (scope: string, message: string, meta?: unknown) => emit('error', scope, message, meta),
};
