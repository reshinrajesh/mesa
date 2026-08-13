import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SeatingPreference } from '@/types';

import { DateRail } from '@/components/reservation/DateRail';
import { SlotPicker } from '@/components/reservation/SlotPicker';
import { SEATING_OPTIONS } from '@/constants/cuisines';
import { config } from '@/constants/config';
import {
  Button,
  Chip,
  EmptyState,
  Screen,
  ScreenHeader,
  Skeleton,
  Stepper,
  Text,
} from '@/components/ui';
import { useReservation, useUpdateReservation } from '@/hooks/useReservations';
import { useAvailability, useRestaurant } from '@/hooks/useRestaurants';
import { useTheme } from '@/theme';
import { formatDateKeyLong, formatTime } from '@/utils/date';
import { formatPartySize } from '@/utils/format';

/**
 * Edit a booking.
 *
 * Everything on one screen rather than reusing the wizard: the user already
 * knows what they booked and is changing one thing. Walking them through five
 * steps again to move a table by half an hour would be absurd.
 *
 * "Save" stays disabled until something actually differs, so nobody sends a
 * pointless update to the restaurant.
 */
export default function EditReservationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: reservation, isLoading } = useReservation(id);
  const { data: restaurant } = useRestaurant(reservation?.restaurantId);
  const update = useUpdateReservation();

  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [seating, setSeating] = useState<SeatingPreference>('any');

  useEffect(() => {
    if (!reservation) return;
    setDate(reservation.date);
    setTime(reservation.time);
    setPartySize(reservation.partySize);
    setSeating(reservation.seating);
  }, [reservation]);

  const availability = useAvailability(reservation?.restaurantId, date, partySize);

  const maxParty = Math.min(config.maxPartySizeOnline, restaurant?.maxPartySize ?? 12);

  const changed =
    Boolean(reservation) &&
    (date !== reservation!.date ||
      time !== reservation!.time ||
      partySize !== reservation!.partySize ||
      seating !== reservation!.seating);

  if (isLoading || !reservation) {
    return (
      <Screen>
        <ScreenHeader title="Change booking" />
        <View style={{ padding: theme.screenGutter, gap: theme.spacing.base }}>
          <Skeleton height={80} radius={theme.radius.md} />
          <Skeleton height={160} radius={theme.radius.md} />
        </View>
      </Screen>
    );
  }

  const save = () => {
    if (!date || !time) return;
    update.mutate(
      { id: reservation.id, date, time, partySize, seating },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Change booking" subtitle={restaurant?.name} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: theme.layout.stickyBarHeight + insets.bottom + theme.spacing.xl,
          gap: theme.spacing.xl,
        }}
      >
        <View
          style={[
            styles.current,
            {
              marginHorizontal: theme.screenGutter,
              backgroundColor: theme.colors.canvasSunk,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <Ionicons name="information-circle-outline" size={17} color={theme.colors.inkMuted} />
          <Text variant="caption" tone="muted" style={{ flex: 1 }}>
            Currently {formatDateKeyLong(reservation.date)} at {formatTime(reservation.time)} for{' '}
            {formatPartySize(reservation.partySize)}.
          </Text>
        </View>

        <Section title="Date">
          <DateRail value={date} onChange={(next) => { setDate(next); setTime(null); }} />
        </Section>

        <Section title="Guests" padded>
          <Stepper
            value={partySize}
            min={1}
            max={maxParty}
            onChange={(next) => {
              setPartySize(next);
              setTime(null);
            }}
            unit={partySize === 1 ? 'guest' : 'guests'}
            accessibilityLabel="Number of guests"
          />
        </Section>

        <Section title="Time" padded>
          {availability.isLoading ? (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} width={88} height={44} radius={theme.radius.sm} />
              ))}
            </View>
          ) : availability.data?.closedReason ? (
            <EmptyState
              icon="calendar-outline"
              title="Not that day"
              message={availability.data.closedReason}
              compact
            />
          ) : (
            <SlotPicker slots={availability.data?.slots ?? []} value={time} onChange={setTime} />
          )}
        </Section>

        <Section title="Seating" padded>
          <View style={styles.wrap}>
            {SEATING_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                icon={option.icon as never}
                size="sm"
                selected={seating === option.value}
                onPress={() => setSeating(option.value)}
              />
            ))}
          </View>
        </Section>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: theme.screenGutter,
            paddingBottom: insets.bottom + theme.spacing.md,
            backgroundColor: theme.colors.canvas,
            borderTopColor: theme.colors.hairline,
          },
        ]}
      >
        <Button
          label={changed ? 'Save changes' : 'Nothing changed yet'}
          size="lg"
          fullWidth
          disabled={!changed || !time}
          loading={update.isPending}
          onPress={save}
        />
      </View>
    </Screen>
  );
}

function Section({
  title,
  children,
  padded = false,
}: {
  title: string;
  children: React.ReactNode;
  padded?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <Text variant="overline" tone="faint" style={{ paddingHorizontal: theme.screenGutter }}>
        {title}
      </Text>
      <View style={padded ? { paddingHorizontal: theme.screenGutter } : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  current: {
    flexDirection: 'row',
    gap: 9,
    padding: 13,
    alignItems: 'flex-start',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
