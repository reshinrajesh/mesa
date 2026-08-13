import type { Reservation } from '@/types';
import type { ReservationService } from './contracts';

import { generateAvailability } from '@/mock/availability';
import { restaurantById } from '@/mock/restaurants';
import { seedReservations } from '@/mock/seed';
import { waitlistStatus } from '@/features/reservations/waitlist';
import { combine, formatTime, todayKey } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { localId, reservationCode } from '@/utils/id';
import { storage, storageKeys } from '@/utils/storage';
import { paginate, simulate } from './latency';

/**
 * Reservations, persisted locally.
 *
 * The mock enforces the same rules the server will, because a UI that only ever
 * sees the happy path ships without the screens for the unhappy one:
 *   - a slot that reads unavailable cannot be booked
 *   - a booking cannot be made in the past
 *   - changes and cancellations close two hours before the sitting
 *   - a queue can only be joined for a slot that is genuinely full, and only
 *     one place per sitting
 *
 * Waitlist entries are reservations with `status: 'waitlisted'` rather than a
 * parallel record type. They occupy the same list, the same detail screen and
 * the same cancel path, and the day one becomes a table it is already the row
 * the user has been watching.
 */

const SEEDED_FLAG = 'mesa.reservations-seeded';

/** How close to the sitting the booking freezes. */
const LOCK_WINDOW_MS = 2 * 60 * 60 * 1000;

async function readAll(): Promise<Reservation[]> {
  const seeded = await storage.get<boolean>(SEEDED_FLAG, false);
  if (!seeded) {
    const seed = seedReservations();
    await storage.set(storageKeys.reservations, seed);
    await storage.set(SEEDED_FLAG, true);
    return seed;
  }
  return storage.get<Reservation[]>(storageKeys.reservations, []);
}

async function writeAll(reservations: Reservation[]): Promise<void> {
  await storage.set(storageKeys.reservations, reservations);
}

/** Newest sitting first for upcoming, most recent first for past. */
function byDateDescending(a: Reservation, b: Reservation): number {
  return `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`);
}

function assertBookable(restaurantId: string, date: string, time: string, partySize: number) {
  const restaurant = restaurantById.get(restaurantId);
  if (!restaurant) {
    throw new AppError('restaurant-unavailable', { debugMessage: `unknown restaurant ${restaurantId}` });
  }
  if (date < todayKey()) {
    throw new AppError('validation', {
      fields: { date: 'Pick a date from today onwards.' },
    });
  }

  const day = generateAvailability(restaurant, date, partySize);
  if (day.closedReason) {
    throw new AppError('no-availability', { message: day.closedReason });
  }

  const slot = day.slots.find((s) => s.time === time);
  if (!slot) throw new AppError('slot-taken', { debugMessage: `slot ${time} not offered` });
  if (slot.availability === 'unavailable') throw new AppError('slot-taken');
}

/**
 * The mirror of `assertBookable`: a queue exists only where a table does not.
 * Returns the depth of that queue, which becomes the joiner's position.
 */
function assertWaitlistable(
  restaurantId: string,
  date: string,
  time: string,
  partySize: number,
): number {
  const restaurant = restaurantById.get(restaurantId);
  if (!restaurant) {
    throw new AppError('restaurant-unavailable', { debugMessage: `unknown restaurant ${restaurantId}` });
  }
  if (!restaurant.acceptsWaitlist) {
    throw new AppError('waitlist-closed', {
      message: `${restaurant.name} does not keep a waitlist. Tables here go to whoever books first.`,
    });
  }
  if (date < todayKey()) {
    throw new AppError('validation', { fields: { date: 'Pick a date from today onwards.' } });
  }

  const day = generateAvailability(restaurant, date, partySize);
  if (day.closedReason) throw new AppError('no-availability', { message: day.closedReason });

  const slot = day.slots.find((s) => s.time === time);
  if (!slot) throw new AppError('waitlist-closed', { debugMessage: `slot ${time} not offered` });
  // A slot with a table left is not a queue — send the guest to book it.
  if (slot.availability !== 'unavailable') {
    throw new AppError('waitlist-closed', {
      message: `${formatTime(time)} has a table free. You can book it outright rather than queue for it.`,
    });
  }
  if (!slot.waitlist) throw new AppError('waitlist-closed');

  return slot.waitlist.queueLength;
}

function assertModifiable(reservation: Reservation) {
  // A place in a queue has no time or party size to move: the queue is for one
  // specific sitting. Changing your mind means leaving and joining another.
  if (reservation.status === 'waitlisted') {
    throw new AppError('reservation-locked', {
      message: 'A waitlist entry cannot be edited. Leave the list and join the one for the sitting you want.',
    });
  }
  if (reservation.status === 'cancelled') {
    throw new AppError('reservation-locked', {
      message: 'This booking was already cancelled.',
    });
  }
  if (reservation.status === 'completed' || reservation.status === 'no-show') {
    throw new AppError('reservation-locked', {
      message: 'This booking is in the past and can no longer be changed.',
    });
  }
  const sitting = combine(reservation.date, reservation.time).getTime();
  if (sitting - Date.now() < LOCK_WINDOW_MS) {
    throw new AppError('reservation-locked');
  }
}

export const reservationService: ReservationService = {
  async getReservations() {
    return simulate(async () => {
      const all = (await readAll()).sort(byDateDescending);
      return paginate(all, null, 100);
    });
  },

  async getReservationById(id) {
    return simulate(async () => {
      const found = (await readAll()).find((r) => r.id === id);
      if (!found) throw new AppError('not-found', { debugMessage: `no reservation ${id}` });
      return found;
    });
  },

  async createReservation(input) {
    return simulate(async () => {
      assertBookable(input.restaurantId, input.date, input.time, input.partySize);

      const now = new Date().toISOString();
      const reservation: Reservation = {
        id: localId('rsv'),
        code: reservationCode(),
        restaurantId: input.restaurantId,
        date: input.date,
        time: input.time,
        partySize: input.partySize,
        seating: input.seating,
        occasion: input.occasion,
        notes: input.notes.trim(),
        // Larger parties and private rooms go to the venue rather than
        // auto-confirming, which is what real booking systems do.
        status: input.partySize >= 7 || input.seating === 'private' ? 'pending' : 'confirmed',
        createdAt: now,
        updatedAt: now,
      };

      const all = await readAll();
      await writeAll([reservation, ...all]);
      return reservation;
    }, 700);
  },

  async updateReservation(input) {
    return simulate(async () => {
      const all = await readAll();
      const existing = all.find((r) => r.id === input.id);
      if (!existing) throw new AppError('not-found', { debugMessage: `no reservation ${input.id}` });
      assertModifiable(existing);

      const next: Reservation = {
        ...existing,
        ...input,
        notes: (input.notes ?? existing.notes).trim(),
        updatedAt: new Date().toISOString(),
      };

      // Re-check availability whenever the sitting itself moved.
      if (next.date !== existing.date || next.time !== existing.time || next.partySize !== existing.partySize) {
        assertBookable(next.restaurantId, next.date, next.time, next.partySize);
      }

      await writeAll(all.map((r) => (r.id === next.id ? next : r)));
      return next;
    }, 600);
  },

  async cancelReservation(id, reason) {
    return simulate(async () => {
      const all = await readAll();
      const existing = all.find((r) => r.id === id);
      if (!existing) throw new AppError('not-found', { debugMessage: `no reservation ${id}` });
      if (existing.status === 'cancelled') return existing;
      // Leaving a queue is always allowed. There is no table to release late
      // and no kitchen to inconvenience, so the two-hour lock does not apply.
      if (existing.status !== 'waitlisted') assertModifiable(existing);

      const next: Reservation = {
        ...existing,
        status: 'cancelled',
        venueMessage: reason?.trim() ? `Reason given: ${reason.trim()}` : existing.venueMessage,
        updatedAt: new Date().toISOString(),
      };
      await writeAll(all.map((r) => (r.id === id ? next : r)));
      return next;
    }, 500);
  },

  async joinWaitlist(input) {
    return simulate(async () => {
      const queueLength = assertWaitlistable(
        input.restaurantId,
        input.date,
        input.time,
        input.partySize,
      );

      const all = await readAll();
      // One place per sitting. Two entries would queue the same guest against
      // themselves and double every notification they get.
      const duplicate = all.find(
        (r) =>
          r.status === 'waitlisted' &&
          r.restaurantId === input.restaurantId &&
          r.date === input.date &&
          r.time === input.time,
      );
      if (duplicate) {
        throw new AppError('waitlist-duplicate', { debugMessage: `already queued as ${duplicate.id}` });
      }

      const now = new Date().toISOString();
      const entry: Reservation = {
        id: localId('wlt'),
        // No code: there is no table to present one for. One is minted the
        // moment the entry becomes a booking.
        restaurantId: input.restaurantId,
        date: input.date,
        time: input.time,
        partySize: input.partySize,
        seating: input.seating,
        occasion: input.occasion,
        notes: input.notes.trim(),
        status: 'waitlisted',
        createdAt: now,
        updatedAt: now,
        waitlist: { position: Math.max(1, queueLength), joinedAt: now },
      };

      await writeAll([entry, ...all]);
      return entry;
    }, 600);
  },

  async acceptWaitlistOffer(id) {
    return simulate(async () => {
      const all = await readAll();
      const existing = all.find((r) => r.id === id);
      if (!existing) throw new AppError('not-found', { debugMessage: `no reservation ${id}` });
      if (existing.status !== 'waitlisted') {
        throw new AppError('waitlist-offer-expired', {
          message: 'This entry is no longer on the waitlist.',
          debugMessage: `status ${existing.status}`,
        });
      }

      // The same pure function the screen used to draw the countdown decides
      // whether the hold is still live, so the button and the server can never
      // disagree about what the user was looking at.
      const status = waitlistStatus(existing);
      if (status?.state === 'queued') {
        throw new AppError('waitlist-offer-expired', {
          message: 'No table is being held yet. We will tell you the moment one is.',
        });
      }
      if (status?.state !== 'offered') throw new AppError('waitlist-offer-expired');

      const next: Reservation = {
        ...existing,
        code: reservationCode(),
        status: 'confirmed',
        waitlist: undefined,
        venueMessage: `A table came free at ${formatTime(existing.time)} and is yours.`,
        updatedAt: new Date().toISOString(),
      };

      await writeAll(all.map((r) => (r.id === id ? next : r)));
      return next;
    }, 600);
  },
};
