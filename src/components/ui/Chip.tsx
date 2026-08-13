import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Trailing count, e.g. a filter group showing how many are on. */
  count?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

/**
 * Selection chip.
 *
 * Selected state is an ink fill plus a checkmark, never colour alone — the
 * filter sheet has to be operable by someone who cannot distinguish the
 * selected tint from the unselected one.
 */
export const Chip = React.memo(function Chip({
  label,
  selected = false,
  onPress,
  icon,
  count,
  disabled,
  size = 'md',
  style,
}: ChipProps) {
  const theme = useTheme();
  const height = size === 'sm' ? 32 : 38;

  const fg = selected ? theme.colors.inkOn : theme.colors.ink;

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={count ? `${label}, ${count} selected` : label}
      hitSlop={(44 - height) / 2}
      style={[
        styles.chip,
        {
          height,
          borderRadius: theme.radius.pill,
          paddingHorizontal: size === 'sm' ? theme.spacing.md : theme.spacing.base,
          backgroundColor: selected ? theme.colors.ink : theme.colors.surface,
          borderColor: selected ? theme.colors.ink : theme.colors.hairline,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={size === 'sm' ? 13 : 15} color={fg} /> : null}
      <Text variant="label" numberOfLines={1} style={{ color: fg }}>
        {label}
      </Text>
      {selected ? <Ionicons name="checkmark" size={14} color={fg} /> : null}
      {count && count > 0 && !selected ? (
        <View style={[styles.count, { backgroundColor: theme.colors.accent }]}>
          <Text variant="caption" style={{ color: theme.colors.accentOn, fontSize: 10 }}>
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  count: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
