import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { AppNotification, NotificationPreferences, Page } from '@/types';

import { queryKeys } from '@/constants/queryKeys';
import { dismiss as dismissFrom, restore as restoreInto } from '@/features/notifications/inbox';
import { notificationService } from '@/services';
import { toast } from '@/store/uiStore';
import { toAppError } from '@/utils/errors';

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

/** The cached page, edited in place so a dismissal shows before the write lands. */
function patchList(
  client: ReturnType<typeof useQueryClient>,
  edit: (items: AppNotification[]) => AppNotification[],
) {
  client.setQueryData(
    queryKeys.notifications.list(),
    (old: Page<AppNotification> | undefined) => (old ? { ...old, items: edit(old.items) } : old),
  );
}

/**
 * Dismiss one entry, optimistically, with an undo.
 *
 * The undo is what earns the missing confirmation dialog: a row that vanishes
 * on one tap is only acceptable if one more tap brings it back, and restoring
 * it puts it back in date order rather than at the top — see `inbox.restore`.
 */
export function useDismissNotification() {
  const client = useQueryClient();

  const undo = async (notification: AppNotification) => {
    patchList(client, (items) => restoreInto(items, notification));
    try {
      await notificationService.restore(notification);
    } catch (error) {
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    }
    await client.invalidateQueries({ queryKey: queryKeys.notifications.all });
  };

  return useMutation({
    mutationFn: (notification: AppNotification) => notificationService.dismiss(notification.id),

    onMutate: async (notification) => {
      await client.cancelQueries({ queryKey: queryKeys.notifications.all });
      const previous = client.getQueryData(queryKeys.notifications.list());
      patchList(client, (items) => dismissFrom(items, notification.id));
      return { previous };
    },

    onError: (error, _notification, context) => {
      if (context?.previous) {
        client.setQueryData(queryKeys.notifications.list(), context.previous);
      }
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    },

    onSuccess: (_result, notification) => {
      toast({
        title: 'Dismissed',
        tone: 'neutral',
        action: { label: 'Undo', onPress: () => void undo(notification) },
      });
    },

    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}

/**
 * Clear everything already read.
 *
 * No undo here, a confirmation instead: the two are alternatives, and an undo
 * toast that has to name a dozen restored entries says nothing useful. Unread
 * entries are not touched — that is the policy, and `inbox.clearRead` is where
 * it is written down.
 */
export function useClearReadNotifications() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.clearRead(),

    onError: (error) => {
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    },

    onSuccess: (count) => {
      toast({
        title: count === 1 ? 'Cleared one notification' : `Cleared ${count} notifications`,
        tone: 'neutral',
      });
    },

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
