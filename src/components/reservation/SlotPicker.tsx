import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { TimeSlot } from '@/types';

import { annotateSlots } from '@/features/recommendations/engine';
import { isWaitlistable, queueDepthLabel } from '@/features/reservations/waitlist';
import { useTheme } from '@/theme';
import { formatTime, timeToMinutes } from '@/utils/date';
import { haptics } from '@/utils/haptics';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';

export interface SlotPickerProps {
  slots: TimeSlot[];
  value: string | null;
  onChange: (time: string, waitlist: boolean) => void;
}

/**
 * The time board.
 *
 * Four states, and none of them is signalled by colour alone:
 *   available    — outlined pill, full contrast
 *   limited      — outlined pill plus a "2 left" caption
 *   waitlistable — full, but the venue keeps a list: a dashed outline, the word
 *                  "Waitlist" under the time, and still tappable
 *   unavailable  — struck through, dimmed, and `disabled` so a screen reader
 *                  announces it rather than letting someone tap a dead pill
 *
 * The dashed border is the point of the waitlist state: it has to read as *not
 * the same kind of thing* as a bookable slot from across the board, before any
 * label is read. A full slot that merely looked bookable would have people
 * queueing while believing they had booked.
 */
export function SlotPicker({ slots, value, onChange }: SlotPickerProps) {
  const theme = useTheme();

  const annotated = useMemo(() => annotateSlots(slots), [slots]);

  const groups = useMemo(() => {
    const lunch = annotated.filter((s) => timeToMinutes(s.time) < 16 * 60);
    const dinner = annotated.filter((s) => timeToMinutes(s.time) >= 16 * 60);
    return [
      { title: 'Lunch', slots: lunch },
      { title: 'Dinner', slots: dinner },
    ].filter((g) => g.slots.length > 0);
  }, [annotated]);

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {groups.map((group) => (
        <View key={group.title} style={{ gap: theme.spacing.md }}>
          {groups.length > 1 ? (
            <Text variant="overline" tone="faint">
              {group.title}
            </Text>
          ) : null}

          <View style={styles.grid}>
            {group.slots.map((slot) => {
              const selected = slot.time === value;
              const queueable = isWaitlistable(slot);
              const unavailable = slot.availability === 'unavailable' && !queueable;
              const limited = slot.availability === 'limited';

              return (
                <Pressable
                  key={slot.time}
                  disabled={unavailable}
                  onPress={() => {
                    haptics.selection();
                    onChange(slot.time, queueable);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: unavailable }}
                  accessibilityLabel={
                    unavailable
                      ? `${formatTime(slot.time)}, fully booked`
                      : queueable
                        ? `${formatTime(slot.time)}, fully booked, join the waitlist, ${queueDepthLabel(
                            slot.waitlist!.queueLength,
                          )}`
                        : limited
                          ? `${formatTime(slot.time)}, ${slot.tablesLeft} table${slot.tablesLeft === 1 ? '' : 's'} left`
                          : `${formatTime(slot.time)}, available${slot.hint ? `, ${slot.hint}` : ''}`
                  }
                  scaleTo={0.94}
                  style={[
                    styles.slot,
                    {
                      borderRadius: theme.radius.sm,
                      backgroundColor: selected
                        ? theme.colors.ink
                        : queueable
                          ? theme.colors.canvasSunk
                          : theme.colors.surface,
                      borderColor: selected
                        ? theme.colors.ink
                        : slot.recommended
                          ? theme.colors.accent
                          : theme.colors.hairline,
                      borderWidth: slot.recommended && !selected ? 1.5 : StyleSheet.hairlineWidth * 2,
                      borderStyle: queueable && !selected ? 'dashed' : 'solid',
                      opacity: unavailable ? 0.4 : 1,
                    },
                  ]}
                >
                  <Text
                    variant="numeric"
                    numberOfLines={1}
                    style={{
                      color: selected
                        ? theme.colors.inkOn
                        : queueable
                          ? theme.colors.inkMuted
                          : theme.colors.ink,
                      fontSize: 14,
                      textDecorationLine: unavailable ? 'line-through' : 'none',
                    }}
                  >
                    {formatTime(slot.time)}
                  </Text>

                  {limited && !selected ? (
                    <Text variant="caption" tone="warning" style={{ fontSize: 10 }}>
                      {slot.tablesLeft} left
                    </Text>
                  ) : null}

                  {queueable && !selected ? (
                    <Text variant="caption" tone="faint" style={{ fontSize: 10 }}>
                      Waitlist
                    </Text>
                  ) : null}

                  {selected ? (
                    <Ionicons
                      name={queueable ? 'hourglass-outline' : 'checkmark'}
                      size={12}
                      color={theme.colors.inkOn}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {group.slots.some((s) => s.recommended) ? (
            <View style={styles.hintRow}>
              <Ionicons name="sparkles-outline" size={13} color={theme.colors.accent} />
              <Text variant="caption" tone="accent">
                {group.slots.find((s) => s.recommended)?.hint ?? 'Usually quieter'} around{' '}
                {formatTime(group.slots.find((s) => s.recommended)!.time)}
              </Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slot: {
    minWidth: 88,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});
