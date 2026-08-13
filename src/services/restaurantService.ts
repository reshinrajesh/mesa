import type {
  AvailabilityDay,
  Coordinates,
  Menu,
  Page,
  RestaurantWithContext,
  SearchRestaurantsParams,
} from '@/types';
import type { RestaurantCollections, RestaurantService } from './contracts';

import { config } from '@/constants/config';
import { emptyFilters } from '@/types';
import { generateAvailability } from '@/mock/availability';
import { genericMenu, menuByRestaurantId } from '@/mock/menus';
import { mockRestaurants, restaurantById } from '@/mock/restaurants';
import { applyFilters, decorate, matchesQuery, sortRestaurants } from '@/features/restaurants/query';
import { AppError } from '@/utils/errors';
import { daysBetweenKeys, todayKey } from '@/utils/date';
import { favoriteService } from './favoriteService';
import { paginate, simulate } from './latency';

/**
 * Mock implementation of `RestaurantService`.
 *
 * Reads mock modules; performs the filtering/sorting the server would do. Every
 * method returns exactly the shape the HTTP implementation will, which is the
 * whole point — the screens cannot tell the difference.
 */

async function favoriteSet(): Promise<Set<string>> {
  return new Set(await favoriteService.getFavoriteIds());
}

async function decorateAll(origin: Coordinates | null): Promise<RestaurantWithContext[]> {
  const favorites = await favoriteSet();
  const now = new Date();
  return mockRestaurants.map((restaurant) => decorate(restaurant, origin, favorites, now));
}

async function runQuery(params: SearchRestaurantsParams): Promise<Page<RestaurantWithContext>> {
  const { query = '', filters = emptyFilters, sort = 'recommended', origin = null } = params;

  let results = await decorateAll(origin ?? null);
  if (query.trim()) results = results.filter((r) => matchesQuery(r, query));
  results = applyFilters(results, filters);
  results = sortRestaurants(results, sort);

  return paginate(results, params.cursor, params.limit ?? config.pageSize);
}

export const restaurantService: RestaurantService = {
  async getRestaurants(params) {
    return simulate(() => runQuery(params));
  },

  async searchRestaurants(query, params = {}) {
    return simulate(() => runQuery({ ...params, query }));
  },

  async getRestaurantById(id) {
    return simulate(async () => {
      const restaurant = restaurantById.get(id);
      if (!restaurant) throw new AppError('not-found', { debugMessage: `no restaurant ${id}` });
      const favorites = await favoriteSet();
      return decorate(restaurant, null, favorites);
    });
  },

  async getSuggestions(query) {
    return simulate(() => {
      const q = query.trim().toLowerCase();
      if (!q) return [];

      const restaurants = mockRestaurants
        .filter((r) => r.name.toLowerCase().includes(q))
        .slice(0, 4)
        .map((r) => ({ label: r.name, kind: 'restaurant' as const, value: r.id }));

      const cuisines = Array.from(new Set(mockRestaurants.flatMap((r) => r.cuisines)))
        .filter((c) => c.includes(q))
        .slice(0, 3)
        .map((c) => ({ label: c, kind: 'cuisine' as const, value: c }));

      const places = Array.from(new Set(mockRestaurants.map((r) => r.neighbourhood)))
        .filter((n) => n.toLowerCase().includes(q))
        .slice(0, 3)
        .map((n) => ({ label: n, kind: 'place' as const, value: n }));

      return [...restaurants, ...cuisines, ...places];
    }, 90);
  },

  async getCollections(origin): Promise<RestaurantCollections> {
    return simulate(async () => {
      const all = await decorateAll(origin);
      const today = todayKey();

      const byDistance = sortRestaurants(all, 'distance');
      const byRating = sortRestaurants(all, 'rating');
      const byPopularity = sortRestaurants(all, 'popularity');

      return {
        popularNearYou: (origin ? byDistance : byPopularity).slice(0, 8),
        recommended: sortRestaurants(all, 'recommended').slice(0, 8),
        trendingCafes: byPopularity
          .filter((r) => r.kind === 'cafe' || r.cuisines.includes('cafe') || r.cuisines.includes('bakery'))
          .slice(0, 8),
        topRated: byRating.slice(0, 8),
        newlyOpened: [...all]
          .filter((r) => daysBetweenKeys(r.openedAt, today) < 900)
          .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
          .slice(0, 8),
        availableTonight: all.filter((r) => r.isOpenNow && r.nextSlots.length > 0).slice(0, 8),
      };
    });
  },

  async getMenu(restaurantId): Promise<Menu> {
    return simulate(() => {
      const existing = menuByRestaurantId.get(restaurantId);
      if (existing) return existing;
      const restaurant = restaurantById.get(restaurantId);
      if (!restaurant) throw new AppError('not-found', { debugMessage: `no menu for ${restaurantId}` });
      return genericMenu(restaurant.id, restaurant.name, restaurant.currency);
    });
  },

  async getAvailability(restaurantId, date, guests): Promise<AvailabilityDay> {
    return simulate(() => {
      const restaurant = restaurantById.get(restaurantId);
      if (!restaurant) {
        throw new AppError('restaurant-unavailable', { debugMessage: `no restaurant ${restaurantId}` });
      }
      return generateAvailability(restaurant, date, guests);
    });
  },

  async getAllForMap() {
    return simulate(() => mockRestaurants, 100);
  },
};
