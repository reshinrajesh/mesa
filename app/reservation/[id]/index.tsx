import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, View } from 'react-native';

import { QrCode } from '@/components/reservation/QrCode';
import { STATUS_META } from '@/components/reservation/ReservationCard';
import { WaitlistCard } from '@/components/reservation/WaitlistCard';
import { RateSheet } from '@/features/reservations/RateSheet';
import { OCCASION_LABEL, SEATING_LABEL } from '@/constants/cuisines';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Divider,
  ErrorState,
  Pressable,
  Screen,
  ScreenHeader,
  Skeleton,
  SmartImage,
  Text,
} from '@/components/ui';
import {
  useAcceptWaitlistOffer,
  useCancelReservation,
  useReservation,
  useWaitlistStatus,
} from '@/hooks/useReservations';
import { canOrder } from '@/features/orders/cart';
import { useBill } from '@/hooks/useBill';
import { useRestaurant } from '@/hooks/useRestaurants';
import { useReservationDraftStore } from '@/store/reservationDraftStore';
import { useTheme } from '@/theme';
import { addDaysToKey, combine, formatDateKeyLong, formatTime, todayKey } from '@/utils/date';
import { formatPaise } from '@/features/payments/bill';
import { formatPartySize } from '@/utils/format';
import { directionsUrl } from '@/utils/geo';

/**
 * Reservation detail.
 *
 * The QR sits at the top for upcoming bookings and disappears for past ones —
 * a code you cannot use any more is clutter. Below it, the actions available
 * depend on the status, and the two-hour lock is explained in words rather than
 * expressed as a disabled button with no reason attached.
 */
export default function ReservationDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: reservation, isLoading, isError, error, refetch } = useReservation(id);
  const { data: restaurant } = useRestaurant(reservation?.restaurantId);
  const cancel = useCancelReservation();
  const accept = useAcceptWaitlistOffer();
  const waitlist = useWaitlistStatus(reservation);
  const startEdit = useReservationDraftStore((s) => s.startEdit);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const { bill } = useBill(id);
  const orderable = canOrder(reservation, todayKey());

  if (isError) {
    return (
      <Screen>
        <ScreenHeader title="Booking" />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  if (isLoading || !reservation) {
    return (
      <Screen>
        <ScreenHeader title="Booking" />
        <View style={{ padding: theme.screenGutter, gap: theme.spacing.base }}>
          <Skeleton height={200} radius={theme.radius.lg} />
          <Skeleton height={120} radius={theme.radius.lg} />
        </View>
      </Screen>
    );
  }

  const status = STATUS_META[reservation.status];
  const sitting = combine(reservation.date, reservation.time).getTime();
  const queued = reservation.status === 'waitlisted';
  const isUpcoming =
    reservation.status === 'confirmed' || reservation.status === 'pending';
  const locked = sitting - Date.now() < 2 * 3_600_000;

  const rebook = () => {
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
      <ScreenHeader
        title="Your booking"
        right={
          <Pressable
            onPress={() =>
              Share.share({
                message: `${restaurant?.name} — ${formatDateKeyLong(reservation.date)} at ${formatTime(
                  reservation.time,
                )} for ${formatPartySize(reservation.partySize)}.${
                  // A shared waitlist entry says it is one. "Booking code
                  // undefined" is the classic way an optional field escapes.
                  reservation.code
                    ? ` Booking code ${reservation.code}.`
                    : ' On the waitlist — not booked yet.'
                }`,
              }).catch(() => {})
            }
            accessibilityRole="button"
            accessibilityLabel="Share booking"
            hitSlop={10}
            scaleTo={0.88}
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.hairline },
            ]}
          >
            <Ionicons name="share-outline" size={18} color={theme.colors.ink} />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.base,
        }}
      >
        {waitlist ? (
          <WaitlistCard
            status={waitlist}
            time={reservation.time}
            restaurantName={restaurant?.name ?? 'The restaurant'}
            accepting={accept.isPending}
            onAccept={
              waitlist.state === 'offered' ? () => accept.mutate(reservation.id) : undefined
            }
            onTryAnotherTime={() =>
              router.push({
                pathname: '/reserve/[restaurantId]',
                params: { restaurantId: reservation.restaurantId },
              })
            }
          />
        ) : null}

        {isUpcoming ? (
          <Card style={{ alignItems: 'center', gap: theme.spacing.md }}>
            <Badge label={status.label} tone={status.tone} icon={status.icon} />
            <QrCode value={`mesa:reservation:${reservation.code}`} size={156} />
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text variant="overline" tone="faint">
                Booking code
              </Text>
              <Text variant="display" style={{ fontSize: 28, letterSpacing: 4 }}>
                {reservation.code}
              </Text>
            </View>
          </Card>
        ) : null}

        <Pressable
          onPress={() => router.push(`/restaurant/${reservation.restaurantId}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${restaurant?.name}`}
          scaleTo={0.99}
        >
          <Card padded={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <SmartImage
                uri={restaurant?.images[0]}
                fallbackText={restaurant?.name ?? 'Mesa'}
                accessibilityLabel=""
                style={{ width: 88, height: 88 }}
              />
              <View style={{ flex: 1, padding: theme.spacing.base, gap: 3 }}>
                <Text variant="heading" numberOfLines={1}>
                  {restaurant?.name}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={2}>
                  {restaurant?.address}
                </Text>
              </View>
              <View style={{ paddingRight: theme.spacing.base }}>
                <Ionicons name="chevron-forward" size={17} color={theme.colors.inkFaint} />
              </View>
            </View>
          </Card>
        </Pressable>

        <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
          {!isUpcoming && !queued ? (
            <>
              <DetailRow label="Status" value={status.label} />
              <Divider />
            </>
          ) : null}
          <DetailRow label="Date" value={formatDateKeyLong(reservation.date)} />
          <Divider />
          <DetailRow label="Time" value={formatTime(reservation.time)} />
          <Divider />
          <DetailRow label="Guests" value={formatPartySize(reservation.partySize)} />
          <Divider />
          <DetailRow label="Seating" value={SEATING_LABEL[reservation.seating]} />
          {reservation.occasion !== 'none' ? (
            <>
              <Divider />
              <DetailRow label="Occasion" value={OCCASION_LABEL[reservation.occasion]} />
            </>
          ) : null}
          {reservation.notes ? (
            <>
              <Divider />
              <DetailRow label="Your note" value={reservation.notes} multiline />
            </>
          ) : null}
        </Card>

        {reservation.venueMessage ? (
          <Card style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' }}>
            <Ionicons name="chatbubble-outline" size={18} color={theme.colors.accent} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text variant="overline" tone="faint">
                From the restaurant
              </Text>
              <Text variant="body" tone="muted">
                {reservation.venueMessage}
              </Text>
            </View>
          </Card>
        ) : null}

        {queued ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Button
              label="Call the restaurant"
              variant="secondary"
              fullWidth
              icon="call-outline"
              onPress={() => Linking.openURL(`tel:${restaurant?.phone}`).catch(() => {})}
            />
            <Button
              label="Leave the waitlist"
              variant="danger"
              fullWidth
              onPress={() => setCancelOpen(true)}
            />
          </View>
        ) : isUpcoming ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Button
              label="Directions"
              variant="secondary"
              fullWidth
              icon="navigate-outline"
              onPress={() => {
                if (!restaurant) return;
                void Linking.openURL(directionsUrl(restaurant.coordinates, restaurant.name));
              }}
            />
            <Button
              label="Call the restaurant"
              variant="secondary"
              fullWidth
              icon="call-outline"
              onPress={() => Linking.openURL(`tel:${restaurant?.phone}`).catch(() => {})}
            />

            {locked ? (
              <View
                style={[
                  styles.notice,
                  { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radius.md },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={16} color={theme.colors.warning} />
                <Text variant="caption" tone="warning" style={{ flex: 1 }}>
                  Changes close two hours before the sitting. Call {restaurant?.name} directly if
                  something has come up.
                </Text>
              </View>
            ) : (
              <>
                <Button
                  label="Change this booking"
                  variant="secondary"
                  fullWidth
                  icon="create-outline"
                  onPress={() => router.push(`/reservation/${reservation.id}/edit`)}
                />
                <Button
                  label="Cancel booking"
                  variant="danger"
                  fullWidth
                  onPress={() => setCancelOpen(true)}
                />
              </>
            )}
          </View>
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            {/*
              The bill leads, when there is one. An unpaid bill is the only
              thing on a finished booking that somebody else is waiting on, and
              burying it under "Book this again" would be optimistic about
              which of the two the guest opened this screen for.
            */}
            {bill && bill.status === 'open' ? (
              <Button
                label={`Pay the bill · ${formatPaise(bill.total)}`}
                fullWidth
                icon="card-outline"
                onPress={() => router.push(`/reservation/${reservation.id}/bill`)}
              />
            ) : null}
            {bill && bill.status === 'paid' ? (
              <Button
                label="See the receipt"
                variant="secondary"
                fullWidth
                icon="receipt-outline"
                onPress={() => router.push(`/reservation/${reservation.id}/bill`)}
              />
            ) : null}
            {/*
              Ordering, on the day. It is above "Book this again" for the same
              reason the bill is: on the night itself it is the only thing on
              this screen anybody is here to do.
            */}
            {orderable ? (
              <Button
                label="Order at the table"
                fullWidth
                icon="restaurant-outline"
                onPress={() => router.push(`/reservation/${reservation.id}/order`)}
              />
            ) : null}
            <Button
              label="Book this again"
              variant={bill && bill.status === 'open' ? 'secondary' : 'primary'}
              fullWidth
              icon="repeat-outline"
              onPress={rebook}
            />
            {reservation.status === 'completed' && !reservation.reviewId ? (
              <Button
                label="Rate your evening"
                variant="secondary"
                fullWidth
                icon="star-outline"
                onPress={() => setRateOpen(true)}
              />
            ) : null}
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={cancelOpen}
        title={queued ? 'Leave this waitlist?' : 'Cancel this booking?'}
        message={
          queued
            ? `Your place goes to the next party and cannot be got back. You can join the list again, but you would start at the end of it.`
            : `${restaurant?.name} will be told the table is free. Nothing is charged, and you can book again any time.`
        }
        confirmLabel={queued ? 'Leave the list' : 'Cancel booking'}
        cancelLabel={queued ? 'Stay on it' : 'Keep it'}
        destructive
        loading={cancel.isPending}
        onConfirm={() => {
          cancel.mutate(
            { id: reservation.id, waitlisted: queued },
            { onSuccess: () => setCancelOpen(false) },
          );
        }}
        onCancel={() => setCancelOpen(false)}
      />

      <RateSheet
        visible={rateOpen}
        onClose={() => setRateOpen(false)}
        reservation={reservation}
        restaurantName={restaurant?.name ?? 'this restaurant'}
      />
    </Screen>
  );
}

function DetailRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { paddingVertical: theme.spacing.md }]}>
      <Text variant="label" tone="muted" style={{ width: 88 }}>
        {label}
      </Text>
      <Text variant="body" style={{ flex: 1 }} numberOfLines={multiline ? 4 : 1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 48,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  notice: {
    flexDirection: 'row',
    gap: 9,
    padding: 13,
    alignItems: 'flex-start',
  },
});
