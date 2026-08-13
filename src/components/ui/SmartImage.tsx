import { Image, type ImageContentFit } from 'expo-image';
import React, { useState } from 'react';
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export interface SmartImageProps {
  uri?: string;
  /** Drawn as a monogram if the image fails or is missing. */
  fallbackText: string;
  /** Accepts view styles too — the fallback branch renders a View. */
  style?: StyleProp<ViewStyle & ImageStyle>;
  contentFit?: ImageContentFit;
  /** Disable the fade for images that are already on screen when they load. */
  transition?: number;
  accessibilityLabel?: string;
}

/**
 * Every photo in the app renders through here.
 *
 * This design leans on large photography, which means a failed image is not a
 * small cosmetic problem — it is a hole in the middle of the screen. Rather
 * than a grey rectangle, a failure falls back to a warm card with the venue's
 * initials set in the display serif, which reads as a deliberate treatment.
 *
 * `expo-image` handles the memory and disk cache, so a card scrolled past and
 * back does not re-download.
 */
export const SmartImage = React.memo(function SmartImage({
  uri,
  fallbackText,
  style,
  contentFit = 'cover',
  transition = 260,
  accessibilityLabel,
}: SmartImageProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);

  const monogram = fallbackText
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  if (!uri || failed) {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel ?? fallbackText}
        style={[styles.fallback, { backgroundColor: theme.colors.canvasSunk }, style]}
      >
        <Text variant="title" tone="faint" style={{ letterSpacing: 1 }}>
          {monogram}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      accessible
      accessibilityLabel={accessibilityLabel ?? fallbackText}
      style={[{ backgroundColor: theme.colors.canvasSunk }, style]}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk"
      recyclingKey={uri}
      onError={() => setFailed(true)}
    />
  );
});

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
