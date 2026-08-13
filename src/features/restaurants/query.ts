import type {
  Coordinates,
  Restaurant,
  RestaurantFilters,
  RestaurantWithContext,
  SortKey,
} from '@/types';

import { previewSlots } from '@/mock/availability';
import { distanceKm } from '@/utils/geo';
import { getOpenState } from './openingHours';

/**
 * Pure query logic: decorate → filter → sort.
 *
 * Lives here rather than in the service so it can be unit-tested without any
 * async plumbing, and so a real API that returns the same shapes can reuse the
 * client-side sorting for cached pages.
 */

export function decorate(
  restaurant: Restaurant,
  origin: Coordinates | null,
  favoriteIds: ReadonlySet<string>,
  now = new Date(),
): RestaurantWithContext {
  const openState = getOpenState(restaurant, now);
  return {
    ...restaurant,
    distanceKm: origin ? distanceKm(origin, restaurant.coordinates) : null,
    isOpenNow: openState.isOpen,
    minutesUntilStatusChange: openState.minutesUntilChange,
    isFavorite: favoriteIds.has(restaurant.id),
    nextSlots: previewSlots(restaurant),
  };
}

/** Case- and accent-insensitive match, so "cafe" finds "Café Pombal". */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function matchesQuery(restaurant: RestaurantWithContext, query: string): boolean {
  const q = normalise(query.trim());
  if (!q) return true;
  const haystack = normalise(
    [
      restaurant.name,
      restaurant.tagline,
      restaurant.neighbourhood,
      restaurant.city,
      restaurant.kind,
      ...restaurant.cuisines,
      ...restaurant.amenities,
    ].join(' '),
  );
  // Every whitespace-separated term must appear, so "italian chiado" narrows.
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

export function applyFilters(
  restaurants: RestaurantWithContext[],
  filters: RestaurantFilters,
): RestaurantWithContext[] {
  return restaurants.filter((restaurant) => {
    if (filters.cuisines.length > 0) {
      if (!restaurant.cuisines.some((c) => filters.cuisines.includes(c))) return false;
    }
    if (filters.priceTiers.length > 0 && !filters.priceTiers.includes(restaurant.priceTier)) {
      return false;
    }
    if (filters.minRating > 0 && restaurant.rating < filters.minRating) return false;
    if (filters.kinds.length > 0 && !filters.kinds.includes(restaurant.kind)) return false;
    if (filters.openNow && !restaurant.isOpenNow) return false;
    if (
      filters.maxDistanceKm !== null &&
      restaurant.distanceKm !== null &&
      restaurant.distanceKm > filters.maxDistanceKm
    ) {
      return false;
    }
    if (filters.amenities.length > 0) {
      // AND, not OR: someone who checks "outdoor" and "pet friendly" wants both.
      if (!filters.amenities.every((a) => restaurant.amenities.includes(a as never))) return false;
    }
    return true;
  });
}

export function countActiveFilters(filters: RestaurantFilters): number {
  return (
    filters.cuisines.length +
    filters.priceTiers.length +
    filters.kinds.length +
    filters.amenities.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.maxDistanceKm !== null ? 1 : 0) +
    (filters.openNow ? 1 : 0)
  );
}

/**
 * "Recommended" is a blend rather than a single column, because sorting purely
 * by rating puts a 4.9 with 40 reviews above a 4.7 with 2,000 and users read
 * that as the list being wrong.
 */
function recommendedScore(restaurant: RestaurantWithContext): number {
  const ratingWeight = (restaurant.rating - 3.5) / 1.5; // 0-1 across the realistic band
  const confidence = Math.min(1, restaurant.reviewCount / 1200);
  const popularity = restaurant.popularityScore / 100;
  const proximity =
    restaurant.distanceKm === null ? 0.5 : Math.max(0, 1 - restaurant.distanceKm / 8);
  const openBonus = restaurant.isOpenNow ? 0.08 : 0;

  return ratingWeight * 0.4 * confidence + popularity * 0.3 + proximity * 0.3 + openBonus;
}

export function sortRestaurants(
  restaurants: RestaurantWithContext[],
  sort: SortKey,
): RestaurantWithContext[] {
  const copy = [...restaurants];
  switch (sort) {
    case 'rating':
      return copy.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case 'distance':
      return copy.sort((a, b) => {
        // Unknown distance sinks rather than sorting as zero.
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    case 'price':
      return copy.sort((a, b) => a.priceTier - b.priceTier || b.rating - a.rating);
    case 'popularity':
      return copy.sort((a, b) => b.popularityScore - a.popularityScore);
    case 'recommended':
    default:
      return copy.sort((a, b) => recommendedScore(b) - recommendedScore(a));
  }
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Rating' },
  { value: 'distance', label: 'Distance' },
  { value: 'price', label: 'Price' },
  { value: 'popularity', label: 'Popularity' },
];
