import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import type { AppNotification, NotificationKind } from '@/types';

import {
  Divider,
  EmptyState,
  Pressable,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
} from '@/components/ui';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import { useTheme } from '@/theme';
import { formatRelative } from '@/utils/date';

const KIND_ICON: Record<NotificationKind, keyof typeof Ionicons.glyphMap> = {
  'reservation-confirmed': 'checkmark-circle-outline',
  'reservation-reminder': 'alarm-outline',
  'reservation-modified': 'create-outline',
  'reservation-cancelled': 'close-circle-outline',
  'upcoming-reservation': 'calendar-outline',
  'restaurant-offer': 'pricetag-outline',
  'waitlist-joined': 'hourglass-outline',
  'waitlist-offer': 'restaurant-outline',
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { items, unreadCount, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

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
          renderItem={({ item }) => {
            const unread = item.readAt === null;
            return (
              <Pressable
                onPress={() => open(item)}
                accessibilityRole="button"
                accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title}. ${item.body}`}
                scaleTo={0.99}
                dim
                style={[styles.row, { paddingVertical: theme.spacing.base }]}
              >
                <View
                  style={[
                    styles.glyph,
                    {
                      backgroundColor: unread ? theme.colors.accentSoft : theme.colors.canvasSunk,
                      borderRadius: theme.radius.sm,
                    },
                  ]}
                >
                  <Ionicons
                    name={KIND_ICON[item.kind]}
                    size={17}
                    color={unread ? theme.colors.accent : theme.colors.inkMuted}
                  />
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.titleRow}>
                    <Text
                      variant={unread ? 'bodyStrong' : 'body'}
                      style={{ flex: 1 }}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    {/* Unread carries a dot as well as weight, because weight
                        alone is not a reliable signal at small sizes. */}
                    {unread ? (
                      <View style={[styles.unreadDot, { backgroundColor: theme.colors.accent }]} />
                    ) : null}
                  </View>

                  <Text variant="caption" tone="muted" numberOfLines={3}>
                    {item.body}
                  </Text>

                  <Text variant="caption" tone="faint">
                    {formatRelative(item.createdAt)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title="Nothing to report"
              message="Booking confirmations, reminders and the occasional note from a restaurant land here."
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  glyph: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
