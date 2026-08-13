import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { formatTime } from '@/utils/date';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';

export interface SlotStripProps {
  times: string[];
  onSelect?: (time: string) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The three-slot strip on a card.
 *
 * These are real times from the same generator the booking screen reads, so a
 * card can never advertise a slot the next screen then refuses. Tapping one
 * opens the booking flow already on that time.
 */
export const SlotStrip = React.memo(function SlotStrip({ times, onSelect, style }: SlotStripProps) {
  const theme = useTheme();
  if (times.length === 0) return null;

  return (
    <View style={[styles.row, style]}>
      {times.map((time) => (
        <Pressable
          key={time}
          onPress={() => onSelect?.(time)}
          disabled={!onSelect}
          accessibilityRole="button"
          accessibilityLabel={`Reserve at ${formatTime(time)}`}
          hitSlop={8}
          scaleTo={0.94}
          style={[
            styles.slot,
            {
              backgroundColor: theme.colors.accentSoft,
              borderRadius: theme.radius.xs,
            },
          ]}
        >
          <Text variant="numeric" tone="accent" style={{ fontSize: 12 }}>
            {formatTime(time)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
});

export interface WaitlistPillProps {
  restaurantName: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * What a card shows instead of times when tonight is gone.
 *
 * It borrows the booking board's vocabulary exactly — dashed outline, recessed
 * ground, muted ink — so the thing that means "full, but joinable" looks the
 * same wherever it appears. Free times are accent-filled and this is not,
 * which is the whole point: a queue must never be mistaken for a table at a
 * glance while scrolling a rail.
 *
 * The alternative was showing nothing, which is what the card did before and
 * which reads as "this place has no availability" — losing the one venue the
 * user might still get into tonight.
 */
export const WaitlistPill = React.memo(function WaitlistPill({
  restaurantName,
  onPress,
  style,
}: WaitlistPillProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, style]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`${restaurantName} is fully booked tonight. Join the waitlist.`}
        hitSlop={8}
        scaleTo={0.94}
        style={[
          styles.slot,
          {
            backgroundColor: theme.colors.canvasSunk,
            borderColor: theme.colors.hairline,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderStyle: 'dashed',
            borderRadius: theme.radius.xs,
          },
        ]}
      >
        <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
          Full tonight · waitlist
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  slot: {
    paddingHorizontal: 8,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
