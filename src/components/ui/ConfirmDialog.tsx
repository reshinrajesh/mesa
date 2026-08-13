import React from 'react';
import { Modal, Pressable as RNPressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation for destructive actions.
 *
 * Deliberately not `Alert.alert`: the system dialog cannot carry the app's
 * typography, and more importantly it cannot show a *loading* confirm button,
 * so a slow cancellation would leave the user tapping "Cancel booking" twice.
 *
 * The destructive action is never the default-styled button, and the wording
 * on it states what happens ("Cancel booking"), not "OK".
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Keep it',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(120)}
        style={[styles.root, { backgroundColor: theme.colors.scrim }]}
      >
        <RNPressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
          onPress={loading ? undefined : onCancel}
        />

        <Animated.View
          entering={ZoomIn.duration(180).springify().damping(18)}
          style={[
            styles.dialog,
            theme.elevation.lifted,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.xl,
              padding: theme.spacing.xl,
              gap: theme.spacing.md,
            },
          ]}
        >
          <Text variant="heading">{title}</Text>
          <Text variant="body" tone="muted">
            {message}
          </Text>

          <View style={[styles.actions, { marginTop: theme.spacing.sm }]}>
            <Button
              label={cancelLabel}
              variant="secondary"
              onPress={onCancel}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
});
