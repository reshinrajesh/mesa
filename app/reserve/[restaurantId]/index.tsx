import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NOTE_SUGGESTIONS, OCCASIONS, SEATING_OPTIONS } from '@/constants/cuisines';
import { config } from '@/constants/config';
import { isWaitlistable, waitlistSummary } from '@/features/reservations/waitlist';
import { DateRail } from '@/components/reservation/DateRail';
import { SlotPicker } from '@/components/reservation/SlotPicker';
import {
  Button,
  Chip,
  EmptyState,
  Pressable,
  Screen,
  ScreenHeader,
  Skeleton,
  Stepper,
  Text,
} from '@/components/ui';
import { useAvailability, useRestaurant } from '@/hooks/useRestaurants';
import { BOOKING_STEPS, useReservationDraftStore } from '@/store/reservationDraftStore';
import { useTheme } from '@/theme';
import { formatDateKeyLong, formatTime, todayKey } from '@/utils/date';
import { formatPartySize } from '@/utils/format';
import { useReduceMotion } from '@/components/ui/Pressable';

/**
 * The booking wizard.
 *
 * Five steps in one screen rather than five pushed routes. A pushed screen per
 * micro-choice means five navigation animations to pick a table, and going back
 * to change the party size unwinds everything after it. Here, back steps
 * backwards through the wizard and the hardware back button does the same.
 *
 * The draft lives in a store, not in local state, so Review can send you back
 * to any step without losing what is already chosen.
 */
export default function ReserveScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const params = useLocalSearchParams<{ restaurantId: string; time?: string; rebook?: string }>();
  const restaurantId = params.restaurantId;

  const { data: restaurant } = useRestaurant(restaurantId);

  const draft = useReservationDraftStore();
  const {
    step,
    date,
    partySize,
    time,
    seating,
    occasion,
    notes,
    start,
    setDate,
    setPartySize,
    setTime,
    setSeating,
    setOccasion,
    setNotes,
    next,
    back,
    goToStep,
  } = draft;

  // Start a fresh draft unless we arrived from "book again", which pre-filled one.
  useEffect(() => {
    if (params.rebook === '1' && draft.restaurantId === restaurantId) return;
    start(restaurantId, {
      date: todayKey(),
      time: params.time ?? null,
      // A card slot tap already chose a time; jump past date and guests.
      ...(params.time ? {} : {}),
    });
    if (params.time) goToStep('time');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const availability = useAvailability(restaurantId, date, partySize);

  // The board can refresh under a chosen time — the last table goes, or a
  // cancellation frees one. Reconcile the draft's waitlist flag with what the
  // board now says, so Review never offers to book a slot that has since
  // filled, or to queue for one that has since opened.
  useEffect(() => {
    if (!time || !availability.data) return;
    const slot = availability.data.slots.find((s) => s.time === time);
    if (!slot) return;
    const queueing = isWaitlistable(slot);
    if (queueing !== draft.waitlist) setTime(time, queueing);
  }, [availability.data, time, draft.waitlist, setTime]);

  const stepIndex = BOOKING_STEPS.indexOf(step);
  const maxParty = Math.min(config.maxPartySizeOnline, restaurant?.maxPartySize ?? 12);

  // The selected slot, but only when it is one being queued for. Everything
  // downstream keys off this rather than off the draft's flag alone, so a
  // stale flag can never make a bookable slot render as a queue.
  const waitlistSlot = useMemo(() => {
    if (!time) return null;
    const slot = availability.data?.slots.find((s) => s.time === time);
    return slot && isWaitlistable(slot) ? slot : null;
  }, [availability.data, time]);

  const canAdvance = useMemo(() => {
    switch (step) {
      case 'date':
        return Boolean(date);
      case 'guests':
        return partySize > 0;
      case 'time':
        return Boolean(time);
      default:
        return true;
    }
  }, [step, date, partySize, time]);

  const onBack = () => {
    if (!back()) router.back();
  };

  const advance = () => {
    if (step === 'notes') {
      router.push({
        pathname: '/reserve/[restaurantId]/review',
        params: { restaurantId },
      });
      return;
    }
    next();
  };

  const stepTitles: Record<typeof step, string> = {
    date: 'When are you coming?',
    guests: 'How many of you?',
    time: 'Pick a time',
    seating: 'Where would you like to sit?',
    notes: 'Anything they should know?',
  };

  const enter = reduceMotion ? FadeIn.duration(120) : SlideInRight.duration(220);
  const exit = reduceMotion ? FadeOut.duration(100) : SlideOutLeft.duration(180);

  return (
    <Screen keyboardSafe>
      <ScreenHeader
        title={restaurant?.name ?? 'Reserve'}
        subtitle={`Step ${stepIndex + 1} of ${BOOKING_STEPS.length}`}
        onBack={onBack}
      />

      {/* Progress. Segments, not a continuous bar: five discrete steps read
          more honestly as five marks than as a percentage. */}
      <View style={[styles.progress, { paddingHorizontal: theme.screenGutter }]}>
        {BOOKING_STEPS.map((s, index) => (
          <Pressable
            key={s}
            // Backwards only — jumping ahead would skip a required choice.
            onPress={() => index < stepIndex && goToStep(s)}
            disabled={index >= stepIndex}
            accessibilityRole="button"
            accessibilityLabel={`Step ${index + 1}`}
            scaleTo={1}
            style={{ flex: 1 }}
          >
            <View
              style={[
                styles.progressSegment,
                {
                  backgroundColor:
                    index <= stepIndex ? theme.colors.ink : theme.colors.hairline,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.layout.stickyBarHeight + insets.bottom + theme.spacing.xl,
          gap: theme.spacing.lg,
        }}
      >
        <View style={{ paddingHorizontal: theme.screenGutter, gap: theme.spacing.xs }}>
          <Text variant="title">{stepTitles[step]}</Text>
          {step === 'time' && date ? (
            <Text variant="body" tone="muted">
              {formatDateKeyLong(date)} · {formatPartySize(partySize)}
            </Text>
          ) : null}
        </View>

        <Animated.View key={step} entering={enter} exiting={exit} style={{ gap: theme.spacing.lg }}>
          {step === 'date' ? (
            <DateRail value={date} onChange={setDate} />
          ) : null}

          {step === 'guests' ? (
            <View style={{ paddingHorizontal: theme.screenGutter, gap: theme.spacing.xl }}>
              <View style={{ paddingVertical: theme.spacing.lg }}>
                <Stepper
                  value={partySize}
                  min={1}
                  max={maxParty}
                  onChange={setPartySize}
                  unit={partySize === 1 ? 'guest' : 'guests'}
                  accessibilityLabel="Number of guests"
                />
              </View>

              <View style={styles.quickSizes}>
                {[2, 4, 6, 8].filter((n) => n <= maxParty).map((n) => (
                  <Chip
                    key={n}
                    label={`${n}`}
                    size="sm"
                    selected={partySize === n}
                    onPress={() => setPartySize(n)}
                  />
                ))}
              </View>

              {partySize >= 7 ? (
                <View
                  style={[
                    styles.notice,
                    { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radius.md },
                  ]}
                >
                  <Ionicons name="information-circle-outline" size={17} color={theme.colors.warning} />
                  <Text variant="caption" tone="warning" style={{ flex: 1 }}>
                    Parties of seven or more are confirmed by the restaurant rather than instantly.
                    They usually reply within an hour.
                  </Text>
                </View>
              ) : null}

              {partySize === maxParty ? (
                <Text variant="caption" tone="faint">
                  {restaurant?.name} takes up to {maxParty} guests online. Call them on{' '}
                  {restaurant?.phone} for a larger party.
                </Text>
              ) : null}
            </View>
          ) : null}

          {step === 'time' ? (
            <View style={{ paddingHorizontal: theme.screenGutter }}>
              {availability.isLoading ? (
                <View style={{ gap: theme.spacing.md }}>
                  <Skeleton width="30%" height={14} />
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} width={88} height={44} radius={theme.radius.sm} />
                    ))}
                  </View>
                </View>
              ) : availability.data?.closedReason ? (
                <EmptyState
                  icon="calendar-outline"
                  title="No tables that day"
                  message={availability.data.closedReason}
                  action={{ label: 'Pick another date', onPress: () => goToStep('date') }}
                  compact
                />
              ) : (availability.data?.slots.length ?? 0) === 0 ? (
                <EmptyState
                  icon="time-outline"
                  title="Nothing left today"
                  message="The kitchen has stopped taking bookings for today. Tomorrow is wide open."
                  action={{ label: 'Try tomorrow', onPress: () => goToStep('date') }}
                  compact
                />
              ) : (
                <View style={{ gap: theme.spacing.base }}>
                  <SlotPicker
                    slots={availability.data?.slots ?? []}
                    value={time}
                    onChange={setTime}
                  />

                  {/* Explained once, under the board, rather than as a legend
                      nobody reads or a tooltip nobody finds. It only appears
                      on days that actually have a queueable slot. */}
                  {waitlistSlot ? (
                    <View
                      style={[
                        styles.notice,
                        { backgroundColor: theme.colors.accentSoft, borderRadius: theme.radius.md },
                      ]}
                    >
                      <Ionicons name="hourglass-outline" size={17} color={theme.colors.accent} />
                      <Text variant="caption" tone="accent" style={{ flex: 1 }}>
                        {formatTime(waitlistSlot.time)} is full. {waitlistSummary(waitlistSlot.waitlist!)}.
                        Joining the list holds nothing yet — if a table frees up we notify you and
                        hold it for {config.waitlist.holdMinutes} minutes.
                      </Text>
                    </View>
                  ) : availability.data?.waitlistOpen &&
                    availability.data.slots.some(isWaitlistable) ? (
                    <Text variant="caption" tone="faint">
                      Dashed times are fully booked, but {restaurant?.name} keeps a waitlist for
                      them.
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          ) : null}

          {step === 'seating' ? (
            <View style={{ paddingHorizontal: theme.screenGutter, gap: theme.spacing.sm }}>
              {SEATING_OPTIONS.map((option) => {
                const selected = seating === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setSeating(option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${option.label}. ${option.hint}`}
                    scaleTo={0.985}
                    style={[
                      styles.seatingRow,
                      {
                        borderRadius: theme.radius.md,
                        backgroundColor: selected ? theme.colors.ink : theme.colors.surface,
                        borderColor: selected ? theme.colors.ink : theme.colors.hairline,
                      },
                    ]}
                  >
                    <Ionicons
                      name={option.icon as keyof typeof Ionicons.glyphMap}
                      size={19}
                      color={selected ? theme.colors.inkOn : theme.colors.ink}
                    />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text
                        variant="bodyStrong"
                        style={{ color: selected ? theme.colors.inkOn : theme.colors.ink }}
                      >
                        {option.label}
                      </Text>
                      <Text
                        variant="caption"
                        style={{
                          color: selected ? theme.colors.inkOnMuted : theme.colors.inkFaint,
                        }}
                      >
                        {option.hint}
                      </Text>
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.inkOn} />
                    ) : null}
                  </Pressable>
                );
              })}

              <Text variant="caption" tone="faint" style={{ marginTop: theme.spacing.xs }}>
                Seating is a preference, not a guarantee. The restaurant will do its best.
              </Text>
            </View>
          ) : null}

          {step === 'notes' ? (
            <View style={{ paddingHorizontal: theme.screenGutter, gap: theme.spacing.lg }}>
              <View style={{ gap: theme.spacing.md }}>
                <Text variant="overline" tone="faint">
                  Occasion
                </Text>
                <View style={styles.wrap}>
                  {OCCASIONS.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      icon={option.icon as never}
                      size="sm"
                      selected={occasion === option.value}
                      onPress={() => setOccasion(option.value)}
                    />
                  ))}
                </View>
              </View>

              <View style={{ gap: theme.spacing.md }}>
                <Text variant="overline" tone="faint">
                  A note for the restaurant
                </Text>

                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Allergies, access needs, a high chair, anything at all."
                  placeholderTextColor={theme.colors.inkFaint}
                  selectionColor={theme.colors.accent}
                  multiline
                  maxLength={280}
                  accessibilityLabel="Note for the restaurant"
                  maxFontSizeMultiplier={1.5}
                  style={[
                    theme.text.body,
                    styles.notes,
                    {
                      color: theme.colors.ink,
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.hairline,
                      borderRadius: theme.radius.md,
                    },
                  ]}
                />

                <Text variant="caption" tone="faint" style={{ textAlign: 'right' }}>
                  {notes.length}/280
                </Text>

                <View style={styles.wrap}>
                  {NOTE_SUGGESTIONS.map((suggestion) => (
                    <Chip
                      key={suggestion}
                      label={suggestion}
                      size="sm"
                      onPress={() =>
                        setNotes(notes ? `${notes.trim()}. ${suggestion}` : suggestion)
                      }
                    />
                  ))}
                </View>
              </View>
            </View>
          ) : null}
        </Animated.View>
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
        {/* A running summary of what has been chosen, so nobody reaches Review
            wondering what they picked three steps ago. */}
        {stepIndex > 0 ? (
          <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginBottom: 8 }}>
            {[
              date ? formatDateKeyLong(date) : null,
              formatPartySize(partySize),
              time ? formatTime(time) : null,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>
        ) : null}

        <Button
          label={
            step === 'notes' ? (waitlistSlot ? 'Review request' : 'Review booking') : 'Continue'
          }
          size="lg"
          fullWidth
          disabled={!canAdvance}
          icon="arrow-forward"
          iconPosition="right"
          onPress={advance}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 8,
  },
  progressSegment: {
    height: 3,
    borderRadius: 2,
  },
  quickSizes: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  notice: {
    flexDirection: 'row',
    gap: 9,
    padding: 12,
    alignItems: 'flex-start',
  },
  seatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    minHeight: 62,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  notes: {
    minHeight: 104,
    padding: 14,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
