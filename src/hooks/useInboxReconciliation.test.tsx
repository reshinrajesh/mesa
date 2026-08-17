import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { AppNotification, Reservation } from '@/types';

import { config } from '@/constants/config';
import { notificationService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { toDateKey } from '@/utils/date';
import { storageKeys } from '@/utils/storage';
import { useInboxReconciliation } from './useInboxReconciliation';

/**
 * The reconciliation loop, as it actually runs.
 *
 * `features/notifications/reconcile.ts` decides *what* is missing and eight
 * domain checks prove it. None of them can see the part that worried me enough
 * to write this file: the hook writes, invalidates the query it just read, and
 * is re-run by that invalidation. What stops it is that the rows it filed make
 * them no longer missing — a convergence argument, not a guard, and the kind of
 * thing that is either right or spins for ever filing duplicates.
 *
 * So this drives the real hook against the real services and the real storage
 * mock, and the assertions are about the loop rather than the policy: does it
 * file, does it stop, does it stay quiet for someone with no account, and does
 * it wake by itself when a table falls due while the app is open.
 */

function boot(kind: 'authenticated' | 'guest') {
  useAuthStore.setState({ kind, user: null, hydrated: true });
}

/** A stable client per test: a new one per render would refetch for ever. */
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

function bookingIn(hours: number): Reservation {
  const at = new Date(Date.now() + hours * 3_600_000);
  return {
    id: 'rsv_test',
    code: 'ABC234',
    restaurantId: 'rst_grano',
    date: toDateKey(at),
    time: `${pad(at.getHours())}:${pad(at.getMinutes())}`,
    partySize: 2,
    seating: 'any',
    occasion: 'none',
    notes: '',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Queued at position 1, so the table is offered `secondsAway` from now.
 *
 * Read from the app's own queue timing rather than a copy of it: if the queue
 * is ever made to move at a different rate, this fixture follows instead of
 * silently becoming an entry that is already lapsed.
 */
function queuedTableIn(secondsAway: number): Reservation {
  const { queueMoveMs } = config.waitlist;
  return {
    ...bookingIn(3),
    id: 'rsv_queue',
    code: undefined,
    status: 'waitlisted',
    waitlist: {
      position: 1,
      joinedAt: new Date(Date.now() - (queueMoveMs - secondsAway * 1000)).toISOString(),
    },
  };
}

async function given(reservations: Reservation[]) {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('mesa.reservations-seeded', JSON.stringify(true));
  await AsyncStorage.setItem(storageKeys.reservations, JSON.stringify(reservations));
  await AsyncStorage.setItem('mesa.notifications-seeded', JSON.stringify(true));
  await AsyncStorage.setItem(storageKeys.notifications, JSON.stringify([]));
}

async function inbox(): Promise<AppNotification[]> {
  const raw = await AsyncStorage.getItem(storageKeys.notifications);
  return raw ? (JSON.parse(raw) as AppNotification[]) : [];
}

/** Long enough for several query round trips at the mock's 180–520ms latency. */
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 1_600))));

describe('useInboxReconciliation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('files the row a booking has become due for', async () => {
    await given([bookingIn(2)]);
    boot('authenticated');

    await renderHook(() => useInboxReconciliation(true), { wrapper: makeWrapper() });

    await waitFor(async () => {
      expect((await inbox()).map((n) => n.kind)).toEqual(['reservation-reminder']);
    });
  });

  it('stops, rather than filing the same row on every pass', async () => {
    // The convergence claim, which is the reason this file exists: filing
    // invalidates the notifications query, the hook re-runs on the new data,
    // and the only thing that ends it is the row it just filed.
    await given([bookingIn(2)]);
    boot('authenticated');
    const record = jest.spyOn(notificationService, 'record');

    const { rerender } = await renderHook(() => useInboxReconciliation(true), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(record).toHaveBeenCalledTimes(1));
    await rerender(undefined);
    await settle();

    expect(record).toHaveBeenCalledTimes(1);
    expect(await inbox()).toHaveLength(1);
  });

  it('files nothing for someone browsing without an account', async () => {
    await given([bookingIn(2)]);
    boot('guest');
    const record = jest.spyOn(notificationService, 'record');

    await renderHook(() => useInboxReconciliation(true), { wrapper: makeWrapper() });
    await settle();

    expect(record).not.toHaveBeenCalled();

    // The control for that negative: the same fixture, signed in, does file —
    // so the silence above is the session and not a broken fixture. Wrapped in
    // `act` because a hook is already mounted and watching this store.
    await act(async () => boot('authenticated'));
    await renderHook(() => useInboxReconciliation(true), { wrapper: makeWrapper() });
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1));
  });

  it('waits for boot before touching anything', async () => {
    await given([bookingIn(2)]);
    boot('authenticated');
    const record = jest.spyOn(notificationService, 'record');

    await renderHook(() => useInboxReconciliation(false), { wrapper: makeWrapper() });
    await settle();

    expect(record).not.toHaveBeenCalled();
  });

  it('wakes on its own when a table falls due with the app open', async () => {
    // Nothing to file at first render: the queue has a second to run. The hook
    // sets one timer for that exact moment rather than polling, and this is the
    // only test that can tell whether the timer actually fires.
    await given([queuedTableIn(1)]);
    boot('authenticated');

    await renderHook(() => useInboxReconciliation(true), { wrapper: makeWrapper() });
    expect(await inbox()).toHaveLength(0);

    await waitFor(
      async () => {
        expect((await inbox()).map((n) => n.kind)).toEqual(['waitlist-offer']);
      },
      { timeout: 10_000 },
    );
  }, 20_000);
});
