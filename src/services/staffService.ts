import type { Order, Reservation, ServiceState, StaffBoard, StaffTable } from '@/types';

import { canMoveService, serviceRefusal } from '@/features/staff/service';
import { restaurantById } from '@/mock/restaurants';
import { todayKey } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { storage, storageKeys } from '@/utils/storage';
import type { StaffService } from './contracts';
import { delay, simulate } from './latency';
import { orderService } from './orderService';
import { paymentService } from './paymentService';
import { reservationService } from './reservationService';

/**
 * The floor, mocked from this device's own records.
 *
 * A real board is every table in the room. This one is every table this phone
 * has booked or walked into, because that is all a client with no server can
 * know — and it is worth being plain about which half is the demo: the rows,
 * the states, the refusals and the actions are the real ones, and only the
 * population is one person's evening.
 *
 * Service state is kept in its own store rather than on the reservation, for
 * the same reason the server keeps it in its own field: the six booking
 * statuses are what the guest's screens switch on, and the floor's vocabulary
 * must not be able to disturb them.
 */

const STATES_KEY = storageKeys.serviceStates;

async function readStates(): Promise<Record<string, ServiceState>> {
  return storage.get<Record<string, ServiceState>>(STATES_KEY, {});
}

export const staffService: StaffService = {
  async getBoard(): Promise<StaffBoard> {
    return simulate(async () => {
      const today = todayKey();
      const { items } = await reservationService.getReservations();
      const states = await readStates();

      const tonight = items
        .filter((booking) => booking.date === today && booking.status !== 'cancelled')
        .sort((a, b) => a.time.localeCompare(b.time));

      const tables: StaffTable[] = [];
      for (const booking of tonight) {
        const rounds = await orderService.getOrders(booking.id);
        const bill = await paymentService.getBill(booking.id);

        tables.push({
          id: booking.id,
          restaurantId: booking.restaurantId,
          // A floor board names the party; this one has only the venue, since
          // every booking on this device belongs to the person holding it.
          guestName: restaurantById.get(booking.restaurantId)?.name ?? 'Table',
          time: booking.time,
          partySize: booking.partySize,
          status: booking.status,
          serviceState: states[booking.id] ?? 'booked',
          walkIn: booking.walkIn,
          roundsWaiting: rounds.filter((round) => round.status === 'placed').length,
          roundsSent: rounds.filter((round) => round.status !== 'cancelled').length,
          nextRoundId: rounds.find((round) => round.status === 'placed')?.id ?? null,
          bill: bill ? { id: bill.id, status: bill.status, total: bill.total } : null,
        });
      }

      return {
        date: today,
        venues: [...new Set(tonight.map((booking) => booking.restaurantId))],
        tables,
      };
    });
  },

  async setServiceState(reservationId, state): Promise<Reservation> {
    await delay();
    const states = await readStates();
    const current = states[reservationId] ?? 'booked';

    const refusal = serviceRefusal(current, state);
    if (!canMoveService(current, state)) {
      throw new AppError('validation', { message: refusal ?? 'That is not a move this table can make.' });
    }

    await storage.set(STATES_KEY, { ...states, [reservationId]: state });
    return reservationService.getReservationById(reservationId);
  },

  async advanceRound(orderId, state): Promise<Order> {
    await delay();
    // The mock's rounds already move on a clock, which is a stand-in for
    // exactly this decision. Writing the state makes the stand-in stop
    // guessing, the same way the server's does.
    const orders = await storage.get<Order[]>(storageKeys.orders, []);
    const order = orders.find((candidate) => candidate.id === orderId);
    if (!order) throw new AppError('not-found');
    if (order.status === 'cancelled') {
      throw new AppError('validation', { message: 'This round was withdrawn by the table.' });
    }

    order.status = state;
    await storage.set(storageKeys.orders, orders);
    return order;
  },
};
