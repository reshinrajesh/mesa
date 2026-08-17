import type { FavoriteService } from './contracts';

import { request } from './http';

/**
 * Favourites, server-side.
 *
 * `PUT` rather than `POST` for adding, because saving a restaurant twice is the
 * same outcome as saving it once: the store's optimistic toggle can fire a
 * second request on a flaky connection, and an idempotent verb makes that a
 * non-event rather than a duplicate row.
 *
 * The ids come back as a bare array. Rollback stays where it already is, in
 * `favoritesStore` — the heart has to flip back on the card that was tapped,
 * and only the store knows which one that was.
 */
export const favoriteServiceHttp: FavoriteService = {
  getFavoriteIds() {
    return request<string[]>('/favorites');
  },

  async addFavorite(restaurantId) {
    await request<void>(`/favorites/${encodeURIComponent(restaurantId)}`, { method: 'PUT' });
  },

  async removeFavorite(restaurantId) {
    await request<void>(`/favorites/${encodeURIComponent(restaurantId)}`, { method: 'DELETE' });
  },
};
