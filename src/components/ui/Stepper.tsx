import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface StepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  /** Rendered under the number, e.g. "guests". */
  unit?: string;
  accessibilityLabel: string;
}

/** Party-size control. The number is the display serif; it is the hero here. */
export function Stepper({
  value,
  min = 1,
  max,
  onChange,
  unit,
  accessibilityLabel,
}: StepperProps) {
  const theme = useTheme();

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) {
      haptics.warning();
      return;
    }
    haptics.selection();
    onChange(next);
  };

  const button = (direction: -1 | 1, icon: 'remove' | 'add', label: string) => {
    const disabled = direction === -1 ? value <= min : value >= max;
    return (
      <Pressable
        onPress={() => step(direction)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        scaleTo={0.9}
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.hairlineStrong,
            borderRadius: theme.radius.pill,
          },
        ]}
      >
        <Ionicons name={icon} size={22} color={theme.colors.ink} />
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      style={styles.row}
    >
      {button(-1, 'remove', 'One fewer')}

      <View style={styles.readout}>
        <Text variant="display" style={{ fontSize: 44, lineHeight: 50 }}>
          {value}
        </Text>
        {unit ? (
          <Text variant="label" tone="muted">
            {unit}
          </Text>
        ) : null}
      </View>

      {button(1, 'add', 'One more')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  button: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  readout: {
    minWidth: 92,
    alignItems: 'center',
    gap: 2,
  },
});
