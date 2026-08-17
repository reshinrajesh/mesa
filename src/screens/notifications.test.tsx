import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import NotificationsScreen from '../../app/notifications';
import {
  givenStorage,
  notification,
  renderScreen,
  storedNotifications,
} from './harness';

/**
 * The inbox screen.
 *
 * The retention policy is proved pure, the row is proved in isolation and the
 * service is proved against storage. What none of them can answer is whether
 * the only route to an empty inbox is on screen when it should be: the bulk
 * clear appears only once something has been read, the confirmation has to name
 * what survives, and a dismissal has to actually leave.
 */

const READ_AT = new Date(Date.now() - 60_000).toISOString();

describe('Notifications screen', () => {
  it('says so when there is nothing, rather than showing an empty list', async () => {
    await givenStorage({ notifications: [] });

    await renderScreen(<NotificationsScreen />);

    expect(await screen.findByText('Nothing to report')).toBeOnTheScreen();
  });

  it('offers "Mark all read" only while something is unread', async () => {
    await givenStorage({ notifications: [notification('a')] });
    await renderScreen(<NotificationsScreen />);

    expect(await screen.findByLabelText('Mark all as read')).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText('Mark all as read'));

    await waitFor(() => expect(screen.queryByLabelText('Mark all as read')).toBeNull());
  });

  it('offers the bulk clear only once something has been read', async () => {
    await givenStorage({ notifications: [notification('unread')] });
    await renderScreen(<NotificationsScreen />);

    await screen.findByLabelText('Mark all as read');
    // Nothing read yet, so there is nothing a bulk clear could take.
    expect(screen.queryByLabelText(/Clear .* read notification/)).toBeNull();

    fireEvent.press(screen.getByLabelText('Mark all as read'));

    expect(await screen.findByLabelText('Clear one read notification')).toBeOnTheScreen();
  });

  it('tells you what a bulk clear will spare before it takes anything', async () => {
    await givenStorage({
      notifications: [
        notification('read-1', { readAt: READ_AT }),
        notification('read-2', { readAt: READ_AT }),
        notification('unread'),
      ],
    });
    await renderScreen(<NotificationsScreen />);

    fireEvent.press(await screen.findByLabelText('Clear 2 read notifications'));

    // The count in the title and the survivors in the message: the fear about a
    // bulk delete is the entry you had not got to yet.
    expect(await screen.findByText('Clear 2 notifications?')).toBeOnTheScreen();
    expect(screen.getByText(/The unread one stays/)).toBeOnTheScreen();
  });

  it('clears the read entries and keeps the unread one, on disk', async () => {
    await givenStorage({
      notifications: [notification('read-1', { readAt: READ_AT }), notification('unread')],
    });
    await renderScreen(<NotificationsScreen />);

    fireEvent.press(await screen.findByLabelText('Clear one read notification'));
    fireEvent.press(await screen.findByText('Clear'));

    await waitFor(async () => {
      expect((await storedNotifications()).map((n) => n.id)).toEqual(['unread']);
    });
  });

  it('keeps everything when the confirmation is declined', async () => {
    await givenStorage({ notifications: [notification('read-1', { readAt: READ_AT })] });
    await renderScreen(<NotificationsScreen />);

    fireEvent.press(await screen.findByLabelText('Clear one read notification'));
    fireEvent.press(await screen.findByText('Keep them'));

    await waitFor(() => expect(screen.queryByText('Clear one notification?')).toBeNull());
    expect((await storedNotifications()).map((n) => n.id)).toEqual(['read-1']);
  });

  it('dismisses one entry from the screen and from storage', async () => {
    const entry = notification('a', { title: 'Osteria Grano is holding your table' });
    await givenStorage({ notifications: [entry, notification('b', { title: 'Second' })] });
    await renderScreen(<NotificationsScreen />);

    fireEvent.press(await screen.findByLabelText(`Dismiss ${entry.title}`));

    await waitFor(async () => {
      expect((await storedNotifications()).map((n) => n.id)).toEqual(['b']);
    });
    expect(screen.queryByLabelText(`Dismiss ${entry.title}`)).toBeNull();
  });

  it('marks an entry read when it is opened', async () => {
    await givenStorage({ notifications: [notification('a', { title: 'Tap me' })] });
    await renderScreen(<NotificationsScreen />);

    fireEvent.press(await screen.findByLabelText(/^Unread\. Tap me\./));

    await waitFor(async () => {
      expect((await storedNotifications())[0].readAt).not.toBeNull();
    });
  });
});
