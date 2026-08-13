import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { WaitlistStatus } from '@/features/reservations/waitlist';

import { config } from '@/constants/config';
import { queueLabel } from '@/features/reservations/waitlist';
import { useTheme } from '@/theme';
import { formatTime } from '@/utils/date';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

export interface WaitlistCardProps {
  status: WaitlistStatus;
  /** The sitting queued for, e.g. "19:30". */
  time: string;
  restaurantName: string;
  onAccept?: () => void;
  accepting?: boolean;
}

/**
 * Where a waitlist entry stands, and the one thing to do about it.
 *
 * The three states are drawn as three different cards rather than one card with
 * a changing line, because they ask for completely different things:
 *
 *   queued   — nothing to do. The card is quiet, neutral, and says so.
 *   offered  — a table is being held and will go to someone else. This is the
 *              only place in the app where a countdown is justified, and the
 *              only card here that carries the accent.
 *   lapsed   — the hold ran out. It says what happened without blaming the
 *              user, and confirms the entry is still live, because the first
 *              thing anyone assumes is that they have lost their place.
 *
 * Reading it aloud: `accessibilityLiveRegion` is deliberately absent. The
 * position changes on a timer, and a screen reader interrupting every few
 * seconds to re-read a queue is worse than silence. The offer arrives as a
 * system notification, which announces itself properly.
 */
export function WaitlistCard({
  status,
  time,
  restaurantName,
  onAccept,
  accepting = false,
}: WaitlistCardProps) {
  const theme = useTheme();

  if (status.state === 'offered') {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.accentSoft,
            borderColor: theme.colors.accent,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.base,
            gap: theme.spacing.md,
          },
        ]}
      >
        <View style={styles.headline}>
          <Ionicons name="restaurant-outline" size={18} color={theme.colors.accent} />
          <Text variant="bodyStrong" tone="accent" style={{ flex: 1 }}>
            A table came free
          </Text>
        </View>

        <Text variant="body" tone="muted">
          {restaurantName} is holding {formatTime(time)} for you. It goes to the next party in{' '}
          <Text variant="bodyStrong" tone="accent">
            {status.minutesLeft} minute{status.minutesLeft === 1 ? '' : 's'}
          </Text>
          .
        </Text>

        {onAccept ? (
          <Button
            label="Take the table"
            size="lg"
            fullWidth
            loading={accepting}
            onPress={onAccept}
          />
        ) : null}
      </View>
    );
  }

  if (status.state === 'lapsed') {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.canvasSunk,
            borderColor: theme.colors.hairline,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.base,
            gap: theme.spacing.sm,
          },
        ]}
      >
        <View style={styles.headline}>
          <Ionicons name="hourglass-outline" size={17} color={theme.colors.inkMuted} />
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            That table went to the next party
          </Text>
        </View>
        <Text variant="body" tone="muted">
          The hold ran out before it was confirmed. You are still on the list for{' '}
          {formatTime(time)} — if another table frees up, it comes to you first.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.hairline,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.base,
          gap: theme.spacing.sm,
        },
      ]}
    >
      <View style={styles.headline}>
        <Ionicons name="people-outline" size={17} color={theme.colors.inkMuted} />
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {queueLabel(status.position)}
        </Text>
      </View>
      <Text variant="body" tone="muted">
        You are on the list for {formatTime(time)}. Nothing is held yet — we will notify you the
        moment a table frees, and hold it for {config.waitlist.holdMinutes} minutes while you
        decide.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  headline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
