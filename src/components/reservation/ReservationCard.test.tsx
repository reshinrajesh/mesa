import { render, screen } from '@testing-library/react-native';
import React from 'react';

import type { Reservation, ReservationStatus } from '@/types';

import { config } from '@/constants/config';
import { ReservationCard, STATUS_META } from './ReservationCard';

/**
 * Every status draws a badge, and the one with a table waiting overrides it.
 *
 * The audit that prompted these tests found `no-show` shipping with a badge,
 * a tone, an icon and copy that nothing in the app could produce. A domain
 * check now proves the system can reach every status; this proves the card can
 * draw every status it is handed.
 */

const RESERVATION: Reservation = {
  id: 'rsv_1',
  code: 'ABC234',
  restaurantId: 'rst_ilaya',
  date: '2026-08-14',
  time: '19:30',
  partySize: 2,
  seating: 'any',
  occasion: 'none',
  notes: '',
  status: 'confirmed',
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

const ALL_STATUSES: ReservationStatus[] = [
  'pending',
  'confirmed',
  'waitlisted',
  'completed',
  'cancelled',
  'no-show',
];

describe('ReservationCard', () => {
  it.each(ALL_STATUSES)('draws a badge for %s', async (status) => {
    await render(<ReservationCard reservation={{ ...RESERVATION, status }} />);
    expect(screen.getByText(STATUS_META[status].label)).toBeOnTheScreen();
  });

  it('shows the queue position while queued', async () => {
    await render(
      <ReservationCard
        reservation={{
          ...RESERVATION,
          status: 'waitlisted',
          code: undefined,
          waitlist: { position: 3, joinedAt: new Date().toISOString() },
        }}
      />,
    );

    expect(screen.getByText('On the list')).toBeOnTheScreen();
    expect(screen.getByText('3 ahead of you')).toBeOnTheScreen();
  });

  it('replaces the queue badge once a table is being held', async () => {
    // Joined long enough ago that the queue has run out and the hold is live.
    const joinedAt = new Date(Date.now() - 3 * config.waitlist.queueMoveMs).toISOString();
    await render(
      <ReservationCard
        reservation={{
          ...RESERVATION,
          status: 'waitlisted',
          code: undefined,
          waitlist: { position: 2, joinedAt },
        }}
      />,
    );

    // "On the list" is true but useless when a table is about to go to someone
    // else. The badge has to say the thing that needs acting on.
    expect(screen.queryByText('On the list')).not.toBeOnTheScreen();
    expect(screen.getByText('Table free')).toBeOnTheScreen();
    expect(screen.getByText(/Held for \d+ more minute/)).toBeOnTheScreen();
  });

  it('does not claim a countdown for an ordinary booking', async () => {
    await render(<ReservationCard reservation={RESERVATION} />);
    expect(screen.queryByText(/Held for/)).not.toBeOnTheScreen();
  });
});
