import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { Cuisine } from '@/types';

import { CUISINES } from '@/constants/cuisines';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';

export interface CuisineRowProps {
  selected?: Cuisine | null;
  onSelect: (cuisine: Cuisine) => void;
}

/**
 * Cuisine categories.
 *
 * Outlined glyph in a circle rather than a photo tile: photo tiles at this size
 * become unreadable mush, and they compete with the restaurant photography that
 * is meant to be the only imagery on the screen.
 */
export const CuisineRow = React.memo(function CuisineRow({ selected, onSelect }: CuisineRowProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: theme.screenGutter,
        gap: theme.spacing.lg,
      }}
    >
      {CUISINES.slice(0, 10).map((cuisine) => {
        const isSelected = selected === cuisine.value;
        return (
          <Pressable
            key={cuisine.value}
            onPress={() => {
              haptics.selection();
              onSelect(cuisine.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${cuisine.label} restaurants`}
            scaleTo={0.93}
            style={styles.item}
          >
            <View
              style={[
                styles.circle,
                {
                  backgroundColor: isSelected ? theme.colors.ink : theme.colors.surface,
                  borderColor: isSelected ? theme.colors.ink : theme.colors.hairline,
                },
              ]}
            >
              <Ionicons
                name={(cuisine.icon ?? 'restaurant-outline') as keyof typeof Ionicons.glyphMap}
                size={22}
                color={isSelected ? theme.colors.inkOn : theme.colors.ink}
              />
            </View>
            <Text variant="caption" tone={isSelected ? 'primary' : 'muted'} numberOfLines={1}>
              {cuisine.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    gap: 8,
    width: 62,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
