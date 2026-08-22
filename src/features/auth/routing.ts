import type { SessionKind } from '@/types';

/**
 * Where the route guard sends somebody, given who they are and where they are.
 *
 * Extracted from the layout because it was three lines of `if` that decided
 * something nobody could test: a redirect that fires and immediately unwinds
 * looks, from the outside, exactly like a button that does nothing. Which is
 * what it was — a guest tapping "Log in" was bounced back to the tabs before
 * the screen drew, and the same for "Create account" on the profile and on the
 * booking review, which is the one place in the app where somebody is most
 * likely to want an account.
 *
 * The three states are not two. **Anonymous** has not chosen anything and must
 * see the welcome screen. **Guest** has chosen to browse without an account
 * and may go anywhere, including to sign-in, because converting later is the
 * entire point of letting them in without one. **Authenticated** is done with
 * these screens and is sent back if they land on one.
 */
export function redirectFor(kind: SessionKind, inAuthGroup: boolean): string | null {
  if (kind === 'anonymous' && !inAuthGroup) return '/(auth)/welcome';
  // Only a signed-in session is bounced out of the auth group. A guest going
  // there is a guest signing up, which is the outcome this app wants most.
  if (kind === 'authenticated' && inAuthGroup) return '/(tabs)';
  return null;
}
