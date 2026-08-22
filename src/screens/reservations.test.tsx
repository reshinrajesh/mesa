import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Reservation } from '@/types';

import { toDateKey } from '@/utils/date';
import ReservationsScreen from '../../app/(tabs)/reservations';
import { givenStorage, renderScreen } from './harness';

/**
 * The bookings screen.
 *
 * Upcoming and Past are not one list filtered twice: the actions on a row are
 * the point of the screen, and which ones appear is decided by the tab, the
 * status and whether a booking has already been rated. `ReservationCard` is
 * tested in isolation and knows how to draw a status; only the screen knows
 * that a waitlist entry must not offer directions to a table nobody is holding.
 */

const pad = (n: number) => String(n).padStart(2, '0');

function reservation(id: string, daysAway: number, overrides: Partial<Reservation> = {}): Reservation {
  const at = new Date(Date.now() + daysAway * 24 * 3_600_000);
  return {
    id,
    code: 'ABC234',
    restaurantId: 'rst_ilaya',
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

const openPast = async () => fireEvent.press(await screen.findByLabelText('Past'));

describe('Reservations screen', () => {
  it('sends you somewhere useful when there is nothing booked', async () => {
    await givenStorage({ reservations: [] });

    await renderScreen(<ReservationsScreen />);

    // An empty Upcoming offers a way out of itself; an empty Past cannot,
    // because there is nothing to do about a history you do not have.
    expect(await screen.findByText('No tables booked')).toBeOnTheScreen();
    expect(screen.getByText('Find a table')).toBeOnTheScreen();

    await openPast();
    expect(await screen.findByText('Nothing here yet')).toBeOnTheScreen();
  });

  it('gives an upcoming booking its live actions', async () => {
    await givenStorage({ reservations: [reservation('rsv_1', 2)] });

    await renderScreen(<ReservationsScreen />);

    expect(await screen.findByLabelText('Directions')).toBeOnTheScreen();
    expect(screen.getByLabelText('Modify')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cancel')).toBeOnTheScreen();
  });

  it('offers a waitlist entry a place in the queue, not directions to a table', async () => {
    await givenStorage({
      reservations: [
        reservation('rsv_queue', 1, {
          status: 'waitlisted',
          code: undefined,
          waitlist: { position: 2, joinedAt: new Date().toISOString() },
        }),
      ],
    });

    await renderScreen(<ReservationsScreen />);

    expect(await screen.findByLabelText('See my place')).toBeOnTheScreen();
    expect(screen.getByLabelText('Leave the list')).toBeOnTheScreen();
    // There is no table yet: nothing to navigate to and nothing to modify.
    expect(screen.queryByLabelText('Directions')).toBeNull();
    expect(screen.queryByLabelText('Modify')).toBeNull();
  });

  it('asks about leaving a queue in different words than cancelling a table', async () => {
    await givenStorage({
      reservations: [
        reservation('rsv_queue', 1, {
          status: 'waitlisted',
          code: undefined,
          waitlist: { position: 2, joinedAt: new Date().toISOString() },
        }),
      ],
    });
    await renderScreen(<ReservationsScreen />);

    fireEvent.press(await screen.findByLabelText('Leave the list'));

    expect(await screen.findByText('Leave this waitlist?')).toBeOnTheScreen();
    expect(screen.queryByText('Cancel this booking?')).toBeNull();
  });

  it('offers to rate an evening that has been had, once', async () => {
    // Two days ago and never rated: the service settles it to `completed` on
    // read, which is what makes the Rate action reachable at all.
    await givenStorage({
      reservations: [
        reservation('rsv_done', -2, { status: 'completed' }),
        reservation('rsv_rated', -3, { status: 'completed', reviewId: 'rev_1' }),
      ],
    });
    await renderScreen(<ReservationsScreen />);

    await openPast();

    await waitFor(() => expect(screen.getAllByLabelText('Book again')).toHaveLength(2));
    // One Rate button for two past evenings: the rated one has retired its own.
    expect(screen.getAllByLabelText('Rate')).toHaveLength(1);
  });

  it('keeps a cancelled booking in Past without offering to change it', async () => {
    await givenStorage({
      reservations: [reservation('rsv_gone', 2, { status: 'cancelled' })],
    });
    await renderScreen(<ReservationsScreen />);

    // Cancelled drops out of Upcoming however far in the future it was.
    expect(await screen.findByText('No tables booked')).toBeOnTheScreen();

    await openPast();
    expect(await screen.findByLabelText('Book again')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Rate')).toBeNull();
  });
});
