import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Linking, RefreshControl, StyleSheet, View } from 'react-native';

import type { Reservation } from '@/types';

import { ReservationCard } from '@/components/reservation/ReservationCard';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Pressable,
  Screen,
  SegmentedControl,
  Skeleton,
  Text,
} from '@/components/ui';
import { useCancelReservation, useReservations } from '@/hooks/useReservations';
import { restaurantById } from '@/mock/restaurants';
import { useReservationDraftStore } from '@/store/reservationDraftStore';
import { useTheme } from '@/theme';
import { addDaysToKey, todayKey } from '@/utils/date';
import { directionsUrl } from '@/utils/geo';

/**
 * Reservations.
 *
 * Upcoming and Past are genuinely different objects, not one list filtered:
 * upcoming rows carry live actions (directions, modify, cancel) and past rows
 * carry retrospective ones (book again, rate). Sharing one row component and
 * hiding half the buttons produces a row that is mostly disabled controls.
 */
export default function ReservationsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { upcoming, past, isLoading, isError, error, refetch } = useReservations();
  const cancel = useCancelReservation();
  const startEdit = useReservationDraftStore((s) => s.startEdit);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const data = tab === 'upcoming' ? upcoming : past;

  const openDirections = (reservation: Reservation) => {
    const restaurant = restaurantById.get(reservation.restaurantId);
    if (!restaurant) return;
    void Linking.openURL(directionsUrl(restaurant.coordinates, restaurant.name));
  };

  const rebook = (reservation: Reservation) => {
    // Same table, same party, next week — the draft opens on Review, not on
    // step one, because everything is already known.
    startEdit('', {
      restaurantId: reservation.restaurantId,
      date: addDaysToKey(todayKey(), 7),
      partySize: reservation.partySize,
      time: reservation.time,
      seating: reservation.seating,
      occasion: 'none',
      notes: '',
    });
    router.push({
      pathname: '/reserve/[restaurantId]',
      params: { restaurantId: reservation.restaurantId, rebook: '1' },
    });
  };

  return (
    <Screen>
      <View style={{ paddingHorizontal: theme.screenGutter, paddingTop: theme.spacing.md, gap: theme.spacing.base }}>
        <Text variant="title">Your bookings</Text>

        <SegmentedControl
          options={[
            { value: 'upcoming', label: 'Upcoming', badge: upcoming.length || undefined },
            { value: 'past', label: 'Past' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <View style={{ padding: theme.screenGutter, gap: theme.spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={112} radius={theme.radius.lg} />
          ))}
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: theme.screenGutter,
            paddingBottom: theme.spacing.xxxl,
            gap: theme.spacing.md,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.inkMuted}
              colors={[theme.colors.accent]}
            />
          }
          renderItem={({ item }) => (
            <ReservationCard
              reservation={item}
              emphasis={tab}
              footer={
                // A waitlist entry has nowhere to give directions to yet and
                // nothing to modify — it has one sitting and one decision.
                tab === 'upcoming' && item.status === 'waitlisted' ? (
                  <View style={styles.actions}>
                    <RowAction
                      icon="hourglass-outline"
                      label="See my place"
                      onPress={() => router.push(`/reservation/${item.id}`)}
                    />
                    <RowAction
                      icon="close-outline"
                      label="Leave the list"
                      destructive
                      onPress={() => setCancelTarget(item)}
                    />
                  </View>
                ) : tab === 'upcoming' && item.status !== 'cancelled' ? (
                  <View style={styles.actions}>
                    <RowAction
                      icon="navigate-outline"
                      label="Directions"
                      onPress={() => openDirections(item)}
                    />
                    <RowAction
                      icon="create-outline"
                      label="Modify"
                      onPress={() => router.push(`/reservation/${item.id}/edit`)}
                    />
                    <RowAction
                      icon="close-outline"
                      label="Cancel"
                      destructive
                      onPress={() => setCancelTarget(item)}
                    />
                  </View>
                ) : tab === 'past' ? (
                  <View style={styles.actions}>
                    <RowAction
                      icon="repeat-outline"
                      label="Book again"
                      onPress={() => rebook(item)}
                    />
                    {item.status === 'completed' && !item.reviewId ? (
                      <RowAction
                        icon="star-outline"
                        label="Rate"
                        onPress={() => router.push(`/reservation/${item.id}`)}
                      />
                    ) : null}
                  </View>
                ) : null
              }
            />
          )}
          ListEmptyComponent={
            tab === 'upcoming' ? (
              <EmptyState
                icon="calendar-outline"
                title="No tables booked"
                message="When you reserve somewhere it shows up here, with the code you give at the door."
                action={{ label: 'Find a table', onPress: () => router.push('/(tabs)/explore') }}
              />
            ) : (
              <EmptyState
                icon="time-outline"
                title="Nothing here yet"
                message="Past bookings live here once the evening is over, so you can rebook a good one in two taps."
              />
            )
          }
        />
      )}

      <ConfirmDialog
        visible={cancelTarget !== null}
        title={cancelTarget?.status === 'waitlisted' ? 'Leave this waitlist?' : 'Cancel this booking?'}
        message={
          !cancelTarget
            ? ''
            : cancelTarget.status === 'waitlisted'
              ? 'Your place goes to the next party and cannot be got back. You can join again, but at the end of the list.'
              : `${restaurantById.get(cancelTarget.restaurantId)?.name ?? 'The restaurant'} will be told the table is free. Nothing is charged, and you can book again any time.`
        }
        confirmLabel={cancelTarget?.status === 'waitlisted' ? 'Leave the list' : 'Cancel booking'}
        cancelLabel={cancelTarget?.status === 'waitlisted' ? 'Stay on it' : 'Keep it'}
        destructive
        loading={cancel.isPending}
        onConfirm={() => {
          if (!cancelTarget) return;
          cancel.mutate({
            id: cancelTarget.id,
            waitlisted: cancelTarget.status === 'waitlisted',
          });
          setCancelTarget(null);
        }}
        onCancel={() => setCancelTarget(null)}
      />
    </Screen>
  );
}

function RowAction({
  icon,
  label,
  onPress,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  const tint = destructive ? theme.colors.danger : theme.colors.ink;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      scaleTo={0.95}
      style={styles.action}
    >
      <Ionicons name={icon} size={16} color={tint} />
      <Text variant="label" style={{ color: tint }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 10,
  },
});
