import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import type { Reservation } from '@/types';

import { toDateKey } from '@/utils/date';
import HomeScreen from '../../app/(tabs)/index';
import ReservationsScreen from '../../app/(tabs)/reservations';
import NotificationsScreen from '../../app/notifications';
import ReserveScreen from '../../app/reserve/[restaurantId]/index';
import RestaurantScreen from '../../app/restaurant/[id]/index';
import { controls, expectEveryControlAnnounced, givenStorage, notification, renderScreen } from './harness';

/**
 * "Every interactive element has a role, a label and a state" — §9.
 *
 * The third promise in that section to be computed rather than believed. The
 * first two both turned out to be wrong somewhere: the accent failed 4.5:1
 * under the app's most-pressed button, and the slot pills were two points short
 * of 44. This one asks whether anything on screen can be pressed without being
 * describable, which is the failure a sighted developer never sees.
 *
 * The dialogs and sheets are opened deliberately below. A modal's scrim is a
 * full-screen pressable, and an unlabelled one is the worst kind: a screen
 * reader announces a button covering the entire screen with nothing to say
 * about it.
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

describe('every control announces itself', () => {
  it('on the inbox', async () => {
    await givenStorage({ notifications: [notification('a'), notification('b')] });
    await renderScreen(<NotificationsScreen />);
    await screen.findAllByLabelText(/^Dismiss/);

    expectEveryControlAnnounced();
  });

  it('on the inbox with its confirmation open', async () => {
    await givenStorage({
      notifications: [notification('read', { readAt: new Date().toISOString() })],
    });
    await renderScreen(<NotificationsScreen />);

    fireEvent.press(await screen.findByLabelText('Clear one read notification'));
    await screen.findByText('Clear one notification?');

    // Proof that the traversal reaches inside the modal before the audit is
    // believed: the scrim is a full-screen pressable that only exists while the
    // dialog is open, so finding it means the dialog's own buttons were walked
    // too. Without this the test would pass by seeing nothing.
    expect(controls().map((control) => control.label)).toContain('Dismiss');

    expectEveryControlAnnounced();
  });

  it('on the bookings list', async () => {
    await givenStorage({ reservations: [RESERVATION] });
    await renderScreen(<ReservationsScreen />);
    await screen.findByLabelText('Directions');

    expectEveryControlAnnounced();
  });

  it('on home, once the rails have arrived', async () => {
    await givenStorage({ notifications: [notification('a')] });
    await renderScreen(<HomeScreen />);
    await screen.findAllByLabelText(/^Reserve at/, {}, { timeout: 5_000 });

    expectEveryControlAnnounced();
  });

  it('in the booking wizard', async () => {
    await givenStorage({});
    await renderScreen(<ReserveScreen />);
    await screen.findByLabelText('Continue');

    expectEveryControlAnnounced();
  });

  it('on the venue page, gallery and all', async () => {
    await givenStorage({});
    await renderScreen(<RestaurantScreen />);
    await screen.findByLabelText('Go back', {}, { timeout: 5_000 });

    expectEveryControlAnnounced();
  });

  it('finds controls at all, so a green run means what it looks like', async () => {
    await givenStorage({ notifications: [notification('a')] });
    await renderScreen(<NotificationsScreen />);
    await screen.findAllByLabelText(/^Dismiss/);

    // Same guard as the touch-target audit: every assertion above passes
    // trivially if the traversal stops finding anything, and the suite would
    // stay green while checking nothing at all.
    expect(controls().length).toBeGreaterThanOrEqual(3);
  });
});
