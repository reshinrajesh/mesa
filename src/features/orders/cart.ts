import type { CartLine, Menu, MenuItem, Order, Reservation } from '@/types';

import { AppError } from '@/utils/errors';

/**
 * Ordering from the table, as arithmetic.
 *
 * Two rules decide everything else here.
 *
 * **A menu price is rupees and an order line is paise.** The conversion
 * happens once, in `toPaise`, at the moment a round is placed — because that
 * is the moment the price stops being a label and starts being money. A cart
 * that carried paise would have to be re-derived every time the menu was
 * refetched; a bill that carried rupees would round somebody's dinner.
 *
 * **A round is fixed once it is sent.** The kitchen has it, the price is
 * whatever the menu said at that moment, and the guest edits the next round
 * rather than the last one. That is why the cart holds ids and quantities and
 * nothing else.
 */

/** The one place a menu price becomes money. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function itemsById(menu: Menu | null | undefined): Map<string, MenuItem> {
  const map = new Map<string, MenuItem>();
  for (const section of menu?.sections ?? []) {
    for (const item of section.items) map.set(item.id, item);
  }
  return map;
}

/** What the cart comes to, in paise, against the menu as it stands now. */
export function cartSubtotal(cart: CartLine[], menu: Menu | null | undefined): number {
  const items = itemsById(menu);
  return cart.reduce((sum, line) => {
    const item = items.get(line.menuItemId);
    return item ? sum + toPaise(item.price) * line.quantity : sum;
  }, 0);
}

export function cartCount(cart: CartLine[]): number {
  return cart.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * Add, remove, or set a quantity. Zero removes the line rather than keeping a
 * row that says nothing.
 */
export function setQuantity(cart: CartLine[], menuItemId: string, quantity: number): CartLine[] {
  const next = Math.max(0, quantity);
  const without = cart.filter((line) => line.menuItemId !== menuItemId);
  if (next === 0) return without;
  const existing = cart.find((line) => line.menuItemId === menuItemId);
  return [...without, { ...existing, menuItemId, quantity: next }];
}

export function quantityOf(cart: CartLine[], menuItemId: string): number {
  return cart.find((line) => line.menuItemId === menuItemId)?.quantity ?? 0;
}

/**
 * Whether this booking can order right now, and why not when it cannot.
 *
 * The table has to be *this* table, tonight. Ordering against tomorrow's
 * booking sends food to a room the guest is not sitting in, and ordering
 * against last week's sends it nowhere at all — but both are one tap away on a
 * bookings list that shows every reservation the guest has.
 *
 * The trigger is the booking rather than a scanned code because there is no
 * scanner yet. When there is one it resolves to the same reservation and calls
 * the same function; nothing else here changes.
 */
export function assertOrderable(
  reservation: Pick<Reservation, 'status' | 'date'>,
  today: string,
): void {
  if (reservation.status === 'cancelled' || reservation.status === 'no-show') {
    throw new AppError('validation', {
      message: 'This booking is not active, so there is no table to order to.',
    });
  }
  if (reservation.status === 'waitlisted') {
    throw new AppError('validation', {
      message: 'You are in the queue rather than at a table. Ordering opens once you are seated.',
    });
  }
  if (reservation.date !== today) {
    throw new AppError('validation', {
      message: 'Ordering opens on the day, at the table.',
    });
  }
}

export function canOrder(
  reservation: Pick<Reservation, 'status' | 'date'> | null | undefined,
  today: string,
): boolean {
  if (!reservation) return false;
  try {
    assertOrderable(reservation, today);
    return true;
  } catch {
    return false;
  }
}

/** Rounds that count towards the bill. A cancelled round is not one. */
export function billableOrders(orders: Order[]): Order[] {
  return orders.filter((order) => order.status !== 'cancelled');
}

/** Paise ordered so far, across every round the table has not withdrawn. */
export function orderedTotal(orders: Order[]): number {
  return billableOrders(orders).reduce((sum, order) => sum + order.subtotal, 0);
}

/**
 * Whether a round can still be withdrawn.
 *
 * Only before the kitchen takes it. After that the food exists, and an app
 * that lets somebody un-order a cooked dish is an app that argues with a
 * waiter on their behalf.
 */
export function canWithdraw(order: Pick<Order, 'status'>): boolean {
  return order.status === 'placed';
}
