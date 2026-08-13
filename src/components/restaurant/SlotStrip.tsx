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
