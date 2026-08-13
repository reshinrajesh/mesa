import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics, rationed.
 *
 * Rule: haptics confirm a *state change the user caused* — a slot selected, a
 * favourite added, a booking confirmed. They never fire on scroll, on render,
 * or on navigation, because a phone that buzzes while you browse is a phone
 * people turn haptics off on.
 *
 * Every call is fire-and-forget. A device with no taptic engine, or a user who
 * disabled it, must not produce an unhandled rejection.
 */

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function safe(run: () => Promise<void>) {
  if (!enabled) return;
  run().catch(() => {});
}

export const haptics = {
  /** Chip, slot, tab, segmented control. */
  selection: () => safe(() => Haptics.selectionAsync()),
  /** A primary button that starts something. */
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Favourite toggled on, step advanced. */
  bump: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Reservation confirmed. Used once per flow, deliberately. */
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** A blocked action: unavailable slot, failed validation. */
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
