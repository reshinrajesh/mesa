import type { AuthTokens, User } from '@/types';
import type { AuthService } from './contracts';

import { log } from '@/utils/log';
import { request } from './http';
import { cacheUser, clearSession, markGuestSession, persistSession, readSession } from './session';

/**
 * Real authentication.
 *
 * The server decides who someone is; the device decides where that fact is
 * kept, and `./session.ts` owns the second half for both implementations.
 *
 * Two rules this file exists to hold. Sign-out clears the device *whatever the
 * server says* — a network failure must never leave a live credential on a
 * phone whose owner has just asked to be signed out. And `restore` never
 * invents a session: a token with no cached profile is completed from
 * `/auth/me`, and if that call fails the session is anonymous rather than
 * half-signed-in.
 */

interface Credentialed {
  user: User;
  tokens: AuthTokens;
}

/** Every entry point ends the same way, so none of them can forget to. */
async function accept(result: Credentialed): Promise<Credentialed> {
  await persistSession(result.user, result.tokens);
  return result;
}

export const authServiceHttp: AuthService = {
  async restore() {
    const session = await readSession();
    if (session.kind !== 'authenticated' || session.user) return session;

    // A token survived but the profile cache did not — a reinstall of the app
    // data, or a write that lost a race with a crash. The token is the thing
    // that matters, so ask who it belongs to rather than throwing it away.
    try {
      const user = await request<User>('/auth/me');
      return { user, kind: 'authenticated' as const };
    } catch (error) {
      log.warn('auth', 'token would not resolve to a profile', error);
      await clearSession();
      return { user: null, kind: 'anonymous' as const };
    }
  },

  async signIn(email, password) {
    return accept(
      await request<Credentialed>('/auth/sign-in', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), password },
        // Nothing to authenticate with yet, and sending a stale token to a
        // sign-in endpoint is how you get a confusing 401.
        authenticated: false,
      }),
    );
  },

  async signUp(input) {
    return accept(
      await request<Credentialed>('/auth/sign-up', {
        method: 'POST',
        // An absent email is sent as absent rather than as an empty string:
        // the server treats "" as "they typed nothing" either way, but only
        // one of those is what the client actually knows.
        body: {
          ...input,
          email: input.email?.trim().toLowerCase() || undefined,
          phone: input.phone?.trim() || undefined,
        },
        authenticated: false,
      }),
    );
  },

  requestPasswordReset(email) {
    return request<{ sentTo: string }>('/auth/password-reset', {
      method: 'POST',
      body: { email: email.trim().toLowerCase() },
      authenticated: false,
    });
  },

  requestOtp(destination) {
    return request<{ sentTo: string; expiresInSeconds: number }>('/auth/otp', {
      method: 'POST',
      body: { destination: destination.trim() },
      authenticated: false,
    });
  },

  async verifyOtp(destination, code) {
    return accept(
      await request<Credentialed>('/auth/otp/verify', {
        method: 'POST',
        body: { destination: destination.trim(), code },
        authenticated: false,
      }),
    );
  },

  async signInWithProvider(provider) {
    // The provider SDK's own token would be posted here; the app has no client
    // ids yet, so the endpoint shape is what exists.
    return accept(
      await request<Credentialed>(`/auth/provider/${provider}`, {
        method: 'POST',
        authenticated: false,
      }),
    );
  },

  async continueAsGuest() {
    await markGuestSession();
  },

  async signOut() {
    try {
      await request<void>('/auth/sign-out', { method: 'POST' });
    } catch (error) {
      // Deliberately swallowed. The server's session record outliving the
      // device's is a housekeeping problem; the reverse is a security one.
      log.warn('auth', 'server sign-out failed, clearing the device anyway', error);
    }
    await clearSession();
  },

  async updateProfile(patch) {
    const user = await request<User>('/auth/me', { method: 'PATCH', body: patch });
    await cacheUser(user);
    return user;
  },
};
