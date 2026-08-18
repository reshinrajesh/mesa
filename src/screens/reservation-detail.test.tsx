import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import type { Reservation } from '@/types';

import { toDateKey } from '@/utils/date';
import ReservationScreen from '../../app/reservation/[id]/index';
import { givenStorage, renderScreen } from './harness';

/**
 * A single booking.
 *
 * The screen's job is deciding which actions a booking still has, and the
 * decision that costs something to get wrong is the two-hour lock: past it, the
 * restaurant has already planned the evening around the table, so the app stops
 * offering to change it and says who to call instead. `assertModifiable` proves
 * the *rule* without a renderer; only a render can show whether the buttons
 * actually went away, or whether the lock notice appears next to a Change
 * button that still works.
 */

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'rsv_1' }),
  Link: 'Link',
}));

const pad = (n: number) => String(n).padStart(2, '0');

/** A booking whose sitting is `hours` from now, to either side of the lock. */
function reservation(hours: number, overrides: Partial<Reservation> = {}): Reservation {
  const at = new Date(Date.now() + hours * 3_600_000);
  return {
    id: 'rsv_1',
    code: 'ABC234',
    restaurantId: 'rst_grano',
    date: toDateKey(at),
    time: `${pad(at.getHours())}:${pad(at.getMinutes())}`,
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

describe('Reservation detail', () => {
  it('offers to change a booking that is still days away', async () => {
    await givenStorage({ reservations: [reservation(48)] });
    await renderScreen(<ReservationScreen />);

    expect(await screen.findByLabelText('Change this booking')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cancel booking')).toBeOnTheScreen();
    expect(screen.queryByText(/Changes close two hours before/)).toBeNull();
  });

  it('takes the change away inside the lock, and says who to call instead', async () => {
    await givenStorage({ reservations: [reservation(1)] });
    await renderScreen(<ReservationScreen />);

    expect(await screen.findByText(/Changes close two hours before/)).toBeOnTheScreen();
    // Both gone, not merely disabled: a lock notice beside a working Change
    // button is worse than either alone.
    expect(screen.queryByLabelText('Change this booking')).toBeNull();
    expect(screen.queryByLabelText('Cancel booking')).toBeNull();
  });

  it('asks about leaving a queue in different words than cancelling a table', async () => {
    await givenStorage({
      reservations: [
        reservation(48, {
          status: 'waitlisted',
          code: undefined,
          waitlist: { position: 2, joinedAt: new Date().toISOString() },
        }),
      ],
    });
    await renderScreen(<ReservationScreen />);

    fireEvent.press(await screen.findByLabelText('Leave the waitlist'));

    expect(await screen.findByText('Leave this waitlist?')).toBeOnTheScreen();
    expect(screen.getByText(/would start at the end of it/)).toBeOnTheScreen();
  });

  it('offers to rate an evening that has happened, once', async () => {
    await givenStorage({ reservations: [reservation(-24, { status: 'completed' })] });
    await renderScreen(<ReservationScreen />);

    expect(await screen.findByLabelText('Rate your evening')).toBeOnTheScreen();
    expect(screen.getByLabelText('Book this again')).toBeOnTheScreen();
  });

  it('retires the rate action once the evening has been rated', async () => {
    await givenStorage({
      reservations: [reservation(-24, { status: 'completed', reviewId: 'rev_1' })],
    });
    await renderScreen(<ReservationScreen />);

    expect(await screen.findByLabelText('Book this again')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Rate your evening')).toBeNull();
  });
});
