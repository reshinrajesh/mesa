import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';
import type { TextVariant } from '@/theme/typography';

type Tone = 'primary' | 'muted' | 'faint' | 'accent' | 'on' | 'positive' | 'warning' | 'danger';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: Tone;
  /** Centre without reaching for an inline style. */
  center?: boolean;
  children?: React.ReactNode;
}

/**
 * The only text primitive.
 *
 * Two rules it exists to enforce:
 *
 * 1. Weight comes from `variant`, which picks a font *family*. Nothing in the
 *    app sets `fontWeight`, because Android will not synthesise a bold from a
 *    custom family and silently renders regular instead.
 * 2. Every variant carries its own `maxFontSizeMultiplier`. Dynamic type is
 *    supported, but a 34pt display line at 2x would break every card, so the
 *    display sizes are capped tighter than body copy.
 */
export const Text = React.memo(function Text({
  variant = 'body',
  tone = 'primary',
  center,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();

  const color: Record<Tone, string> = {
    primary: theme.colors.ink,
    muted: theme.colors.inkMuted,
    faint: theme.colors.inkFaint,
    accent: theme.colors.accent,
    on: theme.colors.inkOn,
    positive: theme.colors.positive,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
  };

  const base: TextStyle = {
    ...theme.text[variant],
    color: color[tone],
    ...(center ? { textAlign: 'center' } : null),
  };

  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={theme.maxFontSizeMultiplier[variant]}
      style={[base, style]}
    />
  );
});
