import { screen } from '@testing-library/react-native';
import React from 'react';

import type { Reservation } from '@/types';

import { toDateKey } from '@/utils/date';
import ConfirmationScreen from '../../app/reserve/[restaurantId]/confirmation';
import { givenStorage, renderScreen } from './harness';

/**
 * The confirmation screen.
 *
 * It exists to hand over one thing — the code you give at the door — and the
 * rule that matters is when it must not. A waitlist entry has no table, so it
 * has no code and no QR: printing one would send somebody to a restaurant that
 * is not expecting them, holding something that looks exactly like a booking.
 * That is a rule about what is *absent* from a screen, which nothing below a
 * render can check.
 */

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ reservationId: 'rsv_1', restaurantId: 'rst_ilaya' }),
  Link: 'Link',
}));

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  const at = new Date(Date.now() + 2 * 24 * 3_600_000);
  return {
    id: 'rsv_1',
    code: 'ABC234',
    restaurantId: 'rst_ilaya',
    date: toDateKey(at),
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

describe('Confirmation screen', () => {
  it('hands over the code for a confirmed table', async () => {
    await givenStorage({ reservations: [reservation()] });
    await renderScreen(<ConfirmationScreen />);

    expect(await screen.findByText('Table booked')).toBeOnTheScreen();
    // Spelled out in large type as well as encoded in the QR, because a
    // scanner that will not read the screen is a door you still have to get in.
    expect(screen.getByText('ABC234')).toBeOnTheScreen();
    expect(screen.getByLabelText('See my booking')).toBeOnTheScreen();
  });

  it('says a request is a request until the restaurant answers', async () => {
    await givenStorage({ reservations: [reservation({ status: 'pending' })] });
    await renderScreen(<ConfirmationScreen />);

    // "Request sent", not "Table booked": nobody has agreed to anything yet.
    expect(await screen.findByText('Request sent')).toBeOnTheScreen();
    expect(screen.queryByText('Table booked')).toBeNull();
  });

  it('gives a waitlist entry a place in the queue and no code at all', async () => {
    await givenStorage({
      reservations: [
        reservation({
          status: 'waitlisted',
          code: undefined,
          waitlist: { position: 3, joinedAt: new Date().toISOString() },
        }),
      ],
    });
    await renderScreen(<ConfirmationScreen />);

    expect(await screen.findByText('You are on the list')).toBeOnTheScreen();
    expect(screen.getByLabelText('See my place in the queue')).toBeOnTheScreen();

    // The whole point: no code anywhere on the screen, not even the one this
    // fixture would have carried if the status had been different.
    expect(screen.queryByText('ABC234')).toBeNull();
    expect(screen.queryByText('Booking code')).toBeNull();
  });
});
