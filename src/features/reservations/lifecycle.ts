import type { Reservation } from '@/types';

import { combine } from '@/utils/date';

/**
 * What happens to a booking after its evening.
 *
 * Nothing used to. A reservation was written as `confirmed` and stayed
 * `confirmed` for ever: the day after your dinner it slid into the Past tab
 * still badged as an upcoming table, it was never counted in the profile's
 * "visited" stat, and — because the Rate action is gated on `completed` — you
 * could never review a restaurant you had actually booked. The whole
 * review-writing flow was reachable only for the two bookings that shipped in
 * the seed, and only until you had rated them both.
 *
 * A real backend settles these server-side when the evening closes out. There
 * is no server here, so the client does it on read, and does it the same way
 * the waitlist derives its state: as a pure function of the records and the
 * clock, applied in one place, rather than a timer that only runs while
 * somebody is looking.
 *
 * `no-show` is deliberately absent. Only the venue knows you did not turn up,
 * and inventing that judgement on the client would put a status on someone's
 * history that nothing in the app could justify.
 */

/**
 * How long after the sitting a booking counts as done.
 *
 * Long enough for a late dinner to finish: settling at the sitting time itself
 * would flip a table you are sitting at into "Completed" while the mains are
 * still coming, and offer to rate an evening that has not happened yet.
 */
export const SETTLE_AFTER_MS = 4 * 3_600_000;

export interface SettleResult {
  reservations: Reservation[];
  /** True when at least one record moved, so the caller writes only when needed. */
  changed: boolean;
}

function settleOne(reservation: Reservation, now: number): Reservation | null {
  const sitting = combine(reservation.date, reservation.time).getTime();

  if (reservation.status === 'confirmed' && now >= sitting + SETTLE_AFTER_MS) {
    return { ...reservation, status: 'completed', updatedAt: new Date(now).toISOString() };
  }

  // A request the venue never answered is not a dinner that happened. It lapses
  // at the sitting rather than settling as completed, because there was never a
  // table to complete.
  if (reservation.status === 'pending' && now >= sitting) {
    return {
      ...reservation,
      status: 'cancelled',
      venueMessage: 'The restaurant did not confirm this request in time.',
      updatedAt: new Date(now).toISOString(),
    };
  }

  // The queue for a sitting ends with the sitting. Leaving the entry open would
  // have the Bookings tab promising a table that can no longer arrive.
  if (reservation.status === 'waitlisted' && now >= sitting) {
    return {
      ...reservation,
      status: 'cancelled',
      waitlist: undefined,
      venueMessage: 'The evening passed without a table coming free.',
      updatedAt: new Date(now).toISOString(),
    };
  }

  return null;
}

/**
 * Settles everything the clock has overtaken. Idempotent: running it twice
 * changes nothing the second time, which is what makes it safe on every read.
 */
export function settleElapsed(reservations: Reservation[], now: number = Date.now()): SettleResult {
  let changed = false;

  const next = reservations.map((reservation) => {
    const settled = settleOne(reservation, now);
    if (!settled) return reservation;
    changed = true;
    return settled;
  });

  return { reservations: changed ? next : reservations, changed };
}
