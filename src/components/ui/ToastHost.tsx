import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { useUiStore } from '@/store/uiStore';
import { Pressable } from './Pressable';
import { Text } from './Text';

/**
 * Toast host, mounted once at the root.
 *
 * Toasts enter from the top rather than the bottom: the bottom is where the
 * tab bar and the sticky "Reserve a table" bar live, and covering the primary
 * action to announce that something succeeded is precisely backwards.
 */
export function ToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  const icons = {
    neutral: 'information-circle' as const,
    positive: 'checkmark-circle' as const,
    danger: 'alert-circle' as const,
  };

  const tints = {
    neutral: theme.colors.inkMuted,
    positive: theme.colors.positive,
    danger: theme.colors.danger,
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + 8, paddingHorizontal: theme.screenGutter }]}
    >
      {toasts.map((item) => (
        <Animated.View
          key={item.id}
          entering={FadeInDown.duration(220)}
          exiting={FadeOutUp.duration(160)}
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            theme.elevation.lifted,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.md,
              borderColor: theme.colors.hairline,
              padding: theme.spacing.md,
            },
          ]}
        >
          <Ionicons name={icons[item.tone]} size={20} color={tints[item.tone]} />

          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {item.title}
            </Text>
            {item.message ? (
              <Text variant="caption" tone="muted" numberOfLines={3}>
                {item.message}
              </Text>
            ) : null}
          </View>

          {item.action ? (
            <Pressable
              onPress={() => {
                item.action?.onPress();
                dismiss(item.id);
              }}
              accessibilityRole="button"
              hitSlop={10}
              style={{ paddingHorizontal: 6, paddingVertical: 8 }}
            >
              <Text variant="label" tone="accent">
                {item.action.label}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => dismiss(item.id)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              hitSlop={12}
              scaleTo={0.85}
            >
              <Ionicons name="close" size={16} color={theme.colors.inkFaint} />
            </Pressable>
          )}
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
