import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { NotificationPreferences, Reservation } from '@/types';

import { lightPalette } from '@/theme/palette';
import { combine, formatTime } from '@/utils/date';
import { log } from '@/utils/log';
import { storage } from '@/utils/storage';

/**
 * The half of notifications that belongs to the phone.
 *
 * Permissions, the Android channel and the actual scheduling are the same work
 * whether the inbox is a mock or a real backend — a local notification is fired
 * by the OS, from the device, whether or not there is a server. What differs is
 * where the *inbox* and the *preferences* live, and that stays in the two
 * service implementations.
 *
 * Preferences arrive as an argument rather than being read here, because that
 * is exactly the part that differs: the mock reads them from AsyncStorage and
 * the HTTP service from an endpoint. A device module that fetched them itself
 * would have to know which.
 */

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
    // The notification LED is drawn by Android, on its own ground, in whichever
    // theme the phone is in — so it takes the light accent rather than the
    // scheme-dependent token, and takes it from the palette rather than a copy.
    lightColor: lightPalette.accent,
    // No vibration: a table reminder does not need to interrupt.
    vibrationPattern: [0, 120],
  });
}

/**
 * Whether permission is already granted, without asking for it.
 *
 * The distinction matters: `requestPermission` shows the OS prompt, and a
 * prompt at the wrong moment is a permanent no. Anything that wants to act only
 * when the user has *already* said yes asks this instead.
 */
export async function hasPermission(): Promise<boolean> {
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

export async function requestPermission(): Promise<boolean> {
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
}

export async function scheduleReservationReminder(
  reservation: Reservation,
  restaurantName: string,
  preferences: NotificationPreferences,
): Promise<void> {
  try {
    if (!preferences.reminders) return;

    const sitting = combine(reservation.date, reservation.time).getTime();
    const fireAt = sitting - preferences.reminderLeadHours * 3_600_000;
    // Silently skip bookings too close to fire a useful reminder.
    if (fireAt <= Date.now() + 60_000) return;

    if (!(await requestPermission())) return;

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
}

export async function cancelReservationReminder(reservationId: string): Promise<void> {
  try {
    await cancelScheduled(reminderKey(reservationId));
  } catch (error) {
    log.warn('notifications', 'could not cancel reminder', error);
  }
}

export async function scheduleWaitlistAlert(
  reservation: Reservation,
  restaurantName: string,
  fireAt: Date,
  preferences: NotificationPreferences,
): Promise<void> {
  try {
    // This one ignores the `reminders` preference and honours
    // `reservationUpdates` instead: it is not a nudge about something already
    // arranged, it is the only warning that a table is being held and will go
    // to someone else. Someone who turned reminders off did not ask to lose
    // the table they queued for.
    if (!preferences.reservationUpdates) return;
    if (fireAt.getTime() <= Date.now() + 1_000) return;
    if (!(await requestPermission())) return;

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
}

export async function cancelWaitlistAlert(reservationId: string): Promise<void> {
  try {
    await cancelScheduled(waitlistKey(reservationId));
  } catch (error) {
    log.warn('notifications', 'could not cancel waitlist alert', error);
  }
}
