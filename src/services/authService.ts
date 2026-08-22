import type { AuthTokens, User } from '@/types';
import type { AuthService } from './contracts';

import { mockUser } from '@/mock/seed';
import { AppError } from '@/utils/errors';
import { localId } from '@/utils/id';
import { storage, storageKeys } from '@/utils/storage';
import { simulate } from './latency';
import { clearSession, markGuestSession, persistSession, readSession } from './session';

/**
 * Mock authentication.
 *
 * The important part of this file is not the fake sign-in, it is where things
 * are stored — and that now lives in `./session.ts`, shared with the HTTP
 * implementation, because the token/profile split is the half that must not
 * differ between them.
 *
 * The credentials below authenticate against nothing. There is no secret here
 * to leak, which is itself deliberate: a client bundle is not a safe place for
 * one.
 */

const DEMO_EMAIL = 'alex.marques@example.com';
const DEMO_PASSWORD = 'mesa1234';

/** The OTP the mock always accepts, printed on the OTP screen in dev. */
export const DEMO_OTP = '482913';

function mintTokens(): AuthTokens {
  return {
    accessToken: `mock.access.${localId('t')}`,
    refreshToken: `mock.refresh.${localId('t')}`,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
}

function maskDestination(destination: string): string {
  if (destination.includes('@')) {
    const [name, domain] = destination.split('@');
    return `${name.slice(0, 2)}${'•'.repeat(Math.max(2, name.length - 2))}@${domain}`;
  }
  return `${'•'.repeat(Math.max(0, destination.length - 4))}${destination.slice(-4)}`;
}

export const authService: AuthService = {
  async restore() {
    const session = await readSession();
    // The mock has no /auth/me to fall back on, so a session with a token but
    // no cached profile is not one it can complete.
    if (session.kind === 'authenticated' && !session.user) {
      return { user: null, kind: 'anonymous' as const };
    }
    return session;
  },

  async signIn(email, password) {
    return simulate(async () => {
      const matches =
        email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
      // Any other well-formed credential also signs in, so the demo is not a
      // password-guessing exercise. A real API would reject here.
      if (!matches && password.length < 8) throw new AppError('auth-failed');

      const user: User = matches
        ? mockUser
        : { ...mockUser, id: localId('usr'), email: email.trim().toLowerCase() };
      const tokens = mintTokens();
      await persistSession(user, tokens);
      return { user, tokens };
    }, 900);
  },

  async signUp(input) {
    return simulate(async () => {
      const user: User = {
        id: localId('usr'),
        name: input.name.trim(),
        // An account registered by phone has no address to show, and inventing
        // one to fill the field would put a mailbox nobody owns on a profile.
        email: input.email?.trim().toLowerCase() ?? '',
        phone: input.phone.trim(),
        favoriteCuisines: [],
        dietary: [],
        savedPlaces: [],
        createdAt: new Date().toISOString(),
      };
      const tokens = mintTokens();
      await persistSession(user, tokens);
      return { user, tokens };
    }, 1100);
  },

  async requestPasswordReset(email) {
    return simulate(() => ({ sentTo: maskDestination(email.trim()) }), 800);
  },

  async requestOtp(destination) {
    return simulate(
      () => ({ sentTo: maskDestination(destination.trim()), expiresInSeconds: 60 }),
      700,
    );
  },

  async verifyOtp(destination, code) {
    return simulate(async () => {
      if (code !== DEMO_OTP) {
        throw new AppError('validation', {
          message: 'That code did not match. Check the digits and try again.',
          fields: { code: 'Incorrect code' },
        });
      }
      const user: User = destination.includes('@')
        ? { ...mockUser, email: destination.trim().toLowerCase() }
        : { ...mockUser, phone: destination.trim() };
      const tokens = mintTokens();
      await persistSession(user, tokens);
      return { user, tokens };
    }, 900);
  },

  async signInWithProvider(provider) {
    return simulate(async () => {
      const user: User = {
        ...mockUser,
        id: `usr_${provider}`,
        name: provider === 'apple' ? 'Alex M.' : mockUser.name,
      };
      const tokens = mintTokens();
      await persistSession(user, tokens);
      return { user, tokens };
    }, 1200);
  },

  async continueAsGuest() {
    await markGuestSession();
    await simulate(() => undefined, 150);
  },

  async signOut() {
    await clearSession();
    await simulate(() => undefined, 200);
  },

  async updateProfile(patch) {
    return simulate(async () => {
      const current = await storage.get<User | null>(storageKeys.user, null);
      if (!current) throw new AppError('unauthorized');
      const next: User = { ...current, ...patch };
      await storage.set(storageKeys.user, next);
      return next;
    }, 500);
  },
};
