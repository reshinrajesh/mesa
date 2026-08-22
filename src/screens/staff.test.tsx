import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Order, Reservation } from '@/types';

import { orderService, restaurantService } from '@/services';
import { toDateKey } from '@/utils/date';
import { storage, storageKeys } from '@/utils/storage';
import StaffScreen from '../../app/staff';
import { useUiStore } from '@/store/uiStore';
import { givenStorage, renderScreen } from './harness';

/**
 * Tonight's board.
 *
 * What only the screen can answer: that a host taps once to seat a table and
 * the row says so, that the same tap twice is refused in words naming what the
 * other person in the room already did, and that "to the kitchen" moves a
 * round rather than a table — the row counts rounds, and a count is not
 * something a button can act on.
 *
 * The mock staff service is the real one. The point is the flow through it.
 */

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  };
});

function tonight(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'rsv_floor',
    code: 'FLR100',
    restaurantId: 'rst_ilaya',
    date: toDateKey(new Date()),
    time: '19:30',
    partySize: 2,
    seating: 'any',
    occasion: 'none',
    notes: '',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(async () => {
  await givenStorage({ reservations: [tonight()] });
  await storage.remove(storageKeys.serviceStates);
  await storage.remove(storageKeys.orders);
  useUiStore.setState({ toasts: [] });
});

describe('Staff board', () => {
  it('seats a table in one tap, and says so on the row', async () => {
    // A host mid-service is choosing between tables, not between verbs.
    await renderScreen(<StaffScreen />);

    fireEvent.press(await screen.findByText('Seat'));

    expect(await screen.findByText('Seated')).toBeTruthy();
    // And what it offers next is the move that follows, not the one just made.
    expect(await screen.findByText('Clear')).toBeTruthy();
  });

  it('refuses the second tap in words that name what the room already did', async () => {
    // Two people work the same floor. The refusal is the useful part.
    await renderScreen(<StaffScreen />);
    fireEvent.press(await screen.findByText('Seat'));
    await screen.findByText('Seated');

    // Somebody else clears it while this tablet still shows "Clear".
    await storage.set(storageKeys.serviceStates, { rsv_floor: 'done' });
    fireEvent.press(screen.getByText('Clear'));

    // The copy lands in a toast, which the root layout hosts rather than the
    // screen — so this reads it where it is actually raised.
    await waitFor(() => {
      expect(
        useUiStore.getState().toasts.some((t) => /has been cleared/i.test(t.message ?? '')),
      ).toBe(true);
    });
  });

  it('sends a waiting round to the kitchen, not the table', async () => {
    // The row counts rounds; a count is not something a button can act on, so
    // the row carries the round the kitchen is owed.
    const menu = await restaurantService.getMenu('rst_ilaya');
    const round = await orderService.placeOrder('rsv_floor', [
      { menuItemId: menu.sections[0].items[0].id, quantity: 1 },
    ]);

    // Placed before the board is opened: a round the guest sends while the
    // board is already up arrives on the next poll, which is what the interval
    // is for and not what this is about.
    await renderScreen(<StaffScreen />);

    fireEvent.press(await screen.findByText('To the kitchen'));

    await waitFor(async () => {
      const stored = await storage.get<Order[]>(storageKeys.orders, []);
      expect(stored.find((order) => order.id === round.id)?.status).toBe('preparing');
    });
  });

  it('says the kitchen is clear when nothing is waiting', async () => {
    // The one thing a host looks up for. "0 rounds" is a number to read; this
    // is a state to glance at.
    await renderScreen(<StaffScreen />);

    expect(await screen.findByText('Kitchen clear')).toBeTruthy();
  });

  it('marks a walk-in as one', async () => {
    // A party that walked in has no booking behind it, and the floor treats
    // them differently when the room fills.
    await givenStorage({ reservations: [tonight({ walkIn: true })] });
    await renderScreen(<StaffScreen />);

    expect(await screen.findByText('Walked in')).toBeTruthy();
  });
});
