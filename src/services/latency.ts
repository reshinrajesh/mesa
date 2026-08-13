import { config } from '@/constants/config';
import { AppError } from '@/utils/errors';

/**
 * Mock transport behaviour.
 *
 * The mock services are deliberately async and deliberately slow. If they
 * resolved synchronously, every skeleton, spinner and optimistic update in the
 * app would be dead code that breaks the day a real API arrives.
 */

export function delay(ms?: number): Promise<void> {
  const { min, max } = config.mockLatency;
  const duration = ms ?? min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, duration));
}

/** Injects the configured failure rate so error states get exercised in dev. */
export async function simulate<T>(produce: () => T | Promise<T>, ms?: number): Promise<T> {
  await delay(ms);
  if (config.mockFailureRate > 0 && Math.random() < config.mockFailureRate) {
    throw new AppError('server', { debugMessage: 'injected mock failure' });
  }
  return produce();
}

/** Cursor helpers, so mock pagination behaves like the real thing will. */
export function paginate<T>(items: T[], cursor: string | null | undefined, limit: number) {
  const start = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
  const slice = items.slice(start, start + limit);
  const next = start + limit;
  return {
    items: slice,
    nextCursor: next < items.length ? String(next) : null,
    total: items.length,
  };
}
