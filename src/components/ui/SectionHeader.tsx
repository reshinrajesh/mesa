import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  /** Small line under the title explaining what the rail is. */
  subtitle?: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader = React.memo(function SectionHeader({
  title,
  subtitle,
  onSeeAll,
  seeAllLabel = 'See all',
  style,
}: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { paddingHorizontal: theme.screenGutter }, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="heading">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {onSeeAll ? (
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="button"
          accessibilityLabel={`${seeAllLabel}, ${title}`}
          hitSlop={12}
          style={styles.seeAll}
        >
          <Text variant="label" tone="accent">
            {seeAllLabel}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
  },
});
