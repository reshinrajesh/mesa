import type { AppNotification, NotificationKind, Reservation } from '@/types';

import { formatTime } from '@/utils/date';
import { formatPartySize } from '@/utils/format';

/**
 * What the inbox is allowed to say, and about what.
 *
 * The audit that produced this file is the same one the README already
 * describes for reservation statuses: eight `NotificationKind`s ship with an
 * icon and copy, and only two of them could be produced by anything the app
 * does. `waitlist-offer` — a table being held for twenty minutes, the single
 * most time-critical thing in Mesa — could not be produced at all, not even by
 * the seed. Written, not built.
 *
 * The copy lives here rather than inside the mutation hooks for the reason the
 * rest of `features/` exists: a hook is unreachable from `npm run test:domain`,
 * so a row nothing could file was invisible to every check in the suite. As
 * plain functions of a reservation, the whole set can be enumerated, called and
 * asserted on without a renderer — including the rule that a queued entry never
 * prints a booking code, because there is no table yet.
 */

/** An entry before the service mints its id, timestamp and unread state. */
export type NewNotification = Omit<AppNotification, 'id' | 'createdAt' | 'readAt'>;

function about(reservation: Reservation): Pick<
  NewNotification,
  'href' | 'restaurantId' | 'reservationId'
> {
  return {
    href: `/reservation/${reservation.id}`,
    restaurantId: reservation.restaurantId,
    reservationId: reservation.id,
  };
}

/** The sitting, as it reads in a one-line body: "7:30 PM for two". */
function sitting(reservation: Reservation): string {
  return `${formatTime(reservation.time)} for ${formatPartySize(reservation.partySize)}`;
}

export function bookingConfirmed(reservation: Reservation, restaurantName: string): NewNotification {
  return {
    kind: 'reservation-confirmed',
    title: `${restaurantName} is holding your table`,
    // The code is what gets you in, so it goes in the body where the inbox
    // shows it without opening anything. A waitlist entry has none.
    body: reservation.code
      ? `${sitting(reservation)}. Your code is ${reservation.code}.`
      : `${sitting(reservation)}.`,
    ...about(reservation),
  };
}

export function bookingModified(reservation: Reservation, restaurantName: string): NewNotification {
  return {
    kind: 'reservation-modified',
    title: `Your table at ${restaurantName} moved`,
    // States the new sitting rather than "your booking was updated", because
    // the whole value of this row is being able to check it was the change you
    // meant without opening the booking.
    body: `Now ${sitting(reservation)}. The restaurant has been told.`,
    ...about(reservation),
  };
}

export function bookingCancelled(reservation: Reservation, restaurantName: string): NewNotification {
  const left = reservation.status === 'waitlisted' || !reservation.code;
  return {
    kind: 'reservation-cancelled',
    title: left ? `Left the list at ${restaurantName}` : `Cancelled at ${restaurantName}`,
    body: left
      ? `${sitting(reservation)}. Your place has gone to the next party.`
      : `${sitting(reservation)}. Nothing was charged.`,
    ...about(reservation),
  };
}

export function waitlistJoined(reservation: Reservation, restaurantName: string): NewNotification {
  return {
    kind: 'waitlist-joined',
    title: `On the list at ${restaurantName}`,
    body: `${sitting(reservation)}. We will tell you the moment a table frees.`,
    ...about(reservation),
  };
}

export function waitlistOffered(reservation: Reservation, restaurantName: string): NewNotification {
  return {
    kind: 'waitlist-offer',
    title: `A table at ${restaurantName}`,
    // No code and no "confirmed": the table is held, not booked, and this row
    // outlives the hold. Someone reading it an hour later must not come away
    // thinking they have a booking.
    body: `${sitting(reservation)} just came free. Open it to take the table before the hold runs out.`,
    ...about(reservation),
  };
}

export function tableUpcoming(reservation: Reservation, restaurantName: string): NewNotification {
  return {
    kind: 'upcoming-reservation',
    title: `${restaurantName} tomorrow`,
    body: `${sitting(reservation)}.${reservation.code ? ` Code ${reservation.code}.` : ''}`,
    ...about(reservation),
  };
}

/**
 * The one the seed had been describing all along.
 *
 * `ntf_4` shipped as a `reservation-reminder` reading "How was Blue Fig? A
 * rating helps the next person decide" — a rating request wearing an alarm
 * clock, because there was no kind for what it actually was. There is now, and
 * `reconcile` files it four hours after an evening, which is the first thing in
 * the app that ever asks. The rating flow existed and nothing led to it.
 */
export function ratingRequest(reservation: Reservation, restaurantName: string): NewNotification {
  return {
    kind: 'rating-request',
    title: `How was ${restaurantName}?`,
    body: 'A rating helps the next person decide.',
    ...about(reservation),
  };
}

export function sittingReminder(reservation: Reservation, restaurantName: string): NewNotification {
  return {
    kind: 'reservation-reminder',
    title: `${restaurantName} at ${formatTime(reservation.time)}`,
    body: reservation.code
      ? `Table for ${formatPartySize(reservation.partySize)}. Your code is ${reservation.code}.`
      : `Table for ${formatPartySize(reservation.partySize)}.`,
    ...about(reservation),
  };
}

/**
 * Every event the app itself can file.
 *
 * A map rather than a hand-written list of kinds, so a check can call each one
 * and read the kind off the result. A list would be a second place to update
 * and therefore a place to be wrong.
 */
export const notificationEvents = {
  bookingConfirmed,
  bookingModified,
  bookingCancelled,
  waitlistJoined,
  waitlistOffered,
  tableUpcoming,
  ratingRequest,
  sittingReminder,
} as const;

/** Kinds no client can produce: only a restaurant, through a server, can. */
export const SERVER_ONLY_KINDS: NotificationKind[] = ['restaurant-offer'];
