import type { AppNotification, NotificationPreferences } from '@/types';
import type { NotificationService } from './contracts';

import { clearRead, dismiss, expire, restore } from '@/features/notifications/inbox';
import { seedNotifications } from '@/mock/seed';
import { localId } from '@/utils/id';
import { storage, storageKeys } from '@/utils/storage';
import { paginate, simulate } from './latency';
import * as device from './notificationDevice';

/**
 * Notifications.
 *
 * The in-app inbox is mock data. The *scheduling* half is real and lives in
 * `./notificationDevice.ts`, shared with the HTTP implementation, because a
 * local notification is fired by the OS from the device whether or not there is
 * a server behind the inbox.
 *
 * Remote push is deliberately a stub here. `registerForPush` returns null: a
 * token with nowhere to go is not worth the prompt.
 */

const SEEDED_FLAG = 'mesa.notifications-seeded';

export const defaultNotificationPreferences: NotificationPreferences = {
  reservationUpdates: true,
  reminders: true,
  reminderLeadHours: 3,
};

async function readInbox(): Promise<AppNotification[]> {
  const seeded = await storage.get<boolean>(SEEDED_FLAG, false);
  if (!seeded) {
    const seed = seedNotifications();
    await storage.set(storageKeys.notifications, seed);
    await storage.set(SEEDED_FLAG, true);
    return seed;
  }

  const stored = await storage.get<AppNotification[]>(storageKeys.notifications, []);
  // Retention is applied on read rather than by a background job: there is no
  // background job on a phone that has been shut for a month, and the moment
  // someone opens the inbox is exactly when a stale entry starts to cost them
  // something. Only written back when it actually removed something.
  const live = expire(stored, new Date());
  if (live.length !== stored.length) await storage.set(storageKeys.notifications, live);
  return live;
}

export const notificationService: NotificationService = {
  async getNotifications() {
    return simulate(async () => {
      const all = (await readInbox()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return paginate(all, null, 50);
    }, 200);
  },

  async markRead(id) {
    const all = await readInbox();
    await storage.set(
      storageKeys.notifications,
      all.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)),
    );
  },

  async markAllRead() {
    const all = await readInbox();
    const now = new Date().toISOString();
    await storage.set(
      storageKeys.notifications,
      all.map((n) => ({ ...n, readAt: n.readAt ?? now })),
    );
  },

  async dismiss(id) {
    const all = await readInbox();
    await storage.set(storageKeys.notifications, dismiss(all, id));
  },

  async clearRead() {
    const all = await readInbox();
    const kept = clearRead(all);
    await storage.set(storageKeys.notifications, kept);
    return all.length - kept.length;
  },

  async restore(notification) {
    const all = await readInbox();
    await storage.set(storageKeys.notifications, restore(all, notification));
  },

  async getPreferences() {
    return storage.get<NotificationPreferences>(
      storageKeys.notificationPrefs,
      defaultNotificationPreferences,
    );
  },

  async setPreferences(next) {
    await storage.set(storageKeys.notificationPrefs, next);
    return next;
  },

  requestPermission() {
    return device.requestPermission();
  },

  async scheduleReservationReminder(reservation, restaurantName) {
    await device.scheduleReservationReminder(reservation, restaurantName, await this.getPreferences());
  },

  cancelReservationReminder(reservationId) {
    return device.cancelReservationReminder(reservationId);
  },

  async record(entry) {
    const notification: AppNotification = {
      ...entry,
      id: localId('ntf'),
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    const all = await readInbox();
    await storage.set(storageKeys.notifications, [notification, ...all]);
    return notification;
  },

  async scheduleWaitlistAlert(reservation, restaurantName, fireAt) {
    await device.scheduleWaitlistAlert(
      reservation,
      restaurantName,
      fireAt,
      await this.getPreferences(),
    );
  },

  cancelWaitlistAlert(reservationId) {
    return device.cancelWaitlistAlert(reservationId);
  },

  async registerForPush() {
    // Intentionally inert. Wire this to `getExpoPushTokenAsync()` and POST the
    // token to the backend once one exists; asking for the permission before
    // then trains users to say no.
    return null;
  },
};
