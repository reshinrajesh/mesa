import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { config } from '@/constants/config';
import { useTheme } from '@/theme';
import { addDaysToKey, fromDateKey, todayKey, WEEKDAYS_SHORT } from '@/utils/date';
import { haptics } from '@/utils/haptics';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';

export interface DateRailProps {
  value: string | null;
  onChange: (dateKey: string) => void;
  /** Dates the venue is shut, drawn struck through rather than hidden. */
  closedDates?: string[];
  days?: number;
}

/**
 * Horizontal date picker.
 *
 * A calendar grid is the obvious choice and the wrong one here: bookings are
 * overwhelmingly made for today, tomorrow or this weekend, and a month grid
 * makes those three the same number of taps as a date in November. The rail
 * puts the common case first and still reaches 60 days out.
 *
 * Closed days stay visible and struck through. Hiding them makes the rail skip
 * numbers, which reads as a bug.
 */
export const DateRail = React.memo(function DateRail({
  value,
  onChange,
  closedDates = [],
  days = config.bookingWindowDays,
}: DateRailProps) {
  const theme = useTheme();
  const today = todayKey();

  const entries = useMemo(
    () =>
      Array.from({ length: days }, (_, index) => {
        const key = addDaysToKey(today, index);
        const date = fromDateKey(key);
        return {
          key,
          weekday: WEEKDAYS_SHORT[date.getDay()],
          dayOfMonth: date.getDate(),
          isToday: index === 0,
          isTomorrow: index === 1,
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
        };
      }),
    [today, days],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: theme.screenGutter, gap: theme.spacing.sm }}
    >
      {entries.map((entry) => {
        const selected = entry.key === value;
        const closed = closedDates.includes(entry.key);

        return (
          <Pressable
            key={entry.key}
            onPress={() => {
              haptics.selection();
              onChange(entry.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${entry.weekday} ${entry.dayOfMonth}${
              entry.isToday ? ', today' : entry.isTomorrow ? ', tomorrow' : ''
            }${closed ? ', closed' : ''}`}
            scaleTo={0.93}
            style={[
              styles.day,
              {
                borderRadius: theme.radius.md,
                backgroundColor: selected ? theme.colors.ink : theme.colors.surface,
                borderColor: selected ? theme.colors.ink : theme.colors.hairline,
                opacity: closed ? 0.45 : 1,
              },
            ]}
          >
            <Text
              variant="caption"
              numberOfLines={1}
              style={{
                color: selected
                  ? 'rgba(253,251,248,0.7)'
                  : entry.isWeekend
                    ? theme.colors.accent
                    : theme.colors.inkFaint,
                fontSize: 11,
              }}
            >
              {entry.isToday ? 'Today' : entry.isTomorrow ? 'Tmrw' : entry.weekday}
            </Text>

            <Text
              variant="heading"
              numberOfLines={1}
              style={{
                color: selected ? theme.colors.inkOn : theme.colors.ink,
                fontSize: 20,
                textDecorationLine: closed ? 'line-through' : 'none',
              }}
            >
              {entry.dayOfMonth}
            </Text>

            {closed ? (
              <View style={[styles.closedDot, { backgroundColor: theme.colors.inkFaint }]} />
            ) : (
              <View style={styles.closedDot} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  day: {
    width: 62,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  closedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
