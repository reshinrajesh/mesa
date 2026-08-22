import { render, screen } from '@testing-library/react-native';
import React from 'react';

import type { RestaurantWithContext } from '@/types';

import { mockRestaurants } from '@/mock/restaurants';
import { expectEveryTargetReachable } from '@/screens/harness';
import { RestaurantCard } from './RestaurantCard';

/**
 * Times, or a queue, or neither.
 *
 * This is the branch that shipped unreachable: the waitlist pill was correct,
 * styled and wired, and could not appear, because nothing in the mock could
 * produce an evening with no bookable slot. A domain check now proves such
 * evenings exist; this proves the card renders the right thing on one.
 */

const base = (over: Partial<RestaurantWithContext> = {}): RestaurantWithContext => ({
  ...mockRestaurants[0],
  distanceKm: 1.2,
  isOpenNow: true,
  minutesUntilStatusChange: null,
  isFavorite: false,
  nextSlots: [],
  waitlistTonight: false,
  ...over,
});

describe('RestaurantCard', () => {
  it('advertises free times when there are any', async () => {
    await render(<RestaurantCard restaurant={base({ nextSlots: ['19:00', '19:30'] })} width={240} />);

    expect(screen.getByLabelText('Reserve at 7:00 PM')).toBeOnTheScreen();
    expect(screen.queryByText(/waitlist/i)).not.toBeOnTheScreen();
  });

  it('keeps the slot pills big enough to hit', async () => {
    // The smallest controls in the app. They are measured here rather than on
    // home because a card only advertises times while the kitchen is still
    // seating, and a test that depends on the hour fails in front of somebody
    // who did not write it.
    await render(<RestaurantCard restaurant={base({ nextSlots: ['19:00', '19:30'] })} width={240} />);

    expectEveryTargetReachable();
  });

  it('offers the queue when tonight is gone', async () => {
    await render(<RestaurantCard restaurant={base({ waitlistTonight: true })} width={240} />);

    expect(screen.getByText('Full tonight · waitlist')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Reserve at/)).not.toBeOnTheScreen();
  });

  it('never shows both, whatever it is handed', async () => {
    // The card has one line for this. If both ever rendered, a queue would be
    // sitting next to a bookable time claiming equal standing.
    await render(
      <RestaurantCard
        restaurant={base({ nextSlots: ['19:00'], waitlistTonight: true })}
        width={240}
      />,
    );

    expect(screen.getByLabelText('Reserve at 7:00 PM')).toBeOnTheScreen();
    expect(screen.queryByText('Full tonight · waitlist')).not.toBeOnTheScreen();
  });

  it('shows nothing at a venue that keeps no list', async () => {
    await render(<RestaurantCard restaurant={base()} width={240} />);

    expect(screen.queryByLabelText(/^Reserve at/)).not.toBeOnTheScreen();
    expect(screen.queryByText('Full tonight · waitlist')).not.toBeOnTheScreen();
  });

  it('honours showSlots for rails that do not want a strip', async () => {
    await render(
      <RestaurantCard restaurant={base({ waitlistTonight: true })} width={240} showSlots={false} />,
    );
    expect(screen.queryByText('Full tonight · waitlist')).not.toBeOnTheScreen();
  });
});
