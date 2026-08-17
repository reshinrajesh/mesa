import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type { AppNotification } from '@/types';

import { NotificationRow } from './NotificationRow';

/**
 * The two things the inbox rules cannot see.
 *
 * `features/notifications/inbox.ts` decides what may leave the inbox and proves
 * it without a renderer. What it cannot know is whether the only route to an
 * empty inbox is actually on screen, or whether a screen reader can tell which
 * entry a dismiss button belongs to — and the second one is why this file
 * asserts on labels rather than on icons.
 */

const NOTIFICATION: AppNotification = {
  id: 'ntf_1',
  kind: 'waitlist-offer',
  title: 'A table at Osteria Grano',
  body: '7:30 PM for two just came free.',
  createdAt: '2026-08-17T10:00:00.000Z',
  readAt: null,
};

const read: AppNotification = { ...NOTIFICATION, readAt: '2026-08-17T11:00:00.000Z' };

describe('NotificationRow', () => {
  it('announces an unread entry as unread', async () => {
    await render(
      <NotificationRow notification={NOTIFICATION} onPress={jest.fn()} onDismiss={jest.fn()} />,
    );

    expect(
      screen.getByLabelText(`Unread. ${NOTIFICATION.title}. ${NOTIFICATION.body}`),
    ).toBeOnTheScreen();
  });

  it('drops the unread prefix once it has been read', async () => {
    await render(<NotificationRow notification={read} onPress={jest.fn()} onDismiss={jest.fn()} />);

    expect(screen.getByLabelText(`${read.title}. ${read.body}`)).toBeOnTheScreen();
    expect(screen.queryByLabelText(`Unread. ${read.title}. ${read.body}`)).toBeNull();
  });

  it('offers a dismiss button that names its own entry', async () => {
    const onDismiss = jest.fn();
    await render(
      <NotificationRow notification={NOTIFICATION} onPress={jest.fn()} onDismiss={onDismiss} />,
    );

    // Named, not just "Dismiss": a list of identically labelled buttons tells a
    // screen reader user nothing about which entry is about to go.
    fireEvent.press(screen.getByLabelText(`Dismiss ${NOTIFICATION.title}`));
    expect(onDismiss).toHaveBeenCalledWith(NOTIFICATION);
  });

  it('opens the entry when the row itself is pressed', async () => {
    const onPress = jest.fn();
    await render(
      <NotificationRow notification={NOTIFICATION} onPress={onPress} onDismiss={jest.fn()} />,
    );

    fireEvent.press(screen.getByLabelText(`Unread. ${NOTIFICATION.title}. ${NOTIFICATION.body}`));
    expect(onPress).toHaveBeenCalledWith(NOTIFICATION);
  });
});
