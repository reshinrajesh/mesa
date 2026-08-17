import type { AuthTokens, SessionKind, User } from '@/types';

import { secureKeys, secureStorage, storage, storageKeys } from '@/utils/storage';

/**
 * Where a session lives on the device, for whichever auth service is in use.
 *
 * Extracted because there are now two implementations and only one correct
 * answer: tokens go to SecureStore (keychain / EncryptedSharedPreferences) and
 * the profile goes to AsyncStorage, which is a plaintext file. If the mock and
 * the HTTP service each kept their own copy of that split, one of them would
 * eventually drift, and the drift that matters — a token written to
 * AsyncStorage — is invisible until someone reads a rooted device.
 *
 * The signing-in half differs between implementations and belongs to them. This
 * is only the storing.
 */

export async function persistSession(user: User, tokens: AuthTokens): Promise<void> {
  await secureStorage.set(secureKeys.accessToken, tokens.accessToken);
  await secureStorage.set(secureKeys.refreshToken, tokens.refreshToken);
  await storage.set(storageKeys.user, user);
  await storage.set(storageKeys.session, 'authenticated');
}

/**
 * Reads back what `persistSession` wrote.
 *
 * A profile with no token is a broken session rather than a signed-in one — it
 * is what a half-finished sign-out leaves behind — so it resolves to anonymous
 * instead of letting the app believe someone is logged in.
 */
export async function readSession(): Promise<{ user: User | null; kind: SessionKind }> {
  const kind = await storage.get<SessionKind>(storageKeys.session, 'anonymous');
  if (kind !== 'authenticated') return { user: null, kind };

  const token = await secureStorage.get(secureKeys.accessToken);
  const user = await storage.get<User | null>(storageKeys.user, null);
  if (!token) return { user: null, kind: 'anonymous' };
  return { user, kind: 'authenticated' };
}

/**
 * Ends the session locally.
 *
 * Tokens die first. If the process is killed halfway through a sign-out, the
 * worst outcome should be a stale profile, never a live credential.
 */
export async function clearSession(): Promise<void> {
  await secureStorage.remove(secureKeys.accessToken);
  await secureStorage.remove(secureKeys.refreshToken);
  await storage.remove(storageKeys.user);
  await storage.set(storageKeys.session, 'anonymous');
}

/**
 * Updates the cached profile without touching the tokens.
 *
 * A profile edit that reaches the server and not the cache is invisible until
 * the next cold start, and then reappears as the *old* name — which reads as
 * the edit having been lost rather than merely uncached.
 */
export async function cacheUser(user: User): Promise<void> {
  await storage.set(storageKeys.user, user);
}

export async function markGuestSession(): Promise<void> {
  await storage.set(storageKeys.session, 'guest');
}
