import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string; badge?: number }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Two-to-three-way switch: Upcoming/Past, List/Map.
 *
 * The selected pill does not animate between positions. This control gets
 * tapped constantly and a sliding indicator turns an instant switch into a
 * 200ms one — motion here reads as lag rather than polish.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.track,
        {
          backgroundColor: theme.colors.canvasSunk,
          borderRadius: theme.radius.pill,
          padding: 3,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={
              option.badge ? `${option.label}, ${option.badge}` : option.label
            }
            scaleTo={0.98}
            style={[
              styles.segment,
              {
                backgroundColor: selected ? theme.colors.surface : 'transparent',
                borderRadius: theme.radius.pill,
              },
              selected ? theme.elevation.soft : null,
            ]}
          >
            <Text
              variant={selected ? 'bodyStrong' : 'body'}
              tone={selected ? 'primary' : 'muted'}
              numberOfLines={1}
              style={{ fontSize: 14 }}
            >
              {option.label}
            </Text>
            {option.badge ? (
              <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
                <Text variant="caption" style={{ color: theme.colors.accentOn, fontSize: 10 }}>
                  {option.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
});
