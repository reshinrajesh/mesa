/**
 * Every list endpoint is pagination-shaped from day one so swapping the mock
 * service for a REST/GraphQL one does not change a single call site.
 */
export interface Page<T> {
  items: T[];
  /** Opaque cursor for the next page. `null` when the list is exhausted. */
  nextCursor: string | null;
  total: number;
}

export interface PageParams {
  cursor?: string | null;
  limit?: number;
}

export type SortKey = 'recommended' | 'rating' | 'distance' | 'price' | 'popularity';

export interface RestaurantFilters {
  cuisines: string[];
  priceTiers: number[];
  /** Minimum rating, 0 means "no minimum". */
  minRating: number;
  /** Kilometres. `null` means "any distance". */
  maxDistanceKm: number | null;
  openNow: boolean;
  kinds: string[];
  amenities: string[];
}

export const emptyFilters: RestaurantFilters = {
  cuisines: [],
  priceTiers: [],
  minRating: 0,
  maxDistanceKm: null,
  openNow: false,
  kinds: [],
  amenities: [],
};

export interface SearchRestaurantsParams extends PageParams {
  query?: string;
  filters?: RestaurantFilters;
  sort?: SortKey;
  /** Origin for distance calculation. */
  origin?: { latitude: number; longitude: number } | null;
}
