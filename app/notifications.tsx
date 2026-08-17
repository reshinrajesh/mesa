import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, View } from 'react-native';

import type { AppNotification } from '@/types';

import { NotificationRow } from '@/components/notification/NotificationRow';
import {
  ConfirmDialog,
  Divider,
  EmptyState,
  Pressable,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
} from '@/components/ui';
import { readCount } from '@/features/notifications/inbox';
import {
  useClearReadNotifications,
  useDismissNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import { useTheme } from '@/theme';

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { items, unreadCount, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const dismiss = useDismissNotification();
  const clearRead = useClearReadNotifications();

  const [confirmingClear, setConfirmingClear] = React.useState(false);
  const clearable = readCount(items);

  const open = (notification: AppNotification) => {
    if (notification.readAt === null) markRead.mutate(notification.id);
    if (notification.href) router.push(notification.href as never);
  };

  return (
    <Screen>
      <ScreenHeader
        title="Notifications"
        right={
          unreadCount > 0 ? (
            <Pressable
              onPress={() => markAllRead.mutate()}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
              hitSlop={10}
              style={{ minHeight: 40, justifyContent: 'center' }}
            >
              <Text variant="label" tone="accent">
                Mark all read
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {isLoading ? (
        <View style={{ padding: theme.screenGutter, gap: theme.spacing.base }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={62} radius={theme.radius.md} />
          ))}
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: theme.screenGutter,
            paddingBottom: theme.spacing.xxxl,
          }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <Divider inset={48} />}
          renderItem={({ item }) => (
            <NotificationRow
              notification={item}
              onPress={open}
              onDismiss={(notification) => dismiss.mutate(notification)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title="Nothing to report"
              message="Booking confirmations, reminders and the occasional note from a restaurant land here."
            />
          }
          /* Below the list rather than in the header: a bulk delete should not
             sit under the finger that has just tapped "Mark all read". */
          ListFooterComponent={
            clearable > 0 ? (
              <Pressable
                onPress={() => setConfirmingClear(true)}
                accessibilityRole="button"
                accessibilityLabel={
                  clearable === 1
                    ? 'Clear one read notification'
                    : `Clear ${clearable} read notifications`
                }
                hitSlop={8}
                style={{
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: theme.spacing.lg,
                }}
              >
                <Text variant="label" tone="muted">
                  Clear read notifications
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}

      <ConfirmDialog
        visible={confirmingClear}
        title={clearable === 1 ? 'Clear one notification?' : `Clear ${clearable} notifications?`}
        // States what survives, because the thing people fear about a bulk
        // delete is the one entry they had not got to yet.
        message={
          unreadCount > 0
            ? `Everything you have already read goes. ${unreadCount === 1 ? 'The unread one stays' : `The ${unreadCount} unread ones stay`}.`
            : 'Everything you have already read goes. This cannot be undone.'
        }
        confirmLabel="Clear"
        cancelLabel="Keep them"
        destructive
        loading={clearRead.isPending}
        onConfirm={() => {
          clearRead.mutate();
          setConfirmingClear(false);
        }}
        onCancel={() => setConfirmingClear(false)}
      />
    </Screen>
  );
}
