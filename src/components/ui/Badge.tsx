import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'positive' | 'warning' | 'danger' | 'accent' | 'onPhoto';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
  /** A small filled dot instead of an icon. Used for open/closed status. */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Status badge.
 *
 * Never colour-only: every tone carries either a word that states the status
 * or an icon that does. Someone who cannot separate the green from the amber
 * still reads "Confirmed" and "Pending".
 */
export const Badge = React.memo(function Badge({
  label,
  tone = 'neutral',
  icon,
  dot = false,
  style,
}: BadgeProps) {
  const theme = useTheme();

  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: theme.colors.canvasSunk, fg: theme.colors.inkMuted },
    positive: { bg: theme.colors.positiveSoft, fg: theme.colors.positive },
    warning: { bg: theme.colors.warningSoft, fg: theme.colors.warning },
    danger: { bg: theme.colors.dangerSoft, fg: theme.colors.danger },
    accent: { bg: theme.colors.accentSoft, fg: theme.colors.accent },
    // Sits on top of photography, so it carries its own opaque ground.
    onPhoto: { bg: 'rgba(20,15,12,0.72)', fg: '#FBF8F4' },
  };

  const { bg, fg } = tones[tone];

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        styles.badge,
        { backgroundColor: bg, borderRadius: theme.radius.xs, paddingHorizontal: dot ? 8 : 8 },
        style,
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: fg }]} /> : null}
      {icon ? <Ionicons name={icon} size={11} color={fg} /> : null}
      <Text variant="overline" numberOfLines={1} style={{ color: fg, fontSize: 10 }}>
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 22,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
