import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { formatRating, formatReviewCount } from '@/utils/format';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface RatingProps {
  value: number;
  count?: number;
  /** Star glyph is ink, not accent — the accent is reserved for live state. */
  size?: 'sm' | 'md';
  onPhoto?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Rating = React.memo(function Rating({
  value,
  count,
  size = 'sm',
  onPhoto = false,
  style,
}: RatingProps) {
  const theme = useTheme();
  const color = onPhoto ? '#FBF8F4' : theme.colors.star;

  return (
    <View
      accessible
      accessibilityLabel={
        count ? `Rated ${formatRating(value)} out of 5 from ${count} reviews` : `Rated ${formatRating(value)} out of 5`
      }
      style={[styles.row, style]}
    >
      <Ionicons name="star" size={size === 'sm' ? 12 : 14} color={color} />
      <Text variant="numeric" style={{ color, fontSize: size === 'sm' ? 13 : 15 }}>
        {formatRating(value)}
      </Text>
      {count !== undefined ? (
        <Text
          variant="caption"
          style={{ color: onPhoto ? 'rgba(251,248,244,0.8)' : theme.colors.inkFaint }}
        >
          ({formatReviewCount(count)})
        </Text>
      ) : null}
    </View>
  );
});

export interface StarPickerProps {
  value: number;
  onChange: (value: number) => void;
}

/** The five-star input on the rate-a-restaurant sheet. */
export function StarPicker({ value, onChange }: StarPickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.picker} accessibilityRole="adjustable" accessibilityLabel="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange(star)}
          accessibilityRole="button"
          accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`}
          accessibilityState={{ selected: value === star }}
          hitSlop={8}
          scaleTo={0.85}
          style={styles.star}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={32}
            color={star <= value ? theme.colors.accent : theme.colors.hairlineStrong}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  picker: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'center',
  },
  star: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
