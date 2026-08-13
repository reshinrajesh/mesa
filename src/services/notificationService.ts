import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AppNotification, NotificationPreferences, Reservation } from '@/types';
import type { NotificationService } from './contracts';

import { seedNotifications } from '@/mock/seed';
import { combine, formatTime } from '@/utils/date';
import { localId } from '@/utils/id';
import { log } from '@/utils/log';
import { storage, storageKeys } from '@/utils/storage';
import { paginate, simulate } from './latency';

/**
 * Notifications.
 *
 * The in-app inbox is mock data. The *scheduling* half is real: reservation
 * reminders are genuine `expo-notifications` local notifications, because that
 * is the piece that needs a permission prompt, an Android channel and a
 * cancellation path, and none of those are things worth discovering later.
 *
 * Remote push is deliberately a stub. `registerForPush` returns null until a
 * push backend exists — a token with nowhere to go is not worth the prompt.
 */

const SEEDED_FLAG = 'mesa.notifications-seeded';
const REMINDER_MAP_KEY = 'mesa.reminder-ids';

/**
 * Scheduled-notification identifiers are kept under a namespaced key so a
 * booking and its waitlist alert can be cancelled independently. A single key
 * per reservation would have leaving a queue silently unschedule the reminder
 * for a different table.
 */
const reminderKey = (reservationId: string) => `booking:${reservationId}`;
const waitlistKey = (reservationId: string) => `waitlist:${reservationId}`;

async function cancelScheduled(key: string): Promise<void> {
  const map = await storage.get<Record<string, string>>(REMINDER_MAP_KEY, {});
  const identifier = map[key];
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
  const { [key]: _removed, ...rest } = map;
  await storage.set(REMINDER_MAP_KEY, rest);
}

async function rememberScheduled(key: string, identifier: string): Promise<void> {
  const map = await storage.get<Record<string, string>>(REMINDER_MAP_KEY, {});
  await storage.set(REMINDER_MAP_KEY, { ...map, [key]: identifier });
}

export const defaultNotificationPreferences: NotificationPreferences = {
  reservationUpdates: true,
  reminders: true,
  offers: false,
  reminderLeadHours: 3,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reservations', {
    name: 'Reservations',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#C4552F',
    // No vibration: a table reminder does not need to interrupt.
    vibrationPattern: [0, 120],
  });
}

async function readInbox(): Promise<AppNotification[]> {
  const seeded = await storage.get<boolean>(SEEDED_FLAG, false);
  if (!seeded) {
    const seed = seedNotifications();
    await storage.set(storageKeys.notifications, seed);
    await storage.set(SEEDED_FLAG, true);
    return seed;
  }
  return storage.get<AppNotification[]>(storageKeys.notifications, []);
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

  async requestPermission() {
    try {
      await ensureAndroidChannel();
      const existing = await Notifications.getPermissionsAsync();
      if (existing.granted) return true;
      // Only ask once per launch; a denied prompt cannot be re-shown by asking again.
      const requested = await Notifications.requestPermissionsAsync();
      return requested.granted;
    } catch (error) {
      log.warn('notifications', 'permission request failed', error);
      return false;
    }
  },

  async scheduleReservationReminder(reservation: Reservation, restaurantName: string) {
    try {
      const prefs = await this.getPreferences();
      if (!prefs.reminders) return;

      const sitting = combine(reservation.date, reservation.time).getTime();
      const fireAt = sitting - prefs.reminderLeadHours * 3_600_000;
      // Silently skip bookings too close to fire a useful reminder.
      if (fireAt <= Date.now() + 60_000) return;

      const granted = await this.requestPermission();
      if (!granted) return;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${restaurantName} at ${formatTime(reservation.time)}`,
          body: reservation.code
            ? `Table for ${reservation.partySize}. Your code is ${reservation.code}.`
            : `Table for ${reservation.partySize}.`,
          data: { href: `/reservation/${reservation.id}` },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fireAt),
          channelId: 'reservations',
        },
      });

      await rememberScheduled(reminderKey(reservation.id), identifier);
    } catch (error) {
      // A failed reminder must never block a confirmed booking.
      log.warn('notifications', 'could not schedule reminder', error);
    }
  },

  async cancelReservationReminder(reservationId) {
    try {
      await cancelScheduled(reminderKey(reservationId));
    } catch (error) {
      log.warn('notifications', 'could not cancel reminder', error);
    }
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

  async scheduleWaitlistAlert(reservation: Reservation, restaurantName: string, fireAt: Date) {
    try {
      // This one ignores the `reminders` preference and honours
      // `reservationUpdates` instead: it is not a nudge about something already
      // arranged, it is the only warning that a table is being held and will go
      // to someone else. Someone who turned reminders off did not ask to lose
      // the table they queued for.
      const prefs = await this.getPreferences();
      if (!prefs.reservationUpdates) return;

      if (fireAt.getTime() <= Date.now() + 1_000) return;

      const granted = await this.requestPermission();
      if (!granted) return;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `A table at ${restaurantName}`,
          body: `${formatTime(reservation.time)} for ${reservation.partySize} just came free. Confirm it before the hold runs out.`,
          data: { href: `/reservation/${reservation.id}` },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
          channelId: 'reservations',
        },
      });

      await rememberScheduled(waitlistKey(reservation.id), identifier);
    } catch (error) {
      log.warn('notifications', 'could not schedule waitlist alert', error);
    }
  },

  async cancelWaitlistAlert(reservationId) {
    try {
      await cancelScheduled(waitlistKey(reservationId));
    } catch (error) {
      log.warn('notifications', 'could not cancel waitlist alert', error);
    }
  },

  async registerForPush() {
    // Intentionally inert. Wire this to `getExpoPushTokenAsync()` and POST the
    // token to the backend once one exists; asking for the permission before
    // then trains users to say no.
    return null;
  },
};
