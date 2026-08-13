import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { RestaurantFilters, SearchRestaurantsParams, SortKey } from '@/types';

import { queryKeys } from '@/constants/queryKeys';
import { restaurantService } from '@/services';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useUiStore } from '@/store/uiStore';

/**
 * Read hooks for restaurant data.
 *
 * Favourite state is layered on top of the cached query result rather than
 * being part of the cached payload. That way toggling a heart re-renders the
 * card and nothing else — no cache write, no refetch, no list reshuffle.
 */

export function useRestaurantCollections() {
  const location = useUiStore((s) => s.location);
  const favoriteIds = useFavoritesStore((s) => s.ids);

  const query = useQuery({
    queryKey: queryKeys.restaurants.collections(`${location.latitude},${location.longitude}`),
    queryFn: () =>
      restaurantService.getCollections({
        latitude: location.latitude,
        longitude: location.longitude,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo(() => {
    if (!query.data) return undefined;
    const withFavorites = <T extends { id: string }>(list: T[]) =>
      list.map((item) => ({ ...item, isFavorite: favoriteIds.has(item.id) }));
    return {
      popularNearYou: withFavorites(query.data.popularNearYou),
      recommended: withFavorites(query.data.recommended),
      trendingCafes: withFavorites(query.data.trendingCafes),
      topRated: withFavorites(query.data.topRated),
      newlyOpened: withFavorites(query.data.newlyOpened),
      availableTonight: withFavorites(query.data.availableTonight),
    };
  }, [query.data, favoriteIds]);

  return { ...query, data };
}

export function useRestaurantSearch(params: {
  query: string;
  filters: RestaurantFilters;
  sort: SortKey;
  enabled?: boolean;
}) {
  const location = useUiStore((s) => s.location);
  const favoriteIds = useFavoritesStore((s) => s.ids);

  const searchParams: SearchRestaurantsParams = useMemo(
    () => ({
      query: params.query,
      filters: params.filters,
      sort: params.sort,
      origin: { latitude: location.latitude, longitude: location.longitude },
      limit: 40,
    }),
    [params.query, params.filters, params.sort, location.latitude, location.longitude],
  );

  const query = useQuery({
    queryKey: queryKeys.restaurants.list(searchParams),
    queryFn: () => restaurantService.getRestaurants(searchParams),
    enabled: params.enabled ?? true,
    staleTime: 60 * 1000,
    // Keeps the previous list on screen while a new filter loads, so the screen
    // does not flash to a skeleton on every chip tap.
    placeholderData: (previous) => previous,
  });

  const items = useMemo(
    () => (query.data?.items ?? []).map((r) => ({ ...r, isFavorite: favoriteIds.has(r.id) })),
    [query.data, favoriteIds],
  );

  return { ...query, items, total: query.data?.total ?? 0 };
}

export function useRestaurant(id: string | undefined) {
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const location = useUiStore((s) => s.location);

  const query = useQuery({
    queryKey: queryKeys.restaurants.detail(id ?? ''),
    queryFn: () => restaurantService.getRestaurantById(id!),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo(() => {
    if (!query.data) return undefined;
    return {
      ...query.data,
      isFavorite: favoriteIds.has(query.data.id),
      // Distance is device state, not server state, so it is applied here.
      distanceKm: query.data.distanceKm ?? distanceFrom(location, query.data.coordinates),
    };
  }, [query.data, favoriteIds, location]);

  return { ...query, data };
}

function distanceFrom(
  origin: { latitude: number; longitude: number },
  target: { latitude: number; longitude: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(target.latitude - origin.latitude);
  const dLon = toRad(target.longitude - origin.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(toRad(origin.latitude)) * Math.cos(toRad(target.latitude));
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function useMenu(restaurantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.restaurants.menu(restaurantId ?? ''),
    queryFn: () => restaurantService.getMenu(restaurantId!),
    enabled: Boolean(restaurantId),
    staleTime: 30 * 60 * 1000,
  });
}

export function useAvailability(
  restaurantId: string | undefined,
  date: string | null,
  partySize: number,
) {
  return useQuery({
    queryKey: queryKeys.restaurants.availability(restaurantId ?? '', date ?? '', partySize),
    queryFn: () => restaurantService.getAvailability(restaurantId!, date!, partySize),
    enabled: Boolean(restaurantId && date),
    // Availability genuinely moves. Thirty seconds keeps it honest without
    // refetching on every step of the wizard.
    staleTime: 30 * 1000,
  });
}

export function useSuggestions(query: string) {
  return useQuery({
    queryKey: queryKeys.restaurants.suggestions(query),
    queryFn: () => restaurantService.getSuggestions(query),
    enabled: query.trim().length > 1,
    staleTime: 60 * 1000,
  });
}

export function useMapRestaurants() {
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const location = useUiStore((s) => s.location);

  const query = useQuery({
    queryKey: ['restaurants', 'map'],
    queryFn: () => restaurantService.getAllForMap(),
    staleTime: 10 * 60 * 1000,
  });

  const items = useMemo(
    () =>
      (query.data ?? []).map((r) => ({
        ...r,
        isFavorite: favoriteIds.has(r.id),
        distanceKm: distanceFrom(location, r.coordinates),
      })),
    [query.data, favoriteIds, location],
  );

  return { ...query, items };
}
