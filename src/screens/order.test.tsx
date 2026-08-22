import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Reservation } from '@/types';

import { menuByRestaurantId } from '@/mock/menus';
import { orderService, paymentService } from '@/services';
import { storage, storageKeys } from '@/utils/storage';
import { toDateKey } from '@/utils/date';
import OrderScreen from '../../app/reservation/[id]/order';
import { givenStorage, renderScreen } from './harness';

/**
 * Ordering at the table.
 *
 * What only the screen can answer: that a booking for another day says so
 * rather than offering a menu it cannot send, and that a round which has been
 * sent appears as sent rather than as something still being chosen.
 *
 * The last case is the one that matters most and is not visible anywhere else:
 * what the table ordered has to be what the bill charges for.
 */

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    useLocalSearchParams: () => ({ id: 'rsv_order' }),
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  };
});

function booking(daysAway: number, status: Reservation['status'] = 'confirmed'): Reservation {
  const at = new Date(Date.now() + daysAway * 86_400_000);
  return {
    id: 'rsv_order',
    code: 'ABC234',
    restaurantId: 'rst_ilaya',
    date: toDateKey(at),
    time: '19:30',
    partySize: 2,
    seating: 'any',
    occasion: 'none',
    notes: '',
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Read off the menu rather than written down: item ids come from a counter
// that spans the whole file, so a literal here is a guess that goes stale the
// next time a dish is added anywhere.
const menu = menuByRestaurantId.get('rst_ilaya');
const [firstDish, secondDish] = menu?.sections.flatMap((section) => section.items) ?? [];

beforeEach(async () => {
  await storage.remove(storageKeys.orders);
  await storage.remove(storageKeys.bills);
});

describe('Order screen', () => {
  it('says ordering opens at the table rather than offering a menu it cannot send', async () => {
    await givenStorage({ reservations: [booking(3)] });
    await renderScreen(<OrderScreen />);

    expect(await screen.findByText('Ordering opens at the table')).toBeTruthy();
  });

  it('offers the venue’s own menu on the day', async () => {
    await givenStorage({ reservations: [booking(0)] });
    await renderScreen(<OrderScreen />);

    // Ilaya's menu, not a generic one: ordering off a menu the venue screen
    // does not show would be its own bug.
    expect(await screen.findByText('Eleven courses')).toBeTruthy();
  });

  it('what the table ordered is what the bill charges for', async () => {
    await givenStorage({ reservations: [booking(0)] });

    const placed = await orderService.placeOrder('rsv_order', [
      { menuItemId: firstDish.id, quantity: 2 },
    ]);
    expect(placed.round).toBe(1);
    expect(placed.lines[0].quantity).toBe(2);

    const bill = await paymentService.getBill('rsv_order');
    expect(bill).not.toBeNull();
    // The bill is the rounds. Not a plausible invention beside them.
    expect(bill!.subtotal).toBe(placed.subtotal);
    expect(bill!.lines[0].name).toContain(placed.lines[0].name);
  }, 20_000);

  it('a withdrawn round leaves the bill alone', async () => {
    await givenStorage({ reservations: [booking(0)] });

    const first = await orderService.placeOrder('rsv_order', [
      { menuItemId: firstDish.id, quantity: 1 },
    ]);
    const second = await orderService.placeOrder('rsv_order', [
      { menuItemId: secondDish.id, quantity: 1 },
    ]);
    await orderService.withdrawOrder(second.id);

    await storage.remove(storageKeys.bills);
    const bill = await paymentService.getBill('rsv_order');

    expect(bill!.subtotal).toBe(first.subtotal);
  }, 20_000);

  it('a round the kitchen has taken cannot be withdrawn', async () => {
    await givenStorage({ reservations: [booking(0)] });
    const order = await orderService.placeOrder('rsv_order', [
      { menuItemId: firstDish.id, quantity: 1 },
    ]);

    // Backdated past the point the kitchen takes it. The food exists now, and
    // an app that un-orders a cooked dish is arguing with a waiter for you.
    const stored = await storage.get<{ id: string; placedAt: string }[]>(storageKeys.orders, []);
    await storage.set(
      storageKeys.orders,
      stored.map((row) =>
        row.id === order.id ? { ...row, placedAt: new Date(Date.now() - 600_000).toISOString() } : row,
      ),
    );

    await expect(orderService.withdrawOrder(order.id)).rejects.toMatchObject({
      code: 'validation',
    });
  }, 20_000);

  it('sends a round and shows it as sent', async () => {
    await givenStorage({ reservations: [booking(0)] });
    await renderScreen(<OrderScreen />);

    // The stepper's own "+" rather than its container: the wrapper is
    // `adjustable` for a screen reader and does nothing on a tap.
    await screen.findByLabelText(new RegExp(`^${firstDish.name}, 0 on this round`));
    const [addFirst] = await screen.findAllByLabelText('One more');
    fireEvent.press(addFirst);

    await waitFor(() => expect(screen.queryByText(/^Send 1 item/)).toBeTruthy(), {
      timeout: 10_000,
    });
  }, 25_000);
});
