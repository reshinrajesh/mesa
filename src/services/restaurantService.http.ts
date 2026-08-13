import type {
  AvailabilityDay,
  Menu,
  Page,
  Restaurant,
  RestaurantWithContext,
  SearchRestaurantsParams,
} from '@/types';
import type { RestaurantCollections, RestaurantService } from './contracts';

import { request } from './http';

/**
 * The real restaurant service.
 *
 * Written against `contracts.ts` and nothing else, which is the whole point of
 * the seam: this file and `restaurantService.ts` are interchangeable, and no
 * screen, hook or store can tell which one it is talking to.
 *
 * Two things it deliberately does not do.
 *
 * It does not decorate. `distanceKm`, `isOpenNow` and `nextSlots` are computed
 * by the mock because the mock is standing in for a server; here the server
 * sends them. If a real backend turns out not to, the fix is to run
 * `features/restaurants/query.decorate` over the response in this file — one
 * place, and the shape the UI receives never changes.
 *
 * It does not translate errors. `request()` already maps every status onto an
 * `AppError` with written copy, so a 409 on a booking surfaces as "That time
 * just went" whether it came from here or from the mock's own rules.
 */

/**
 * Filters go over the wire as repeated scalars rather than a nested object,
 * because that is what a query string can actually express. Arrays are
 * comma-joined; empty ones are dropped rather than sent as `""`, which most
 * backends would read as "match the empty string".
 */
function filterParams(params: SearchRestaurantsParams): Record<string, string | number | undefined> {
  const { filters, origin } = params;

  const list = (values: (string | number)[] | undefined) =>
    values && values.length > 0 ? values.join(',') : undefined;

  return {
    query: params.query || undefined,
    sort: params.sort,
    cursor: params.cursor ?? undefined,
    limit: params.limit,
    cuisines: list(filters?.cuisines),
    priceTiers: list(filters?.priceTiers),
    kinds: list(filters?.kinds),
    amenities: list(filters?.amenities),
    minRating: filters?.minRating || undefined,
    maxDistanceKm: filters?.maxDistanceKm ?? undefined,
    openNow: filters?.openNow ? 'true' : undefined,
    lat: origin?.latitude,
    lng: origin?.longitude,
  };
}

export const restaurantServiceHttp: RestaurantService = {
  getRestaurants(params) {
    return request<Page<RestaurantWithContext>>('/restaurants', {
      params: filterParams(params),
      // Browsing works signed out; sending a token here would make the
      // anonymous case the unusual path rather than the normal one.
      authenticated: false,
    });
  },

  getRestaurantById(id) {
    return request<RestaurantWithContext>(`/restaurants/${encodeURIComponent(id)}`, {
      authenticated: false,
    });
  },

  searchRestaurants(query, params = {}) {
    return request<Page<RestaurantWithContext>>('/restaurants', {
      params: filterParams({ ...params, query }),
      authenticated: false,
    });
  },

  getSuggestions(query) {
    return request<{ label: string; kind: 'restaurant' | 'cuisine' | 'place'; value: string }[]>(
      '/restaurants/suggestions',
      { params: { q: query }, authenticated: false },
    );
  },

  getCollections(origin) {
    return request<RestaurantCollections>('/restaurants/collections', {
      params: { lat: origin?.latitude, lng: origin?.longitude },
      authenticated: false,
    });
  },

  getMenu(restaurantId) {
    return request<Menu>(`/restaurants/${encodeURIComponent(restaurantId)}/menu`, {
      authenticated: false,
    });
  },

  getAvailability(restaurantId, date, guests) {
    return request<AvailabilityDay>(
      `/restaurants/${encodeURIComponent(restaurantId)}/availability`,
      { params: { date, guests }, authenticated: false },
    );
  },

  getAllForMap() {
    return request<Restaurant[]>('/restaurants/map', { authenticated: false });
  },
};
