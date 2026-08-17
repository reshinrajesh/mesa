import * as Notifications from 'expo-notifications';

import type { AppNotification, NotificationPreferences, Page } from '@/types';
import type { NotificationService } from './contracts';

import { log } from '@/utils/log';
import { request } from './http';
import * as device from './notificationDevice';
import { defaultNotificationPreferences } from './notificationService';

/**
 * Notifications, split down the middle.
 *
 * The inbox and the preferences are the server's: they follow the guest to a
 * second device, and an entry marked read on a phone should not be unread on a
 * tablet. Permissions and scheduling are the phone's, and stay in
 * `./notificationDevice.ts` — a reminder for tonight's table is fired by the OS
 * from a device that may well be offline by then.
 *
 * The seam between the two halves is the preferences: the device needs them to
 * decide whether to schedule, and here they come over the wire. That is why
 * `notificationDevice` takes them as an argument instead of reading them.
 *
 * `record` still exists on this side, and on a real backend it is the odd one
 * out: the server knows a booking was confirmed and would push its own row. It
 * remains because the client is still the only thing that knows about local
 * events — and because dropping it would leave the reconciliation in
 * `features/notifications/reconcile.ts` with nowhere to file.
 */
export const notificationServiceHttp: NotificationService = {
  getNotifications() {
    return request<Page<AppNotification>>('/notifications');
  },

  async markRead(id) {
    await request<void>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
  },

  async markAllRead() {
    await request<void>('/notifications/read-all', { method: 'POST' });
  },

  async dismiss(id) {
    await request<void>(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async clearRead() {
    // The count comes back from the server rather than being inferred from the
    // list the client happened to be holding: another device may have read
    // something since, and the toast should say what actually went.
    const { cleared } = await request<{ cleared: number }>('/notifications/clear-read', {
      method: 'POST',
    });
    return cleared;
  },

  async restore(notification) {
    // The whole entry goes back, id and timestamp included, so undo restores
    // the row rather than filing a new one that happens to read the same.
    await request<void>('/notifications/restore', { method: 'POST', body: notification });
  },

  getPreferences() {
    return request<NotificationPreferences>('/notifications/preferences');
  },

  setPreferences(next) {
    return request<NotificationPreferences>('/notifications/preferences', {
      method: 'PUT',
      body: next,
    });
  },

  record(entry) {
    return request<AppNotification>('/notifications', { method: 'POST', body: entry });
  },

  requestPermission() {
    return device.requestPermission();
  },

  async scheduleReservationReminder(reservation, restaurantName) {
    await device.scheduleReservationReminder(reservation, restaurantName, await preferences());
  },

  cancelReservationReminder(reservationId) {
    return device.cancelReservationReminder(reservationId);
  },

  async scheduleWaitlistAlert(reservation, restaurantName, fireAt) {
    await device.scheduleWaitlistAlert(reservation, restaurantName, fireAt, await preferences());
  },

  cancelWaitlistAlert(reservationId) {
    return device.cancelWaitlistAlert(reservationId);
  },

  async registerForPush() {
    try {
      if (!(await device.requestPermission())) return null;
      const { data: token } = await Notifications.getExpoPushTokenAsync();
      await request<void>('/push/register', { method: 'POST', body: { token } });
      return token;
    } catch (error) {
      // A push token is an optimisation, not a feature the app needs to run:
      // every notification this app actually depends on is scheduled locally.
      log.warn('notifications', 'could not register for push', error);
      return null;
    }
  },
};

/**
 * Preferences for a scheduling decision, with a fallback.
 *
 * The device half runs at the moment a booking is made, which is the moment the
 * network is least reliable — a request has just succeeded, so the connection
 * may be about to drop. Failing to fetch a preference must not cost someone
 * their reminder, so an unreachable server means the defaults, which schedule.
 */
async function preferences(): Promise<NotificationPreferences> {
  try {
    return await request<NotificationPreferences>('/notifications/preferences');
  } catch (error) {
    log.warn('notifications', 'falling back to default preferences', error);
    return defaultNotificationPreferences;
  }
}
