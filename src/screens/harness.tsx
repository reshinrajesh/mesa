import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import type { AppNotification, Reservation } from '@/types';

import { useAuthStore } from '@/store/authStore';
import { storageKeys } from '@/utils/storage';

/**
 * Rendering a whole route.
 *
 * The component tests render one component with props. These render what the
 * user actually opens: the screen, its queries, its services and the storage
 * underneath them, with only the native edges mocked. That is the only level at
 * which "the Clear button appears once something has been read" is a fact
 * rather than an intention.
 *
 * They live under `src/` rather than beside the screens because they cannot
 * live beside the screens. expo-router builds its route table from
 * `require.context(app, true, /.*\.[tj]sx?$/)` — every file under `app/` except
 * `+api` and `+html` becomes a route — so `app/notifications.test.tsx` would
 * ship in the bundle as a screen called "notifications.test".
 */

/** Fixed insets: the real provider measures asynchronously and never resolves in a test. */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Every client handed out this test, so the lifecycle below can dispose them. */
const clients: QueryClient[] = [];

/**
 * Importing this module opts a suite into its cleanup, deliberately.
 *
 * A screen leaves queries in flight — the mock services answer after 180–520ms
 * — and a `QueryClient` with live subscriptions keeps the whole run alive well
 * past the assertions: before this hook existed, a suite whose tests took
 * eleven seconds took minutes to exit. Cancelling and dropping each client at
 * the end of its own test is what fixes that.
 *
 * What it does not fix is the `act(...)` warnings from `VirtualizedList`'s own
 * render timer, which reschedules after teardown. A settling delay here was
 * tried and measured: same thirteen warnings, six seconds a suite slower. It is
 * not here because it bought nothing.
 */
afterEach(async () => {
  for (const client of clients) {
    client.cancelQueries();
    client.unmount();
    client.clear();
  }
  clients.length = 0;
});

export interface ScreenOptions {
  /** Session kind. Screens behave differently for a guest. */
  session?: 'authenticated' | 'guest' | 'anonymous';
}

/**
 * Renders a route component with the providers the app gives it.
 *
 * A fresh `QueryClient` per call, with retries off: a screen under test that
 * hits an error path should show it immediately rather than three seconds later.
 */
export async function renderScreen(ui: React.ReactElement, options: ScreenOptions = {}) {
  useAuthStore.setState({
    kind: options.session ?? 'authenticated',
    user: null,
    hydrated: true,
  });

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  clients.push(client);

  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </SafeAreaProvider>,
  );
}

/**
 * Puts the app's storage in a known state, past the seeding path.
 *
 * Seeds are a fine first run and a terrible fixture: they move with the clock
 * and change whenever the seed does. Setting each `-seeded` flag first is what
 * keeps the services from writing their own data over this.
 */
export async function givenStorage(options: {
  notifications?: AppNotification[];
  reservations?: Reservation[];
}) {
  await AsyncStorage.clear();

  await AsyncStorage.setItem('mesa.notifications-seeded', JSON.stringify(true));
  await AsyncStorage.setItem(
    storageKeys.notifications,
    JSON.stringify(options.notifications ?? []),
  );

  await AsyncStorage.setItem('mesa.reservations-seeded', JSON.stringify(true));
  await AsyncStorage.setItem(storageKeys.reservations, JSON.stringify(options.reservations ?? []));
}

/** Reads the inbox back off disk, to check what a screen actually persisted. */
export async function storedNotifications(): Promise<AppNotification[]> {
  const raw = await AsyncStorage.getItem(storageKeys.notifications);
  return raw ? (JSON.parse(raw) as AppNotification[]) : [];
}

export function notification(
  id: string,
  overrides: Partial<AppNotification> = {},
): AppNotification {
  return {
    id,
    kind: 'reservation-confirmed',
    title: `Notification ${id}`,
    body: 'Something happened.',
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    readAt: null,
    ...overrides,
  };
}
