import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface ListRowProps {
  label: string;
  value?: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** Renders a switch instead of a chevron. */
  toggle?: { value: boolean; onChange: (next: boolean) => void };
  destructive?: boolean;
  showChevron?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Settings and profile rows. One shape, so the whole list scans identically. */
export const ListRow = React.memo(function ListRow({
  label,
  value,
  description,
  icon,
  onPress,
  toggle,
  destructive = false,
  showChevron = true,
  style,
}: ListRowProps) {
  const theme = useTheme();
  const tint = destructive ? theme.colors.danger : theme.colors.ink;

  const content = (
    <View style={[styles.row, { paddingVertical: theme.spacing.md, gap: theme.spacing.md }, style]}>
      {icon ? (
        <View
          style={[
            styles.glyph,
            { backgroundColor: theme.colors.canvasSunk, borderRadius: theme.radius.sm },
          ]}
        >
          <Ionicons name={icon} size={17} color={tint} />
        </View>
      ) : null}

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" style={{ color: tint }} numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text variant="label" tone="muted" numberOfLines={1} style={{ maxWidth: 140 }}>
          {value}
        </Text>
      ) : null}

      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          accessibilityLabel={label}
          trackColor={{ false: theme.colors.hairlineStrong, true: theme.colors.accent }}
          thumbColor={theme.colors.surface}
        />
      ) : onPress && showChevron ? (
        <Ionicons name="chevron-forward" size={17} color={theme.colors.inkFaint} />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={description}
      scaleTo={0.99}
      dim
    >
      {content}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  glyph: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
