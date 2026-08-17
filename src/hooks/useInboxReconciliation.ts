import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { queryKeys } from '@/constants/queryKeys';
import { missingEntries, nextDueAt } from '@/features/notifications/reconcile';
import { mockRestaurants } from '@/mock/restaurants';
import { notificationService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { useNotificationPreferences, useNotifications } from './useNotifications';
import { useReservations } from './useReservations';

/** Names, not records: the only thing the inbox copy needs from a restaurant. */
const RESTAURANT_NAMES = new Map(mockRestaurants.map((r) => [r.id, r.name]));

/**
 * Files the inbox rows that events, not the guest, are responsible for.
 *
 * A table coming free, a sitting drawing near, an evening ending: none of them
 * happen because someone tapped something, and none of them can file a row at
 * the moment they occur, since the app is usually closed when they do. So
 * nothing files a row at the moment — `features/notifications/reconcile.ts`
 * works out what should already be there and this puts it there, on launch and
 * again at each moment one falls due.
 *
 * The timer is set to the exact instant of the next transition rather than
 * polling for it. `nextDueAt` already knows when that is — the same arithmetic
 * the waitlist screen draws its countdown from — so a poll would be guessing at
 * something the app can calculate. Nothing is scheduled when nothing is due,
 * which for a guest with no bookings is always.
 */
export function useInboxReconciliation(ready: boolean) {
  const client = useQueryClient();
  const kind = useAuthStore((s) => s.kind);
  const reservations = useReservations();
  const inbox = useNotifications();
  const { preferences } = useNotificationPreferences();
  const [tick, setTick] = useState(0);

  const active = ready && kind === 'authenticated' && Boolean(preferences);
  const bookings = reservations.data?.items;

  useEffect(() => {
    if (!active || !preferences || !bookings || inbox.isLoading) return;

    const missing = missingEntries(bookings, inbox.items, RESTAURANT_NAMES, preferences);
    if (missing.length === 0) return;

    let cancelled = false;
    void (async () => {
      for (const entry of missing) {
        if (cancelled) return;
        await notificationService.record(entry);
      }
      // Re-runs this effect with the rows now present, which is what makes it
      // stop: `missingEntries` is defined against the inbox as it stands.
      await client.invalidateQueries({ queryKey: queryKeys.notifications.all });
    })();

    return () => {
      cancelled = true;
    };
  }, [active, preferences, bookings, inbox.items, inbox.isLoading, client, tick]);

  useEffect(() => {
    if (!active || !preferences || !bookings) return;

    const due = nextDueAt(bookings, preferences);
    if (due === null) return;

    const delay = due - Date.now();
    // Hours away is not worth holding a timer for: the app will be relaunched,
    // backgrounded or foregrounded long before then, and each of those already
    // runs the pass above. Anything sooner gets an exact wake-up.
    if (delay > 60 * 60 * 1000) return;

    const timer = setTimeout(() => setTick((t) => t + 1), Math.max(1_000, delay));
    return () => clearTimeout(timer);
  }, [active, preferences, bookings, tick]);
}
