import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { Reservation, ReservationStatus } from '@/types';

import { SEATING_LABEL } from '@/constants/cuisines';
import { queueLabel } from '@/features/reservations/waitlist';
import { useWaitlistStatus } from '@/hooks/useReservations';
import { restaurantById } from '@/mock/restaurants';
import { useTheme } from '@/theme';
import { daysBetweenKeys, formatDateKeyShort, formatTime, todayKey } from '@/utils/date';
import { formatPartySize, joinMeta } from '@/utils/format';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Pressable } from '@/components/ui/Pressable';
import { SmartImage } from '@/components/ui/SmartImage';
import { Text } from '@/components/ui/Text';

export const STATUS_META: Record<
  ReservationStatus,
  { label: string; tone: BadgeTone; icon: keyof typeof Ionicons.glyphMap }
> = {
  confirmed: { label: 'Confirmed', tone: 'positive', icon: 'checkmark-circle-outline' },
  pending: { label: 'Awaiting venue', tone: 'warning', icon: 'time-outline' },
  waitlisted: { label: 'On the list', tone: 'neutral', icon: 'hourglass-outline' },
  completed: { label: 'Completed', tone: 'neutral', icon: 'checkmark-done-outline' },
  cancelled: { label: 'Cancelled', tone: 'danger', icon: 'close-circle-outline' },
  'no-show': { label: 'No-show', tone: 'danger', icon: 'alert-circle-outline' },
};

export interface ReservationCardProps {
  reservation: Reservation;
  /** Upcoming cards lead with the countdown; past cards lead with the date. */
  emphasis?: 'upcoming' | 'past';
  footer?: React.ReactNode;
}

export const ReservationCard = React.memo(function ReservationCard({
  reservation,
  emphasis = 'upcoming',
  footer,
}: ReservationCardProps) {
  const theme = useTheme();
  const router = useRouter();

  const restaurant = restaurantById.get(reservation.restaurantId);
  const waitlist = useWaitlistStatus(reservation);
  // A waitlist entry with a table waiting is not "on the list" any more — the
  // badge has to say the thing that needs acting on.
  const status =
    waitlist?.state === 'offered'
      ? ({ label: 'Table free', tone: 'accent', icon: 'restaurant-outline' } as const)
      : STATUS_META[reservation.status];
  const daysAway = daysBetweenKeys(todayKey(), reservation.date);

  // "Tonight" is a stronger cue than "Today at 7:30" for something happening
  // in a few hours, and it is the line people scan for on this tab.
  const when =
    emphasis === 'upcoming' && daysAway === 0
      ? `Tonight · ${formatTime(reservation.time)}`
      : `${formatDateKeyShort(reservation.date)} · ${formatTime(reservation.time)}`;

  const detail = joinMeta([
    formatPartySize(reservation.partySize),
    reservation.seating === 'any' ? null : SEATING_LABEL[reservation.seating],
  ]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.hairline,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Pressable
        onPress={() => router.push(`/reservation/${reservation.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${restaurant?.name ?? 'Reservation'}, ${when}, ${detail}, ${status.label}`}
        scaleTo={0.985}
        style={[styles.body, { padding: theme.spacing.base, gap: theme.spacing.md }]}
      >
        <SmartImage
          uri={restaurant?.images[0]}
          fallbackText={restaurant?.name ?? 'Mesa'}
          accessibilityLabel=""
          style={[
            styles.thumb,
            {
              borderRadius: theme.radius.md,
              // A cancelled booking is history; the photo should not still be
              // selling the place.
              opacity: reservation.status === 'cancelled' ? 0.4 : 1,
            },
          ]}
        />

        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.topRow}>
            <Text variant="heading" numberOfLines={1} style={{ flex: 1, fontSize: 17 }}>
              {restaurant?.name ?? 'Reservation'}
            </Text>
            <Badge label={status.label} tone={status.tone} />
          </View>

          <Text variant="bodyStrong" numberOfLines={1}>
            {when}
          </Text>

          <Text variant="caption" tone="muted" numberOfLines={1}>
            {detail}
          </Text>

          {waitlist ? (
            <Text
              variant="caption"
              tone={waitlist.state === 'offered' ? 'accent' : 'muted'}
              numberOfLines={1}
            >
              {waitlist.state === 'offered'
                ? `Held for ${waitlist.minutesLeft} more minute${waitlist.minutesLeft === 1 ? '' : 's'}`
                : waitlist.state === 'lapsed'
                  ? 'Still on the list'
                  : queueLabel(waitlist.position)}
            </Text>
          ) : emphasis === 'upcoming' && daysAway > 0 && daysAway <= 7 ? (
            <Text variant="caption" tone="accent">
              in {daysAway} day{daysAway === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {footer ? (
        <View
          style={[
            styles.footer,
            {
              borderTopColor: theme.colors.hairline,
              paddingHorizontal: theme.spacing.base,
              paddingVertical: theme.spacing.sm,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumb: {
    width: 72,
    height: 72,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
