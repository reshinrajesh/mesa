import { create } from 'zustand';

import type { SessionKind, User } from '@/types';

import { authService } from '@/services';
import { toAppError } from '@/utils/errors';

/**
 * Authentication state only: who is signed in and whether the app has finished
 * asking. Profile editing lives in `userStore`, favourites in `favoritesStore`.
 * Keeping them apart means a profile edit does not re-render every screen that
 * only cares whether someone is signed in.
 */

interface AuthState {
  kind: SessionKind;
  user: User | null;
  /** False until `restore()` has run once. Gates the splash screen. */
  hydrated: boolean;
  pending: boolean;

  restore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    name: string;
    phone: string;
    password: string;
    email?: string;
  }) => Promise<void>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<void>;
  verifyOtp: (destination: string, code: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  kind: 'anonymous',
  user: null,
  hydrated: false,
  pending: false,

  async restore() {
    try {
      const { user, kind } = await authService.restore();
      set({ user, kind, hydrated: true });
    } catch {
      // A broken stored session is not worth an error screen on launch.
      set({ user: null, kind: 'anonymous', hydrated: true });
    }
  },

  async signIn(email, password) {
    set({ pending: true });
    try {
      const { user } = await authService.signIn(email, password);
      set({ user, kind: 'authenticated' });
    } catch (error) {
      throw toAppError(error);
    } finally {
      set({ pending: false });
    }
  },

  async signUp(input) {
    set({ pending: true });
    try {
      const { user } = await authService.signUp(input);
      set({ user, kind: 'authenticated' });
    } catch (error) {
      throw toAppError(error);
    } finally {
      set({ pending: false });
    }
  },

  async signInWithProvider(provider) {
    set({ pending: true });
    try {
      const { user } = await authService.signInWithProvider(provider);
      set({ user, kind: 'authenticated' });
    } catch (error) {
      throw toAppError(error);
    } finally {
      set({ pending: false });
    }
  },

  async verifyOtp(destination, code) {
    set({ pending: true });
    try {
      const { user } = await authService.verifyOtp(destination, code);
      set({ user, kind: 'authenticated' });
    } catch (error) {
      throw toAppError(error);
    } finally {
      set({ pending: false });
    }
  },

  async continueAsGuest() {
    await authService.continueAsGuest();
    set({ user: null, kind: 'guest' });
  },

  async signOut() {
    await authService.signOut();
    set({ user: null, kind: 'anonymous' });
  },

  setUser(user) {
    set({ user });
  },
}));

/** Selectors — components subscribe to one field, not the whole store. */
export const selectIsAuthenticated = (s: AuthState) => s.kind === 'authenticated';
export const selectIsGuest = (s: AuthState) => s.kind === 'guest';
