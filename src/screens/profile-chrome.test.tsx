import { waitFor } from '@testing-library/react-native';
import React from 'react';

import { mockUser } from '@/mock/seed';
import FavoritesScreen from '../../app/(tabs)/favorites';
import ProfileScreen from '../../app/(tabs)/profile';
import EditProfileScreen from '../../app/profile/edit';
import HelpScreen from '../../app/profile/help';
import LegalScreen from '../../app/profile/legal';
import PreferencesScreen from '../../app/profile/preferences';
import SavedPlacesScreen from '../../app/profile/saved-places';
import SettingsScreen from '../../app/profile/settings';
import {
  controls,
  expectEveryControlAnnounced,
  expectEveryTargetReachable,
  givenStorage,
  renderScreen,
} from './harness';

/**
 * The profile stack, through the two audits.
 *
 * These screens are lists of rows and a few toggles — there is no logic here a
 * test could pin that Zod, the route audit or the stores do not already cover.
 * What they do have is a great deal of chrome, and chrome is where an
 * unlabelled icon button or a 30pt row action hides: nobody demos the legal
 * page, and nobody notices until somebody using a screen reader does.
 */

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
}));

const SCREENS = [
  ['profile', <ProfileScreen key="p" />],
  ['edit profile', <EditProfileScreen key="e" />],
  ['settings', <SettingsScreen key="s" />],
  ['preferences', <PreferencesScreen key="r" />],
  ['saved places', <SavedPlacesScreen key="v" />],
  ['help', <HelpScreen key="h" />],
  ['legal', <LegalScreen key="l" />],
  ['favourites', <FavoritesScreen key="f" />],
] as const;

describe.each(SCREENS)('%s', (_name, element) => {
  it('announces every control, and every target is reachable', async () => {
    await givenStorage({});
    await renderScreen(element, { user: mockUser });

    await waitFor(() => expect(controls().length).toBeGreaterThan(0));

    expectEveryControlAnnounced();
    expectEveryTargetReachable();
  });
});
