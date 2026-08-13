import { create } from 'zustand';

import { favoriteService } from '@/services';
import { haptics } from '@/utils/haptics';
import { log } from '@/utils/log';

/**
 * Favourites, optimistic by design.
 *
 * The heart flips the instant it is tapped and the write happens behind it. A
 * failed write rolls back and the toast explains why — but the common case,
 * which is a successful write, never makes anyone watch a spinner on a heart.
 */

interface FavoritesState {
  ids: Set<string>;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => Promise<boolean>;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set<string>(),
  hydrated: false,

  async hydrate() {
    try {
      const ids = await favoriteService.getFavoriteIds();
      set({ ids: new Set(ids), hydrated: true });
    } catch (error) {
      log.warn('favorites', 'hydrate failed', error);
      set({ hydrated: true });
    }
  },

  isFavorite(id) {
    return get().ids.has(id);
  },

  async toggle(id) {
    const current = get().ids;
    const wasFavorite = current.has(id);

    // A new Set each time: mutating in place would not trigger a re-render.
    const optimistic = new Set(current);
    if (wasFavorite) optimistic.delete(id);
    else optimistic.add(id);
    set({ ids: optimistic });
    haptics.bump();

    try {
      if (wasFavorite) await favoriteService.removeFavorite(id);
      else await favoriteService.addFavorite(id);
      return !wasFavorite;
    } catch (error) {
      set({ ids: current });
      log.warn('favorites', 'toggle failed, rolled back', error);
      throw error;
    }
  },

  clear() {
    set({ ids: new Set<string>() });
  },
}));

export const selectFavoriteCount = (s: FavoritesState) => s.ids.size;
