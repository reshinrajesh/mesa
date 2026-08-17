import { screen } from '@testing-library/react-native';
import React from 'react';

import HomeScreen from '../../app/(tabs)/index';
import { givenStorage, notification, renderScreen } from './harness';

/**
 * Home, and specifically the bell.
 *
 * The inbox can now fill itself — a table coming free, a sitting drawing near —
 * and for a while nothing on any other screen said so. The dot is the whole
 * point of that work being visible, and it is drawn from a count, so the state
 * that matters is "is there an unread entry", not "how many".
 *
 * The count lives in the label rather than in a badge: a dot is "something
 * happened" to anyone who can see it and nothing at all to anyone who cannot,
 * which is also what makes this assertable without reaching into styles.
 */

const READ_AT = new Date(Date.now() - 60_000).toISOString();

describe('Home screen', () => {
  it('says how many unread entries are waiting', async () => {
    await givenStorage({
      notifications: [notification('a'), notification('b')],
    });

    await renderScreen(<HomeScreen />);

    expect(await screen.findByLabelText('Notifications, 2 unread')).toBeOnTheScreen();
  });

  it('says so plainly when there is nothing waiting', async () => {
    await givenStorage({
      notifications: [notification('read', { readAt: READ_AT })],
    });

    await renderScreen(<HomeScreen />);

    // Not silence: a screen reader reaching the bell should learn there is
    // nothing to open, rather than having to open it to find out.
    expect(await screen.findByLabelText('Notifications, none unread')).toBeOnTheScreen();
  });
});
