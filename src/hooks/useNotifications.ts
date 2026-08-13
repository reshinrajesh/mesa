import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { NotificationPreferences } from '@/types';

import { queryKeys } from '@/constants/queryKeys';
import { notificationService } from '@/services';

export function useNotifications() {
  const query = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => notificationService.getNotifications(),
    staleTime: 60 * 1000,
  });

  // Memoised together: a fresh `[]` fallback on every render would otherwise
  // invalidate the count on each pass.
  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const unreadCount = useMemo(() => items.filter((n) => n.readAt === null).length, [items]);

  return { ...query, items, unreadCount };
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}

export function useNotificationPreferences() {
  const client = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: () => notificationService.getPreferences(),
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: (next: NotificationPreferences) => notificationService.setPreferences(next),
    // Toggles must feel instant; a switch that lags reads as broken.
    onMutate: async (next) => {
      await client.cancelQueries({ queryKey: queryKeys.notifications.preferences() });
      const previous = client.getQueryData(queryKeys.notifications.preferences());
      client.setQueryData(queryKeys.notifications.preferences(), next);
      return { previous };
    },
    onError: (_error, _next, context) => {
      if (context?.previous) {
        client.setQueryData(queryKeys.notifications.preferences(), context.previous);
      }
    },
  });

  return { preferences: query.data, isLoading: query.isLoading, update: mutation.mutate };
}
