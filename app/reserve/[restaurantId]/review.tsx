import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BookingStep } from '@/store/reservationDraftStore';

import { config } from '@/constants/config';
import { OCCASION_LABEL, SEATING_LABEL } from '@/constants/cuisines';
import { Button, Card, Divider, Pressable, Screen, ScreenHeader, SmartImage, Text } from '@/components/ui';
import { useCreateReservation, useJoinWaitlist } from '@/hooks/useReservations';
import { useRestaurant } from '@/hooks/useRestaurants';
import { useAuthStore } from '@/store/authStore';
import { useReservationDraftStore } from '@/store/reservationDraftStore';
import { useTheme } from '@/theme';
import { createReservationSchema } from '@/validation/schemas';
import { formatDateKeyLong, formatTime } from '@/utils/date';
import { formatPartySize } from '@/utils/format';
import { toast } from '@/store/uiStore';

/**
 * Review.
 *
 * Every row is tappable and jumps back to the step that set it. A review screen
 * that shows a mistake but makes you press back four times to fix it is worse
 * than no review screen.
 */
export default function ReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();

  const { data: restaurant } = useRestaurant(restaurantId);
  const draft = useReservationDraftStore();
  const goToStep = useReservationDraftStore((s) => s.goToStep);
  const user = useAuthStore((s) => s.user);
  const kind = useAuthStore((s) => s.kind);

  const create = useCreateReservation();
  const join = useJoinWaitlist();

  // Queueing and booking ask for exactly the same details, so this screen is
  // the same screen. Only the notice, the button and the endpoint differ —
  // forking it into a second review screen would duplicate six rows to change
  // two lines of copy.
  const queueing = draft.waitlist;
  const pending = create.isPending || join.isPending;

  const editStep = (step: BookingStep) => {
    goToStep(step);
    router.back();
  };

  const confirm = () => {
    // Validate again here: a restored draft or a deep link could reach this
    // screen without having passed through every step.
    const parsed = createReservationSchema.safeParse({
      restaurantId: draft.restaurantId,
      date: draft.date,
      time: draft.time,
      partySize: draft.partySize,
      seating: draft.seating,
      occasion: draft.occasion,
      notes: draft.notes,
    });

    if (!parsed.success) {
      toast({
        title: 'Something is missing',
        message: parsed.error.issues[0]?.message ?? 'Check the booking details.',
        tone: 'danger',
      });
      return;
    }

    const onSuccess = (reservation: { id: string }) => {
      router.replace({
        pathname: '/reserve/[restaurantId]/confirmation',
        params: { restaurantId, reservationId: reservation.id },
      });
    };

    if (queueing) {
      join.mutate(parsed.data, { onSuccess });
      return;
    }
    create.mutate(parsed.data, { onSuccess });
  };

  const isGuest = kind === 'guest';

  return (
    <Screen>
      <ScreenHeader title={queueing ? 'Review your request' : 'Review your booking'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingBottom: theme.layout.stickyBarHeight + insets.bottom + theme.spacing.xl,
          gap: theme.spacing.lg,
        }}
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
          </View>
        </Card>

        <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
          <Row
            label="Date"
            value={draft.date ? formatDateKeyLong(draft.date) : '—'}
            onEdit={() => editStep('date')}
          />
          <Divider />
          <Row
            label="Time"
            value={draft.time ? formatTime(draft.time) : '—'}
            onEdit={() => editStep('time')}
          />
          <Divider />
          <Row
            label="Guests"
            value={formatPartySize(draft.partySize)}
            onEdit={() => editStep('guests')}
          />
          <Divider />
          <Row
            label="Seating"
            value={SEATING_LABEL[draft.seating]}
            onEdit={() => editStep('seating')}
          />
          <Divider />
          <Row
            label="Occasion"
            value={draft.occasion === 'none' ? 'None' : OCCASION_LABEL[draft.occasion]}
            onEdit={() => editStep('notes')}
          />
          <Divider />
          <Row
            label="Note"
            value={draft.notes.trim() || 'None'}
            multiline
            onEdit={() => editStep('notes')}
          />
        </Card>

        <Card style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" tone="faint">
            Booking under
          </Text>
          {isGuest ? (
            <>
              <Text variant="body" tone="muted">
                You are browsing as a guest. Create an account so the restaurant can reach you and
                so this booking is saved.
              </Text>
              <Button
                label="Create an account"
                variant="secondary"
                size="sm"
                onPress={() => router.push('/(auth)/sign-up')}
              />
            </>
          ) : (
            <>
              <Text variant="body">{user?.name}</Text>
              <Text variant="caption" tone="muted">
                {user?.phone} · {user?.email}
              </Text>
            </>
          )}
        </Card>

        <View
          style={[
            styles.notice,
            {
              backgroundColor: queueing ? theme.colors.accentSoft : theme.colors.canvasSunk,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <Ionicons
            name={queueing ? 'hourglass-outline' : 'shield-checkmark-outline'}
            size={17}
            color={queueing ? theme.colors.accent : theme.colors.inkMuted}
          />
          {queueing ? (
            <Text variant="caption" tone="accent" style={{ flex: 1 }}>
              This time is fully booked. Joining the list does not book a table — if one frees up we
              notify you and hold it for {config.waitlist.holdMinutes} minutes. You can leave the
              list at any time, and nothing is charged either way.
            </Text>
          ) : (
            <Text variant="caption" tone="muted" style={{ flex: 1 }}>
              Nothing is charged. You can change or cancel free of charge up to two hours before the
              sitting.
              {draft.partySize >= 7 || draft.seating === 'private'
                ? ' This booking goes to the restaurant to confirm rather than being instant.'
                : ''}
            </Text>
          )}
        </View>
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
          label={
            queueing
              ? 'Join the waitlist'
              : draft.partySize >= 7 || draft.seating === 'private'
                ? 'Request this table'
                : 'Confirm booking'
          }
          size="lg"
          fullWidth
          loading={pending}
          onPress={confirm}
        />
      </View>
    </Screen>
  );
}

function Row({
  label,
  value,
  onEdit,
  multiline = false,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  multiline?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint="Opens this step to change it"
      scaleTo={0.99}
      dim
      style={[styles.row, { paddingVertical: theme.spacing.md }]}
    >
      <Text variant="label" tone="muted" style={{ width: 78 }}>
        {label}
      </Text>
      <Text
        variant="body"
        style={{ flex: 1 }}
        numberOfLines={multiline ? 3 : 1}
      >
        {value}
      </Text>
      <Ionicons name="pencil-outline" size={15} color={theme.colors.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
  },
  notice: {
    flexDirection: 'row',
    gap: 9,
    padding: 14,
    alignItems: 'flex-start',
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
