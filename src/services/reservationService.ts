import type { Reservation } from '@/types';
import type { ReservationService } from './contracts';

import { generateAvailability } from '@/mock/availability';
import { restaurantById } from '@/mock/restaurants';
import { seedReservations } from '@/mock/seed';
import {
  assertBookable,
  assertCancellable,
  assertJoinable,
  assertModifiable,
  assertOfferAcceptable,
  requireRestaurant,
} from '@/features/reservations/rules';
import { formatTime } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { localId, reservationCode } from '@/utils/id';
import { storage, storageKeys } from '@/utils/storage';
import { paginate, simulate } from './latency';

/**
 * Reservations, persisted locally.
 *
 * What this file does is storage: read the list, apply a write, put it back,
 * mint ids and codes. What it deliberately does *not* do is decide whether a
 * write is allowed — every such rule lives in `features/reservations/rules.ts`,
 * where it can be executed without a storage mock or a real clock. The mock
 * enforces the same rules the server will, because a UI that only ever sees the
 * happy path ships without the screens for the unhappy one.
 *
 * Waitlist entries are reservations with `status: 'waitlisted'` rather than a
 * parallel record type. They occupy the same list, the same detail screen and
 * the same cancel path, and the day one becomes a table it is already the row
 * the user has been watching.
 */

const SEEDED_FLAG = 'mesa.reservations-seeded';

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

/**
 * The availability the rules judge against. The mock derives it; an HTTP
 * implementation would ask the server for the same shape.
 */
function boardFor(restaurantId: string, request: { date: string; partySize: number }) {
  const restaurant = requireRestaurant(restaurantById.get(restaurantId), restaurantId);
  return { restaurant, day: generateAvailability(restaurant, request.date, request.partySize) };
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
      assertBookable({ ...boardFor(input.restaurantId, input), request: input, now: Date.now() });

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
      assertModifiable(existing, Date.now());

      const next: Reservation = {
        ...existing,
        ...input,
        notes: (input.notes ?? existing.notes).trim(),
        updatedAt: new Date().toISOString(),
      };

      // Re-check availability whenever the sitting itself moved.
      if (next.date !== existing.date || next.time !== existing.time || next.partySize !== existing.partySize) {
        assertBookable({
          ...boardFor(next.restaurantId, next),
          request: next,
          now: Date.now(),
        });
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
      assertCancellable(existing, Date.now());

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
      const all = await readAll();
      const queue = assertJoinable({
        ...boardFor(input.restaurantId, input),
        request: input,
        existing: all,
        now: Date.now(),
      });

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
        waitlist: { position: Math.max(1, queue.queueLength), joinedAt: now },
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
      assertOfferAcceptable(existing, Date.now());

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
