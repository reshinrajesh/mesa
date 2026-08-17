import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { AppNotification, NotificationKind } from '@/types';

import { Pressable, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { formatRelative } from '@/utils/date';

export const KIND_ICON: Record<NotificationKind, keyof typeof Ionicons.glyphMap> = {
  'reservation-confirmed': 'checkmark-circle-outline',
  'reservation-reminder': 'alarm-outline',
  'reservation-modified': 'create-outline',
  'reservation-cancelled': 'close-circle-outline',
  'upcoming-reservation': 'calendar-outline',
  'restaurant-offer': 'pricetag-outline',
  'waitlist-joined': 'hourglass-outline',
  'waitlist-offer': 'restaurant-outline',
};

export interface NotificationRowProps {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
  onDismiss: (notification: AppNotification) => void;
}

/**
 * One inbox entry.
 *
 * Lifted out of the screen so its two states — read and unread — and its
 * dismiss affordance can be rendered in a test. The screen owns the list, the
 * mutations and the confirmation; this owns what an entry looks like.
 *
 * Dismissal is a visible button rather than a swipe. A swipe is invisible to
 * someone who has never been told it exists and unreachable by a screen reader
 * without a custom action, and this is the only route to an empty inbox.
 */
export const NotificationRow = React.memo(function NotificationRow({
  notification,
  onPress,
  onDismiss,
}: NotificationRowProps) {
  const theme = useTheme();
  const unread = notification.readAt === null;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onPress(notification)}
        accessibilityRole="button"
        accessibilityLabel={`${unread ? 'Unread. ' : ''}${notification.title}. ${notification.body}`}
        scaleTo={0.99}
        dim
        style={[styles.main, { paddingVertical: theme.spacing.base }]}
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
            name={KIND_ICON[notification.kind]}
            size={17}
            color={unread ? theme.colors.accent : theme.colors.inkMuted}
          />
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.titleRow}>
            <Text variant={unread ? 'bodyStrong' : 'body'} style={{ flex: 1 }} numberOfLines={2}>
              {notification.title}
            </Text>
            {/* Unread carries a dot as well as weight, because weight
                alone is not a reliable signal at small sizes. */}
            {unread ? (
              <View style={[styles.unreadDot, { backgroundColor: theme.colors.accent }]} />
            ) : null}
          </View>

          <Text variant="caption" tone="muted" numberOfLines={3}>
            {notification.body}
          </Text>

          <Text variant="caption" tone="faint">
            {formatRelative(notification.createdAt)}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => onDismiss(notification)}
        accessibilityRole="button"
        // Names the entry: a screen reader moving down a list of buttons all
        // labelled "Dismiss" cannot tell which one it is about to remove.
        accessibilityLabel={`Dismiss ${notification.title}`}
        hitSlop={12}
        scaleTo={0.85}
        style={styles.dismiss}
      >
        <Ionicons name="close" size={16} color={theme.colors.inkFaint} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  main: {
    flex: 1,
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
  dismiss: {
    width: 32,
    height: 32,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
