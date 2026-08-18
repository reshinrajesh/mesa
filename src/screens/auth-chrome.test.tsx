import { waitFor } from '@testing-library/react-native';
import React from 'react';

import ForgotPasswordScreen from '../../app/(auth)/forgot-password';
import LoginScreen from '../../app/(auth)/login';
import OtpScreen from '../../app/(auth)/otp';
import SignUpScreen from '../../app/(auth)/sign-up';
import WelcomeScreen from '../../app/(auth)/welcome';
import {
  controls,
  expectEveryControlAnnounced,
  expectEveryTargetReachable,
  givenStorage,
  renderScreen,
} from './harness';

/**
 * The auth screens, through the two audits rather than one test each.
 *
 * There is little logic here worth pinning — Zod owns the validation, the route
 * audit owns the navigation — but there is a lot of chrome, and chrome is
 * exactly what the audits are for. A password field with an unlabelled reveal
 * button, or a 32pt "forgot password" link, is the kind of thing that ships
 * because it looks fine to whoever built it.
 *
 * One render per screen, both audits on it.
 */

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ destination: 'alex.marques@example.com' }),
  Link: 'Link',
}));

const SCREENS = [
  ['welcome', <WelcomeScreen key="w" />],
  ['sign in', <LoginScreen key="l" />],
  ['sign up', <SignUpScreen key="s" />],
  ['forgot password', <ForgotPasswordScreen key="f" />],
  ['the code screen', <OtpScreen key="o" />],
] as const;

describe.each(SCREENS)('%s', (_name, element) => {
  it('announces every control, and every target is reachable', async () => {
    await givenStorage({});
    await renderScreen(element, { session: 'anonymous' });

    // Nothing is asserted until something is on screen: both audits pass
    // vacuously against an empty tree.
    await waitFor(() => expect(controls().length).toBeGreaterThan(0));

    expectEveryControlAnnounced();
    expectEveryTargetReachable();
  });
});
