import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { useToggleFavorite } from '@/hooks/useFavorites';
import { Pressable, useReduceMotion } from '@/components/ui/Pressable';
import { hitSlopFor } from '@/components/ui/touchTarget';

export interface FavoriteButtonProps {
  restaurantId: string;
  restaurantName: string;
  isFavorite: boolean;
  /** `onPhoto` gives it its own ground so it survives a light image. */
  variant?: 'onPhoto' | 'plain';
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The heart.
 *
 * Optimistic: the fill flips on press and the write happens behind it, with a
 * rollback and a toast if it fails. The little overshoot on the way to filled
 * is the only decorative motion in the app, and it is here because this is the
 * one control people tap for the pleasure of it.
 */
export const FavoriteButton = React.memo(function FavoriteButton({
  restaurantId,
  restaurantName,
  isFavorite,
  variant = 'onPhoto',
  size = 36,
  style,
}: FavoriteButtonProps) {
  const theme = useTheme();
  const toggle = useToggleFavorite();
  const reduceMotion = useReduceMotion();
  const pop = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const onPress = () => {
    if (!reduceMotion && !isFavorite) {
      pop.value = withSequence(withSpring(1.25, { damping: 8, stiffness: 400 }), withSpring(1));
    }
    void toggle(restaurantId, restaurantName);
  };

  const onPhoto = variant === 'onPhoto';
  /**
   * On a photo the saved heart is white, not terracotta.
   *
   * Not a preference: a chip over a bright photo lands mid-grey, and a mid-grey
   * ground is the one place a mid-tone accent has nowhere to go — the saved
   * heart measured 1.6:1 there, well under the 3:1 a control owes the eye. No
   * terracotta clears it, at any opacity. So on photography the state is carried
   * by the glyph filling in, which is stronger than a hue anyway and works for
   * someone who cannot see the hue at all. Off photography the accent stays.
   */
  const glyphColor = onPhoto
    ? theme.colors.onPhoto
    : isFavorite
      ? theme.colors.accent
      : theme.colors.inkMuted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isFavorite }}
      accessibilityLabel={
        isFavorite ? `Remove ${restaurantName} from favourites` : `Save ${restaurantName} to favourites`
      }
      hitSlop={hitSlopFor(size)}
      scaleTo={1}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: onPhoto ? theme.colors.photoChip : theme.colors.surface,
          borderColor: onPhoto ? 'transparent' : theme.colors.hairline,
          borderWidth: onPhoto ? 0 : StyleSheet.hairlineWidth * 2,
        },
        style,
      ]}
    >
      <Animated.View style={animatedStyle}>
        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={size * 0.5} color={glyphColor} />
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
