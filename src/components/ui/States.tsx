import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { toAppError } from '@/utils/errors';
import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Empty state.
 *
 * Always names the next move. "No favourites yet" alone is a dead end; the
 * button out is what makes an empty screen a step rather than a wall.
 */
export const EmptyState = React.memo(function EmptyState({
  icon = 'search-outline',
  title,
  message,
  action,
  secondaryAction,
  compact = false,
  style,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { paddingVertical: compact ? theme.spacing.xl : theme.spacing.huge, gap: theme.spacing.md },
        style,
      ]}
    >
      <View
        style={[
          styles.glyph,
          { backgroundColor: theme.colors.canvasSunk, borderRadius: theme.radius.pill },
        ]}
      >
        <Ionicons name={icon} size={24} color={theme.colors.inkMuted} />
      </View>

      <Text variant="heading" center>
        {title}
      </Text>

      {message ? (
        <Text variant="body" tone="muted" center style={{ maxWidth: 300 }}>
          {message}
        </Text>
      ) : null}

      {action || secondaryAction ? (
        <View style={[styles.actions, { marginTop: theme.spacing.sm }]}>
          {action ? <Button label={action.label} onPress={action.onPress} /> : null}
          {secondaryAction ? (
            <Button label={secondaryAction.label} variant="ghost" onPress={secondaryAction.onPress} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Error state.
 *
 * Reads `AppError.title` / `.message`, which are always written for a person.
 * The raw provider message stays on `debugMessage` and is never rendered — it
 * tells the user nothing and can leak schema detail.
 */
export const ErrorState = React.memo(function ErrorState({
  error,
  onRetry,
  compact,
  style,
}: ErrorStateProps) {
  const appError = toAppError(error);

  return (
    <EmptyState
      icon={appError.code === 'network' ? 'cloud-offline-outline' : 'alert-circle-outline'}
      title={appError.title}
      message={appError.message}
      action={
        onRetry && appError.retryable
          ? { label: appError.action ?? 'Try again', onPress: onRetry }
          : undefined
      }
      compact={compact}
      style={style}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  glyph: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
