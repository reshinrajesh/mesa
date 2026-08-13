import type { FavoriteService } from './contracts';

import { seedFavoriteIds } from '@/mock/seed';
import { storage, storageKeys } from '@/utils/storage';
import { simulate } from './latency';

/**
 * Favourites, persisted locally.
 *
 * A first run seeds three saved venues so the Favourites tab has something to
 * be. The seed only applies when nothing has ever been written — clearing your
 * favourites and reopening the app must leave them cleared, not resurrect them.
 */

const SEEDED_FLAG = 'mesa.favorites-seeded';

async function read(): Promise<string[]> {
  const seeded = await storage.get<boolean>(SEEDED_FLAG, false);
  if (!seeded) {
    await storage.set(storageKeys.favorites, seedFavoriteIds);
    await storage.set(SEEDED_FLAG, true);
    return [...seedFavoriteIds];
  }
  return storage.get<string[]>(storageKeys.favorites, []);
}

export const favoriteService: FavoriteService = {
  async getFavoriteIds() {
    return simulate(() => read(), 120);
  },

  async addFavorite(restaurantId) {
    const current = await read();
    if (!current.includes(restaurantId)) {
      await storage.set(storageKeys.favorites, [restaurantId, ...current]);
    }
    await simulate(() => undefined, 140);
  },

  async removeFavorite(restaurantId) {
    const current = await read();
    await storage.set(
      storageKeys.favorites,
      current.filter((id) => id !== restaurantId),
    );
    await simulate(() => undefined, 140);
  },
};
