import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Renders the show/hide toggle and starts obscured. */
  secure?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Text field.
 *
 * The error line is reserved space rather than a conditional row, so validating
 * a form does not shunt every field below it down the screen while the user is
 * still typing in one of them.
 */
export const Input = React.forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, icon, secure = false, containerStyle, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.ink
      : theme.colors.hairline;

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="label" tone="muted" style={{ marginBottom: theme.spacing.sm }}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surface,
            borderColor,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.base,
          },
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? theme.colors.ink : theme.colors.inkFaint}
          />
        ) : null}

        <TextInput
          ref={ref}
          {...rest}
          secureTextEntry={secure && !revealed}
          placeholderTextColor={theme.colors.inkFaint}
          selectionColor={theme.colors.accent}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          maxFontSizeMultiplier={1.6}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            theme.text.body,
            { color: theme.colors.ink },
          ]}
        />

        {secure ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={12}
            scaleTo={0.9}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={theme.colors.inkMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {/* Reserved so validation does not reflow the form. */}
      <View style={styles.messageRow}>
        {error ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : hint ? (
          <Text variant="caption" tone="faint">
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
  },
  messageRow: {
    minHeight: 20,
    paddingTop: 4,
  },
});
