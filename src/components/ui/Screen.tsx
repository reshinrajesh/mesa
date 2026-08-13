import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface ScreenProps {
  /** Optional so a screen can render its own blank canvas while data settles. */
  children?: React.ReactNode;
  /** Adds the standard horizontal gutter. Off for full-bleed scrollers. */
  padded?: boolean;
  /** Applies the top safe-area inset. Off when a hero image runs under the notch. */
  edgeTop?: boolean;
  edgeBottom?: boolean;
  /** Wraps in a KeyboardAvoidingView. On for anything with a text field. */
  keyboardSafe?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  padded = false,
  edgeTop = true,
  edgeBottom = false,
  keyboardSafe = false,
  style,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const content = (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.canvas,
          paddingTop: edgeTop ? insets.top : 0,
          paddingBottom: edgeBottom ? insets.bottom : 0,
          paddingHorizontal: padded ? theme.screenGutter : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!keyboardSafe) return content;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.canvas }}
      // Android resizes the window itself; adding padding on top double-counts.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  );
}

export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  /** Shows the back chevron. Defaults on when the router can go back. */
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  /** Serif title, for content screens. Sans for utility screens. */
  serif?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  right,
  serif = false,
  style,
}: ScreenHeaderProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View
      style={[
        styles.header,
        { paddingHorizontal: theme.screenGutter, paddingVertical: theme.spacing.md },
        style,
      ]}
    >
      {showBack ? (
        <Pressable
          onPress={() => (onBack ? onBack() : router.back())}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          scaleTo={0.88}
          style={[
            styles.iconButton,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.hairline },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.ink} />
        </Pressable>
      ) : (
        <View style={{ width: 40 }} />
      )}

      <View style={styles.headerTitle}>
        {title ? (
          <Text variant={serif ? 'heading' : 'subheading'} numberOfLines={1} center>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1} center>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.headerRight}>{right ?? <View style={{ width: 40 }} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
