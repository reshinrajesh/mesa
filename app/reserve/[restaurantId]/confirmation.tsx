import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { QrCode } from '@/components/reservation/QrCode';
import { config } from '@/constants/config';
import { OCCASION_LABEL, SEATING_LABEL } from '@/constants/cuisines';
import { queueLabel } from '@/features/reservations/waitlist';
import { Button, Card, Divider, Screen, Text } from '@/components/ui';
import { useReservation } from '@/hooks/useReservations';
import { useRestaurant } from '@/hooks/useRestaurants';
import { useReservationDraftStore } from '@/store/reservationDraftStore';
import { useTheme } from '@/theme';
import { formatDateKeyLong, formatTime } from '@/utils/date';
import { formatPartySize } from '@/utils/format';

/**
 * Confirmation.
 *
 * The QR and the six-character code are the payload. Everything else is
 * reassurance. The code is spelled out in large type next to the QR because a
 * host stand with a broken scanner still needs something readable aloud, and
 * because a screenshot of a QR is useless if the screen dims.
 *
 * Back-swipe is disabled on this route: the wizard behind it is stale.
 */
export default function ConfirmationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { reservationId } = useLocalSearchParams<{ reservationId: string }>();

  const { data: reservation } = useReservation(reservationId);
  const { data: restaurant } = useRestaurant(reservation?.restaurantId);
  const resetDraft = useReservationDraftStore((s) => s.reset);

  // The draft has served its purpose; leaving it around would resurrect a
  // stale booking the next time someone opened the wizard.
  useEffect(() => () => resetDraft(), [resetDraft]);

  if (!reservation) {
    return <Screen />;
  }

  const pending = reservation.status === 'pending';
  // A waitlist entry has no table, so it has no code and no QR. The card shows
  // the queue instead — printing a code here would hand someone something to
  // present at a door that is not expecting them.
  const queued = reservation.status === 'waitlisted';

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingTop: theme.spacing.xxl,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.lg,
          alignItems: 'center',
        }}
      >
        <Animated.View
          entering={ZoomIn.duration(340).springify().damping(14)}
          style={[
            styles.tick,
            {
              backgroundColor:
                queued || pending ? theme.colors.warningSoft : theme.colors.positiveSoft,
            },
          ]}
        >
          <Ionicons
            name={queued ? 'hourglass-outline' : pending ? 'time-outline' : 'checkmark'}
            size={36}
            color={queued || pending ? theme.colors.warning : theme.colors.positive}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(120)} style={{ gap: theme.spacing.sm }}>
          <Text variant="title" center>
            {queued ? 'You are on the list' : pending ? 'Request sent' : 'Table booked'}
          </Text>
          <Text variant="body" tone="muted" center style={{ maxWidth: 320 }}>
            {queued
              ? `${restaurant?.name} has no table at this time yet. The moment one frees up we will notify you and hold it for ${config.waitlist.holdMinutes} minutes.`
              : pending
                ? `${restaurant?.name} has your request and usually replies within an hour. We will let you know.`
                : `${restaurant?.name} is holding your table. Show this code when you arrive.`}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(220)} style={{ width: '100%' }}>
          <Card style={{ alignItems: 'center', gap: theme.spacing.base }}>
            {queued ? (
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text variant="overline" tone="faint">
                  Your place
                </Text>
                <Text variant="display" style={{ fontSize: 26 }}>
                  {queueLabel(reservation.waitlist?.position ?? 1)}
                </Text>
              </View>
            ) : (
              <>
                <QrCode value={`mesa:reservation:${reservation.code}`} size={168} />

                <View style={{ alignItems: 'center', gap: 2 }}>
                  <Text variant="overline" tone="faint">
                    Booking code
                  </Text>
                  <Text variant="display" style={{ fontSize: 30, letterSpacing: 4 }}>
                    {reservation.code}
                  </Text>
                </View>
              </>
            )}

            <Divider style={{ alignSelf: 'stretch' }} />

            <View style={{ alignSelf: 'stretch', gap: theme.spacing.sm }}>
              <Row label="Restaurant" value={restaurant?.name ?? '—'} />
              <Row label="Date" value={formatDateKeyLong(reservation.date)} />
              <Row label="Time" value={formatTime(reservation.time)} />
              <Row label="Guests" value={formatPartySize(reservation.partySize)} />
              <Row label="Seating" value={SEATING_LABEL[reservation.seating]} />
              {reservation.occasion !== 'none' ? (
                <Row label="Occasion" value={OCCASION_LABEL[reservation.occasion]} />
              ) : null}
              {reservation.notes ? <Row label="Note" value={reservation.notes} multiline /> : null}
            </View>
          </Card>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(300).delay(320)}
          style={{ width: '100%', gap: theme.spacing.sm }}
        >
          <Button
            label={queued ? 'See my place in the queue' : 'See my booking'}
            size="lg"
            fullWidth
            onPress={() => router.replace(`/reservation/${reservation.id}`)}
          />
          <Button
            label="Back to browsing"
            variant="ghost"
            fullWidth
            onPress={() => router.replace('/(tabs)')}
          />
        </Animated.View>

        <Text variant="caption" tone="faint" center style={{ maxWidth: 320 }}>
          {queued
            ? 'Nothing is charged, and you can leave the list whenever you like. Keep notifications on — a held table goes to the next party when the hold runs out.'
            : `A reminder will land on your phone ${
                reservation.status === 'confirmed' ? 'three hours' : 'shortly'
              } before the sitting. You can change or cancel free of charge up to two hours before.`}
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Row({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text variant="label" tone="muted" style={{ width: 82 }}>
        {label}
      </Text>
      <Text variant="body" style={{ flex: 1 }} numberOfLines={multiline ? 4 : 1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tick: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
});
