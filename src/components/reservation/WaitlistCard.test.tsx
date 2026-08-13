import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type { WaitlistStatus } from '@/features/reservations/waitlist';

import { WaitlistCard } from './WaitlistCard';

/**
 * The three states of a queue, and which of them is actionable.
 *
 * The one that matters is `offered`: a table is being held and will go to
 * somebody else. If that state ever renders without its button — or if either
 * of the other two renders *with* one — the feature is broken in a way no pure
 * function can detect, because the arithmetic behind it is still correct.
 */

const status = (over: Partial<WaitlistStatus> & { state: WaitlistStatus['state'] }): WaitlistStatus => ({
  position: 0,
  offerAt: 0,
  expiresAt: 0,
  minutesLeft: 0,
  ...over,
});

describe('WaitlistCard', () => {
  it('offers the table, and the countdown, only while the hold is live', async () => {
    const onAccept = jest.fn();
    await render(
      <WaitlistCard
        status={status({ state: 'offered', minutesLeft: 12 })}
        time="19:30"
        restaurantName="Osteria Grano"
        onAccept={onAccept}
      />,
    );

    expect(screen.getByText('A table came free')).toBeOnTheScreen();
    expect(screen.getByText(/12/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Take the table'));
    expect(onAccept).toHaveBeenCalled();
  });

  it('says where you are in the queue and offers nothing to press', async () => {
    await render(
      <WaitlistCard
        status={status({ state: 'queued', position: 3 })}
        time="19:30"
        restaurantName="Osteria Grano"
        onAccept={jest.fn()}
        onTryAnotherTime={jest.fn()}
      />,
    );

    expect(screen.getByText('3 ahead of you')).toBeOnTheScreen();
    expect(screen.queryByText('Take the table')).not.toBeOnTheScreen();
    // Waiting is not a dead end that needs an escape hatch — it is the normal
    // state, and a button here would imply something has gone wrong.
    expect(screen.queryByText('See other times')).not.toBeOnTheScreen();
  });

  it('explains a lapsed hold without losing the place, and names a way out', async () => {
    const onTryAnotherTime = jest.fn();
    await render(
      <WaitlistCard
        status={status({ state: 'lapsed' })}
        time="19:30"
        restaurantName="Osteria Grano"
        onTryAnotherTime={onTryAnotherTime}
      />,
    );

    expect(screen.getByText(/still on the list/)).toBeOnTheScreen();
    expect(screen.queryByText('Take the table')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('See other times'));
    expect(onTryAnotherTime).toHaveBeenCalled();
  });

  it('never shows a hold that has no time left on it', async () => {
    // The one number in the app that must not read zero while its button works.
    await render(
      <WaitlistCard
        status={status({ state: 'offered', minutesLeft: 1 })}
        time="19:30"
        restaurantName="Osteria Grano"
        onAccept={jest.fn()}
      />,
    );

    expect(screen.getByText('1 minute')).toBeOnTheScreen();
    expect(screen.queryByText('0 minutes')).not.toBeOnTheScreen();
  });
});
