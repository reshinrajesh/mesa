import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { Pressable } from './Pressable';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  /** Set false for buttons pressed repeatedly, where a buzz becomes noise. */
  haptic?: boolean;
}

/**
 * The primary action is an ink fill, not the accent.
 *
 * Terracotta is reserved for the one live thing on a screen — the selected
 * slot, the active favourite. If every button were accent-filled, the accent
 * would stop meaning anything, so the CTA takes the ink and lets the accent do
 * its job elsewhere.
 */
export const Button = React.memo(function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityHint,
  haptic = true,
}: ButtonProps) {
  const theme = useTheme();

  const heights: Record<Size, number> = { sm: 38, md: 48, lg: 56 };
  const paddings: Record<Size, number> = {
    sm: theme.spacing.md,
    md: theme.spacing.lg,
    lg: theme.spacing.xl,
  };

  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.colors.ink, fg: theme.colors.inkOn, border: 'transparent' },
    secondary: { bg: 'transparent', fg: theme.colors.ink, border: theme.colors.hairlineStrong },
    ghost: { bg: 'transparent', fg: theme.colors.ink, border: 'transparent' },
    danger: { bg: theme.colors.dangerSoft, fg: theme.colors.danger, border: 'transparent' },
  };

  const { bg, fg, border } = palette[variant];
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    if (haptic) haptics.tap();
    onPress?.();
  };

  const glyph = icon ? (
    <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={fg} />
  ) : null;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      // Never below 44pt, whatever the visual height says.
      hitSlop={heights[size] < 44 ? (44 - heights[size]) / 2 : 6}
      style={[
        styles.base,
        {
          height: heights[size],
          paddingHorizontal: paddings[size],
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth * 2 : 0,
          borderRadius: theme.radius.pill,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.content}>
          {iconPosition === 'left' ? glyph : null}
          <Text
            variant={size === 'sm' ? 'label' : 'bodyStrong'}
            style={{ color: fg }}
            numberOfLines={1}
          >
            {label}
          </Text>
          {iconPosition === 'right' ? glyph : null}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
