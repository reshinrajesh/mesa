import { screen } from '@testing-library/react-native';
import React from 'react';

import type { Reservation } from '@/types';

import { toDateKey } from '@/utils/date';
import HomeScreen from '../../app/(tabs)/index';
import ReservationsScreen from '../../app/(tabs)/reservations';
import NotificationsScreen from '../../app/notifications';
import ReserveScreen from '../../app/reserve/[restaurantId]/index';
import RestaurantScreen from '../../app/restaurant/[id]/index';
import {
  expectEveryTargetReachable,
  givenStorage,
  measurableTouchTargets,
  notification,
  renderScreen,
} from './harness';

/**
 * The last promise in DESIGN.md §9 that nothing computed.
 *
 * Contrast was a promise like this one — "body text at ~11:1", "the accent
 * clears 4.5:1" — and computing it found five violations, one of them under the
 * label of the app's most-pressed button. This does the same arithmetic for
 * touch targets, on the screens that can be rendered: every pressable whose
 * style states a size must reach 44pt once its `hitSlop` is added.
 *
 * Explore is absent, and not by choice: see `explore-more.test.tsx` for the
 * renderer wedge that stops it being rendered here as well.
 */

// Both keys, so one mock serves the wizard (restaurantId) and the venue page (id).
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'rst_grano', restaurantId: 'rst_grano' }),
  Link: 'Link',
}));

const RESERVATION: Reservation = {
  id: 'rsv_1',
  code: 'ABC234',
  restaurantId: 'rst_grano',
  date: toDateKey(new Date(Date.now() + 2 * 24 * 3_600_000)),
  time: '19:30',
  partySize: 2,
  seating: 'any',
  occasion: 'none',
  notes: '',
  status: 'confirmed',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('touch targets', () => {
  it('the inbox, including the small dismiss button on every row', async () => {
    await givenStorage({ notifications: [notification('a'), notification('b')] });
    await renderScreen(<NotificationsScreen />);
    await screen.findAllByLabelText(/^Dismiss/);

    expectEveryTargetReachable();
  });

  it('the bookings list, with its row actions', async () => {
    await givenStorage({ reservations: [RESERVATION] });
    await renderScreen(<ReservationsScreen />);
    await screen.findByLabelText('Directions');

    expectEveryTargetReachable();
  });

  it('home, whose header icons are the smallest controls in the app', async () => {
    await givenStorage({ notifications: [notification('a')] });
    await renderScreen(<HomeScreen />);
    // Waiting for a rail, not just the header: the slot pills on a restaurant
    // card are the smallest controls in the app and they arrive with the data.
    await screen.findAllByLabelText(/^Reserve at/, {}, { timeout: 5_000 });

    expectEveryTargetReachable();
  });

  it('the booking wizard, including the progress segments', async () => {
    await givenStorage({});
    await renderScreen(<ReserveScreen />);
    await screen.findByLabelText('Continue');

    expectEveryTargetReachable();
  });

  it('the venue page, whose hero buttons sit on photography', async () => {
    await givenStorage({});
    await renderScreen(<RestaurantScreen />);
    await screen.findByLabelText('Go back', {}, { timeout: 5_000 });

    expectEveryTargetReachable();
  });

  it('measures something, so a green run means what it looks like', async () => {
    await givenStorage({ notifications: [notification('a')] });
    await renderScreen(<NotificationsScreen />);
    await screen.findAllByLabelText(/^Dismiss/);

    // The guard against the guard. Every assertion above passes trivially if
    // nothing is measurable — a selector that stops matching, a role that gets
    // renamed — and the suite would stay green while checking nothing.
    const measured = measurableTouchTargets().filter(
      (target) => target.width !== null || target.height !== null,
    );
    expect(measured.length).toBeGreaterThanOrEqual(2);
  });
});
