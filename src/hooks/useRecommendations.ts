import { useMemo } from 'react';

import type { Occasion, RestaurantWithContext } from '@/types';

import { recommend, suitableForOccasion, type ScoredRestaurant } from '@/features/recommendations/engine';
import { useAuthStore } from '@/store/authStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useUiStore } from '@/store/uiStore';
import { useReservations } from './useReservations';

/**
 * Binds the recommendation engine to live app state.
 *
 * Everything it needs is already cached, so this is pure computation and adds
 * no request. It re-runs when favourites, history or the hour changes.
 */
export function useRecommendations(pool: RestaurantWithContext[], limit = 8): ScoredRestaurant[] {
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const recentlyViewed = useUiStore((s) => s.recentlyViewed);
  const user = useAuthStore((s) => s.user);
  const { past } = useReservations();

  return useMemo(
    () =>
      recommend(
        pool,
        {
          favoriteIds,
          preferredCuisines: user?.favoriteCuisines ?? [],
          history: past,
          recentlyViewed,
          hourOfDay: new Date().getHours(),
        },
        limit,
      ),
    [pool, favoriteIds, user?.favoriteCuisines, past, recentlyViewed, limit],
  );
}

export function useOccasionSuggestions(
  pool: RestaurantWithContext[],
  occasion: Occasion,
): RestaurantWithContext[] {
  return useMemo(() => suitableForOccasion(pool, occasion), [pool, occasion]);
}
