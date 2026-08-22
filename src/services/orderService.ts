import type { CartLine, Order, OrderLine } from '@/types';

import { itemsById, toPaise } from '@/features/orders/cart';
import { genericMenu, menuByRestaurantId } from '@/mock/menus';
import { restaurantById } from '@/mock/restaurants';
import { AppError } from '@/utils/errors';
import { localId } from '@/utils/id';
import { storage, storageKeys } from '@/utils/storage';
import type { OrderService } from './contracts';
import { delay, simulate } from './latency';
import { reservationService } from './reservationService';

/**
 * Rounds from the table, persisted locally.
 *
 * The kitchen is the part being mocked, and it is mocked as a kitchen rather
 * than as a delay: a round sits at `placed` briefly and then becomes
 * `preparing`, because the difference between those two is the entire question
 * of whether the guest can still withdraw it. A mock that jumped straight to
 * `served` would make `canWithdraw` unreachable code.
 *
 * Prices are read from the menu here, not from the client. It is a mock and it
 * could trust the caller; it does not, because the HTTP implementation must
 * not, and a contract two implementations disagree about is not a contract.
 */

const ORDERS_KEY = storageKeys.orders;

/** How long a round sits with the floor before the kitchen takes it. */
const ACCEPTED_AFTER_MS = 90_000;

async function readOrders(): Promise<Order[]> {
  return storage.get<Order[]>(ORDERS_KEY, []);
}

async function writeOrders(orders: Order[]): Promise<void> {
  await storage.set(ORDERS_KEY, orders);
}

/**
 * A round's status, derived rather than stored.
 *
 * Same reasoning as the waitlist: a status written into the record needs
 * something to tick it over, and nothing ticks while the app is closed. A
 * function of `placedAt` and the clock gives the same answer on every render
 * and the right one after the phone has been in a pocket for ten minutes.
 */
function statusOf(order: Order, now: number): Order['status'] {
  // What the floor said, or failing that, the clock. The derivation is a
  // stand-in for a person in the kitchen; the moment one has touched the round
  // it stops guessing.
  if (order.status === 'cancelled' || order.status === 'preparing' || order.status === 'served') {
    return order.status;
  }
  const age = now - Date.parse(order.placedAt);
  if (age < ACCEPTED_AFTER_MS) return 'placed';
  if (age < ACCEPTED_AFTER_MS * 8) return 'preparing';
  return 'served';
}

function withStatus(order: Order, now = Date.now()): Order {
  return { ...order, status: statusOf(order, now) };
}

export const orderService: OrderService = {
  async getOrders(reservationId) {
    return simulate(async () => {
      const all = await readOrders();
      return all
        .filter((order) => order.reservationId === reservationId)
        .map((order) => withStatus(order))
        .sort((a, b) => a.round - b.round);
    });
  },

  async placeOrder(reservationId, lines: CartLine[]) {
    await delay();
    if (!lines.length) {
      throw new AppError('validation', { message: 'Add something to the round first.' });
    }

    const reservation = await reservationService.getReservationById(reservationId);
    // The same resolution `restaurantService.getMenu` does: a bespoke menu
    // when the venue has one, the generic fallback otherwise. Ordering off a
    // menu the venue screen does not show would be its own bug.
    const restaurant = restaurantById.get(reservation.restaurantId);
    const menu =
      menuByRestaurantId.get(reservation.restaurantId) ??
      (restaurant ? genericMenu(restaurant.id, restaurant.name, restaurant.currency) : null);
    const items = itemsById(menu);

    const priced: OrderLine[] = [];
    for (const line of lines) {
      const item = items.get(line.menuItemId);
      // An item that is no longer on the menu is refused rather than dropped
      // silently: a round that arrives one dish shorter than it was sent is
      // how a table ends up in an argument about what they asked for.
      if (!item) throw new AppError('not-found', { message: 'That dish is no longer on the menu.' });
      priced.push({
        id: localId('oln'),
        menuItemId: item.id,
        name: item.name,
        quantity: Math.max(1, line.quantity),
        unitPrice: toPaise(item.price),
        note: line.note,
      });
    }

    const all = await readOrders();
    const round = all.filter((order) => order.reservationId === reservationId).length + 1;
    const order: Order = {
      id: localId('ord'),
      reservationId,
      restaurantId: reservation.restaurantId,
      round,
      lines: priced,
      status: 'placed',
      placedAt: new Date().toISOString(),
      subtotal: priced.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    };

    await writeOrders([...all, order]);
    return order;
  },

  async withdrawOrder(orderId) {
    await delay();
    const all = await readOrders();
    const order = all.find((candidate) => candidate.id === orderId);
    if (!order) throw new AppError('not-found');

    if (statusOf(order, Date.now()) !== 'placed') {
      throw new AppError('validation', {
        message: 'The kitchen has this one already. Ask the floor if something is wrong.',
      });
    }

    order.status = 'cancelled';
    await writeOrders(all);
    return order;
  },
};
