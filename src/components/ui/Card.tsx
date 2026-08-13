import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface CardProps {
  children: React.ReactNode;
  /** `flat` is the default. `raised` is for things that genuinely float. */
  elevation?: 'flat' | 'raised';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A surface, separated from the canvas by a lightness step and a hairline.
 *
 * There is deliberately no shadow on the default card. On the warm paper canvas
 * Android renders elevation as a grey halo, and the palette already guarantees
 * a ≥4% lightness step between `canvas` and `surface`, which is what actually
 * makes a card read as a card.
 */
export const Card = React.memo(function Card({
  children,
  elevation = 'flat',
  padded = true,
  style,
}: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: theme.colors.hairline,
          padding: padded ? theme.spacing.base : 0,
          overflow: 'hidden',
        },
        elevation === 'raised' ? theme.elevation.soft : null,
        style,
      ]}
    >
      {children}
    </View>
  );
});

/** Full-width hairline. Never a thick coloured rule. */
export const Divider = React.memo(function Divider({
  inset = 0,
  style,
}: {
  inset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth * 2,
          backgroundColor: theme.colors.hairline,
          marginLeft: inset,
        },
        style,
      ]}
    />
  );
});
