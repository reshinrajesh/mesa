/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * The native edges these components sit on.
 *
 * Each mock here stands in for something that genuinely cannot run in Node:
 * a router that needs a navigation tree, a haptic engine, a notifications
 * daemon. Nothing in this file stubs application logic — if a test needs the
 * app to behave differently, that belongs in the test.
 */

/**
 * The setup react-native-gesture-handler ships and this project had never
 * registered. Added while hunting the Explore renderer wedge; it did not fix
 * it, and it stays because a `GestureDetector` mounting against a stub native
 * module is a thing to fix regardless of what else was wrong.
 */
require('react-native-gesture-handler/jestSetup');

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
}));

// These resolve rather than returning undefined: `utils/haptics` calls
// `.catch()` on what they return, and a mock that is not promise-shaped fails
// the code under test for a reason that has nothing to do with the test.
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('id'),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  // `null` is the real "no notification was tapped" value, not a stand-in:
  // the hook returns undefined only while it is still deciding.
  useLastNotificationResponse: jest.fn().mockReturnValue(null),
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The images are remote URLs; expo-image is not what these tests are about.
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: View };
});
