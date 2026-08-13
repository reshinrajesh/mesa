import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

import { AppError } from '@/utils/errors';

/**
 * The one QueryClient, plus the persister that makes the app usable offline.
 *
 * Retry policy is the interesting half: retrying a 404 or a validation failure
 * is three wasted seconds and a spinner the user watches for nothing, so only
 * genuinely transient errors get a second attempt.
 *
 * The other half is persistence. `gcTime` is a day and the cache is mirrored
 * into AsyncStorage, so a cold launch on the Underground renders yesterday's
 * restaurant list and your bookings instead of an error screen. Mutations are
 * deliberately not persisted — replaying a queued booking hours later, against
 * a table that has since gone, would be worse than asking the user to retry.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: (failureCount, error) => {
          if (error instanceof AppError && !error.retryable) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        // React Native has no window focus; refetching on it does nothing but
        // fire spurious requests on Android's app-state transitions.
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'mesa.query-cache',
  // Writing on every cache touch would thrash the disk during a scroll.
  throttleTime: 2000,
});

/** Bumping this discards every persisted cache, e.g. after a schema change. */
export const CACHE_BUSTER = 'v1';
