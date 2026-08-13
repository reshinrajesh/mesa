import { create } from 'zustand';

import type { ActiveLocation } from '@/services';

import { fallbackLocation, locationService } from '@/services';
import { storage, storageKeys } from '@/utils/storage';

/**
 * Ambient UI state: the active location, the recently-viewed list, and toasts.
 *
 * Toasts live in a store rather than a context because they are raised from
 * mutation callbacks and error handlers that are nowhere near a provider.
 */

export interface Toast {
  id: string;
  title: string;
  message?: string;
  tone: 'neutral' | 'positive' | 'danger';
  /** Optional single action, e.g. "Undo". */
  action?: { label: string; onPress: () => void };
}

interface UiState {
  location: ActiveLocation;
  locationResolved: boolean;
  recentlyViewed: string[];
  toasts: Toast[];

  hydrate: () => Promise<void>;
  useDeviceLocation: () => Promise<boolean>;
  setLocation: (location: ActiveLocation) => void;

  markViewed: (restaurantId: string) => void;
  clearRecentlyViewed: () => void;

  toast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const MAX_RECENT = 10;
let toastSeq = 0;

export const useUiStore = create<UiState>((set, get) => ({
  location: fallbackLocation,
  locationResolved: false,
  recentlyViewed: [],
  toasts: [],

  async hydrate() {
    const [stored, recentlyViewed] = await Promise.all([
      storage.get<ActiveLocation | null>(storageKeys.activeLocation, null),
      storage.get<string[]>(storageKeys.recentlyViewed, []),
    ]);
    set({
      location: stored ?? fallbackLocation,
      recentlyViewed,
      locationResolved: stored !== null,
    });
  },

  async useDeviceLocation() {
    const resolved = await locationService.requestCurrent();
    if (!resolved) {
      // Refusal is a normal answer. Keep the fallback and stop asking.
      set({ locationResolved: true });
      return false;
    }
    set({ location: resolved, locationResolved: true });
    void storage.set(storageKeys.activeLocation, resolved);
    return true;
  },

  setLocation(location) {
    set({ location, locationResolved: true });
    void storage.set(storageKeys.activeLocation, location);
  },

  markViewed(restaurantId) {
    const next = [restaurantId, ...get().recentlyViewed.filter((id) => id !== restaurantId)].slice(
      0,
      MAX_RECENT,
    );
    set({ recentlyViewed: next });
    void storage.set(storageKeys.recentlyViewed, next);
  },

  clearRecentlyViewed() {
    set({ recentlyViewed: [] });
    void storage.remove(storageKeys.recentlyViewed);
  },

  toast(toast) {
    toastSeq += 1;
    const id = `toast_${toastSeq}`;
    set({ toasts: [...get().toasts, { ...toast, id }] });
    setTimeout(() => get().dismissToast(id), toast.action ? 6000 : 3600);
  },

  dismissToast(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

/** Raise a toast from anywhere, including non-React code. */
export const toast = (input: Omit<Toast, 'id'>) => useUiStore.getState().toast(input);
