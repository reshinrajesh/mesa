import type { AppNotification, NotificationPreferences, Reservation } from '@/types';

import { waitlistStatus } from '@/features/reservations/waitlist';
import { combine } from '@/utils/date';
import { sittingReminder, tableUpcoming, ratingRequest, waitlistOffered } from './events';
import type { NewNotification } from './events';

/**
 * The entries that ought to exist by now, and do not.
 *
 * Four of the eight inbox kinds are about a moment passing rather than about
 * something the guest did: a table coming free, a sitting drawing near, an
 * evening finishing. Nothing files those, because nothing is running when they
 * happen — the phone is in a pocket and the app is not open.
 *
 * The answer is the one the waitlist already uses: derive, do not tick. Given
 * the bookings, the inbox as it stands and the clock, this returns what is
 * missing. Backgrounding the app cannot make it miss an event, two screens
 * cannot disagree about whether one happened, and a check can walk a booking
 * from "tomorrow" through "in three hours" to "how was it?" in a few lines
 * without a renderer, a timer or a real calendar.
 *
 * Everything here is idempotent by construction: an entry is missing only if
 * the inbox holds nothing of that kind about that reservation, so calling it
 * twice files nothing twice.
 */

/** How far ahead the day-before nudge looks. */
export const UPCOMING_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * How long after an evening a rating is still worth asking for.
 *
 * Bounded because the seed ships four old bookings and a fresh install would
 * otherwise open on a stack of requests to rate dinners from months ago —
 * which is also the honest general case: nobody remembers the wine by then.
 */
export const RATING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function has(existing: AppNotification[], reservationId: string, kind: string): boolean {
  return existing.some((n) => n.reservationId === reservationId && n.kind === kind);
}

function nameFor(reservation: Reservation, names: Map<string, string>): string | null {
  return names.get(reservation.restaurantId) ?? null;
}

export function missingEntries(
  reservations: Reservation[],
  existing: AppNotification[],
  restaurantNames: Map<string, string>,
  preferences: NotificationPreferences,
  now: Date = new Date(),
): NewNotification[] {
  const entries: NewNotification[] = [];
  const leadMs = preferences.reminderLeadHours * 3_600_000;

  for (const reservation of reservations) {
    const name = nameFor(reservation, restaurantNames);
    if (!name) continue;

    const sitting = combine(reservation.date, reservation.time).getTime();
    const untilSitting = sitting - now.getTime();

    if (reservation.status === 'waitlisted') {
      // Gated on `reservationUpdates` rather than `reminders`, for the same
      // reason the scheduled alert is: this is not a nudge about something
      // already arranged, it is the only notice that a table is being held.
      if (!preferences.reservationUpdates) continue;
      if (has(existing, reservation.id, 'waitlist-offer')) continue;
      if (waitlistStatus(reservation, now.getTime())?.state !== 'offered') continue;
      entries.push(waitlistOffered(reservation, name));
      continue;
    }

    if (reservation.status === 'confirmed' || reservation.status === 'pending') {
      if (!preferences.reminders) continue;
      if (untilSitting <= 0) continue;

      // The two nudges do not overlap: once the sitting is inside the reminder
      // lead, "you have a table tomorrow" is no longer a true sentence, so the
      // day-before window closes where the reminder's begins.
      if (
        untilSitting <= UPCOMING_WINDOW_MS &&
        untilSitting > leadMs &&
        !has(existing, reservation.id, 'upcoming-reservation')
      ) {
        entries.push(tableUpcoming(reservation, name));
      }

      if (untilSitting <= leadMs && !has(existing, reservation.id, 'reservation-reminder')) {
        entries.push(sittingReminder(reservation, name));
      }
      continue;
    }

    if (reservation.status === 'completed' && !reservation.reviewId) {
      const since = now.getTime() - sitting;
      if (since < 0 || since > RATING_WINDOW_MS) continue;
      if (has(existing, reservation.id, 'rating-request')) continue;
      entries.push(ratingRequest(reservation, name));
    }
  }

  return entries;
}

/**
 * When `missingEntries` would next have something to say, in epoch ms.
 *
 * So a screen can set one timer for that exact moment instead of polling. The
 * seeded waitlist entry reaches the head of its queue about a minute after
 * first launch, and a five-second poll would be a wasteful way to notice
 * something whose arrival time is already known to the millisecond.
 */
export function nextDueAt(
  reservations: Reservation[],
  preferences: NotificationPreferences,
  now: Date = new Date(),
): number | null {
  const leadMs = preferences.reminderLeadHours * 3_600_000;
  const moments: number[] = [];

  for (const reservation of reservations) {
    if (reservation.status === 'waitlisted') {
      const status = waitlistStatus(reservation, now.getTime());
      if (status) moments.push(status.offerAt);
      continue;
    }
    if (reservation.status === 'confirmed' || reservation.status === 'pending') {
      const sitting = combine(reservation.date, reservation.time).getTime();
      moments.push(sitting - UPCOMING_WINDOW_MS, sitting - leadMs);
    }
  }

  const future = moments.filter((at) => at > now.getTime()).sort((a, b) => a - b);
  return future[0] ?? null;
}
