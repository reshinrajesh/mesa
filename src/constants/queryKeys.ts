import type { SearchRestaurantsParams } from '@/types';

/**
 * The one query-key factory. Every `useQuery` in the app pulls its key from
 * here, so an invalidation can never miss a cache entry because two call sites
 * spelled the same key differently.
 */
export const queryKeys = {
  restaurants: {
    all: ['restaurants'] as const,
    list: (params: SearchRestaurantsParams) => ['restaurants', 'list', params] as const,
    detail: (id: string) => ['restaurants', 'detail', id] as const,
    menu: (id: string) => ['restaurants', 'menu', id] as const,
    collections: (origin: string) => ['restaurants', 'collections', origin] as const,
    availability: (id: string, date: string, partySize: number) =>
      ['restaurants', 'availability', id, date, partySize] as const,
    suggestions: (query: string) => ['restaurants', 'suggestions', query] as const,
  },
  reservations: {
    all: ['reservations'] as const,
    list: () => ['reservations', 'list'] as const,
    detail: (id: string) => ['reservations', 'detail', id] as const,
  },
  bills: {
    all: ['bills'] as const,
    forReservation: (reservationId: string) => ['bills', 'reservation', reservationId] as const,
  },
  orders: {
    all: ['orders'] as const,
    forReservation: (reservationId: string) => ['orders', 'reservation', reservationId] as const,
  },
  favorites: {
    all: ['favorites'] as const,
    ids: () => ['favorites', 'ids'] as const,
  },
  reviews: {
    all: ['reviews'] as const,
    forRestaurant: (id: string) => ['reviews', 'restaurant', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: () => ['notifications', 'list'] as const,
    preferences: () => ['notifications', 'preferences'] as const,
  },
  recommendations: {
    forYou: (signature: string) => ['recommendations', 'for-you', signature] as const,
  },
} as const;
