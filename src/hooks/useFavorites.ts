import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type { RestaurantWithContext } from '@/types';

import { queryKeys } from '@/constants/queryKeys';
import { decorate } from '@/features/restaurants/query';
import { restaurantService } from '@/services';
import { useFavoritesStore } from '@/store/favoritesStore';
import { toast, useUiStore } from '@/store/uiStore';
import { toAppError } from '@/utils/errors';

/** Toggle with rollback and an undo affordance. */
export function useToggleFavorite() {
  const toggle = useFavoritesStore((s) => s.toggle);

  return useCallback(
    async (restaurantId: string, restaurantName?: string) => {
      try {
        const nowFavorite = await toggle(restaurantId);
        if (!nowFavorite && restaurantName) {
          toast({
            title: `Removed ${restaurantName}`,
            tone: 'neutral',
            action: { label: 'Undo', onPress: () => void toggle(restaurantId) },
          });
        }
        return nowFavorite;
      } catch (error) {
        const app = toAppError(error);
        toast({ title: app.title, message: app.message, tone: 'danger' });
        return null;
      }
    },
    [toggle],
  );
}

/** The Favourites tab: saved ids resolved to full records, order preserved. */
export function useFavoriteRestaurants() {
  const ids = useFavoritesStore((s) => s.ids);
  const location = useUiStore((s) => s.location);

  const query = useQuery({
    queryKey: queryKeys.favorites.ids(),
    queryFn: () => restaurantService.getAllForMap(),
    staleTime: 10 * 60 * 1000,
  });

  const items = useMemo<RestaurantWithContext[]>(() => {
    const all = query.data ?? [];
    const now = new Date();
    // Order follows the saved list (newest first), not the catalogue order.
    const order = Array.from(ids);
    return all
      .filter((r) => ids.has(r.id))
      .map((r) => decorate(r, location, ids, now))
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }, [query.data, ids, location]);

  return { ...query, items };
}
