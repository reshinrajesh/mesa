import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { notificationService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { usePushRegistration } from './usePushRegistration';

/**
 * Push registration, and mostly the prompt it must not show.
 *
 * The valuable assertion here is a negative one: launching the app does not ask
 * for the notification permission. An app that asks at launch, before it has
 * done anything worth being notified about, collects a permanent no — and the
 * mistake is invisible in code review because `requestPermission` and
 * `getPermissionsAsync` sit one letter apart in the same module.
 */

const getPermissions = Notifications.getPermissionsAsync as jest.Mock;
const requestPermissions = Notifications.requestPermissionsAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ kind: 'authenticated', user: null, hydrated: true });
});

describe('usePushRegistration', () => {
  it('registers for someone who has already granted permission', async () => {
    getPermissions.mockResolvedValue({ granted: true });
    const register = jest.spyOn(notificationService, 'registerForPush');

    await renderHook(() => usePushRegistration(true));

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('never shows the permission prompt at launch', async () => {
    getPermissions.mockResolvedValue({ granted: false });
    const register = jest.spyOn(notificationService, 'registerForPush');

    await renderHook(() => usePushRegistration(true));

    await waitFor(() => expect(getPermissions).toHaveBeenCalled());
    // No prompt, and nothing registered: a token is worth having, but not at
    // the cost of the answer to the only question this app gets to ask.
    expect(requestPermissions).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it('leaves a signed-out session alone', async () => {
    getPermissions.mockResolvedValue({ granted: true });
    useAuthStore.setState({ kind: 'guest', user: null, hydrated: true });
    const register = jest.spyOn(notificationService, 'registerForPush');

    await renderHook(() => usePushRegistration(true));

    // The endpoint identifies the account by its bearer token; a token
    // registered against nobody cannot be routed to anybody.
    expect(register).not.toHaveBeenCalled();
    expect(getPermissions).not.toHaveBeenCalled();
  });

  it('registers again when a different session begins', async () => {
    getPermissions.mockResolvedValue({ granted: true });
    const register = jest.spyOn(notificationService, 'registerForPush');

    await renderHook(() => usePushRegistration(true));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));

    // Someone signs out and someone else signs in on the same phone. Skipping
    // the second registration would leave the notifications going to whoever
    // used the phone first, which is worse than sending a token twice.
    await act(async () => {
      useAuthStore.setState({ kind: 'anonymous', user: null });
    });
    await act(async () => {
      useAuthStore.setState({ kind: 'authenticated', user: { id: 'usr_2' } as never });
    });

    await waitFor(() => expect(register).toHaveBeenCalledTimes(2));
  });
});
