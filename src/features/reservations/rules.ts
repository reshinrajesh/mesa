import type { AvailabilityDay, Reservation, Restaurant, SlotWaitlist } from '@/types';
import type { WaitlistStatus } from './waitlist';

import { waitlistStatus } from './waitlist';
import { combine, formatTime, toDateKey } from '@/utils/date';
import { AppError } from '@/utils/errors';

/**
 * The rules a booking has to satisfy.
 *
 * These live here rather than inside `reservationService` for two reasons.
 *
 * The first is the rule the whole layout enforces one level up: `app/` holds no
 * business logic, and a service that decides *whether a booking is allowed* is
 * doing business logic too. What is left in the service is what a service is
 * for — reading storage, writing storage, minting ids.
 *
 * The second is that these are the only enforcement the app has, and they were
 * the only part of it that could not be executed without a renderer, a storage
 * mock or a real clock. Every function here takes `now` as an argument and
 * reads nothing ambient, so `npm run test:domain` can walk a booking up to the
 * two-hour lock, across it, and out the other side in three lines.
 *
 * Availability arrives as an argument rather than being fetched: a rule about
 * whether a slot is free should not also decide where the truth about free
 * slots comes from. The mock passes its generator's answer; an HTTP
 * implementation would pass the server's.
 *
 * They throw rather than return a verdict because every caller does the same
 * thing with a failure — abandon the write and let `AppError` carry written
 * copy to the user. A `Result` type here would be four lines of unwrapping at
 * every call site to reach the same `throw`.
 */

/** How close to the sitting bookings freeze, for changes and cancellations alike. */
export const LOCK_WINDOW_MS = 2 * 60 * 60 * 1000;

/** The part of a booking the rules actually judge. */
export interface SittingRequest {
  date: string;
  time: string;
  partySize: number;
}

/**
 * Narrows away the "restaurant that does not exist" case once, so no rule below
 * has to carry an `undefined` branch.
 */
export function requireRestaurant(
  restaurant: Restaurant | undefined,
  restaurantId: string,
): Restaurant {
  if (!restaurant) {
    throw new AppError('restaurant-unavailable', {
      debugMessage: `unknown restaurant ${restaurantId}`,
    });
  }
  return restaurant;
}

function assertNotInThePast(date: string, now: number): void {
  if (date < toDateKey(new Date(now))) {
    throw new AppError('validation', { fields: { date: 'Pick a date from today onwards.' } });
  }
}

function findSlot(day: AvailabilityDay, time: string) {
  if (day.closedReason) throw new AppError('no-availability', { message: day.closedReason });
  return day.slots.find((slot) => slot.time === time);
}

/**
 * Can this sitting be booked outright?
 *
 * The mock enforces this so the UI is built against refusal as well as success:
 * a screen that has only ever seen the happy path ships without the state for
 * the other one.
 */
export function assertBookable(input: {
  restaurant: Restaurant;
  day: AvailabilityDay;
  request: SittingRequest;
  now: number;
}): void {
  const { day, request, now } = input;

  assertNotInThePast(request.date, now);

  const slot = findSlot(day, request.time);
  if (!slot) {
    throw new AppError('slot-taken', { debugMessage: `slot ${request.time} not offered` });
  }
  if (slot.availability === 'unavailable') throw new AppError('slot-taken');
}

/**
 * The mirror of `assertBookable`: a queue exists only where a table does not.
 * Returns the depth of that queue, which becomes the joiner's position.
 */
export function assertJoinable(input: {
  restaurant: Restaurant;
  day: AvailabilityDay;
  request: SittingRequest;
  /** Every reservation already held, to catch a second place in the same queue. */
  existing: Reservation[];
  now: number;
}): SlotWaitlist {
  const { restaurant, day, request, existing, now } = input;

  if (!restaurant.acceptsWaitlist) {
    throw new AppError('waitlist-closed', {
      message: `${restaurant.name} does not keep a waitlist. Tables here go to whoever books first.`,
    });
  }

  assertNotInThePast(request.date, now);

  const slot = findSlot(day, request.time);
  if (!slot) {
    throw new AppError('waitlist-closed', { debugMessage: `slot ${request.time} not offered` });
  }
  // A slot with a table left is not a queue — send the guest to book it.
  if (slot.availability !== 'unavailable') {
    throw new AppError('waitlist-closed', {
      message: `${formatTime(request.time)} has a table free. You can book it outright rather than queue for it.`,
    });
  }
  if (!slot.waitlist) throw new AppError('waitlist-closed');

  // One place per sitting. Two entries would queue the guest against themselves
  // and double every notification they get.
  const duplicate = existing.find(
    (r) =>
      r.status === 'waitlisted' &&
      r.restaurantId === restaurant.id &&
      r.date === request.date &&
      r.time === request.time,
  );
  if (duplicate) {
    throw new AppError('waitlist-duplicate', { debugMessage: `already queued as ${duplicate.id}` });
  }

  return slot.waitlist;
}

/** Can the details of this booking still be changed? */
export function assertModifiable(reservation: Reservation, now: number): void {
  // A table somebody is sitting at has nothing to move. The date is today, the
  // time is when they sat down, and the party is the people in the chairs —
  // all three are facts rather than choices, and offering to edit them would
  // be the app pretending it can rearrange a room it cannot see.
  if (reservation.walkIn) {
    throw new AppError('reservation-locked', {
      message: 'You are at the table. Ask the floor if something needs to change.',
    });
  }
  // A place in a queue has no time or party size to move: the queue is for one
  // specific sitting. Changing your mind means leaving and joining another.
  if (reservation.status === 'waitlisted') {
    throw new AppError('reservation-locked', {
      message:
        'A waitlist entry cannot be edited. Leave the list and join the one for the sitting you want.',
    });
  }
  if (reservation.status === 'cancelled') {
    throw new AppError('reservation-locked', { message: 'This booking was already cancelled.' });
  }
  if (reservation.status === 'completed' || reservation.status === 'no-show') {
    throw new AppError('reservation-locked', {
      message: 'This booking is in the past and can no longer be changed.',
    });
  }

  const sitting = combine(reservation.date, reservation.time).getTime();
  if (sitting - now < LOCK_WINDOW_MS) throw new AppError('reservation-locked');
}

/**
 * Can this be given up?
 *
 * Leaving a queue is always allowed, at any hour: there is no table to release
 * late and no kitchen to inconvenience, so the lock that protects a real
 * booking would only be punishing someone for waiting.
 */
export function assertCancellable(reservation: Reservation, now: number): void {
  if (reservation.status === 'waitlisted') return;
  assertModifiable(reservation, now);
}

/**
 * Is a table actually being held right now?
 *
 * Decided by the same function the screen used to draw the countdown, so the
 * button and the write can never disagree about what the user was looking at.
 */
export function assertOfferAcceptable(reservation: Reservation, now: number): WaitlistStatus {
  if (reservation.status !== 'waitlisted') {
    throw new AppError('waitlist-offer-expired', {
      message: 'This entry is no longer on the waitlist.',
      debugMessage: `status ${reservation.status}`,
    });
  }

  const status = waitlistStatus(reservation, now);
  if (status?.state === 'queued') {
    throw new AppError('waitlist-offer-expired', {
      message: 'No table is being held yet. We will tell you the moment one is.',
    });
  }
  if (status?.state !== 'offered') throw new AppError('waitlist-offer-expired');

  return status;
}
