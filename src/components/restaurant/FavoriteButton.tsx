import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { useToggleFavorite } from '@/hooks/useFavorites';
import { Pressable, useReduceMotion } from '@/components/ui/Pressable';

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
  const glyphColor = isFavorite
    ? theme.colors.accent
    : onPhoto
      ? '#FBF8F4'
      : theme.colors.inkMuted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isFavorite }}
      accessibilityLabel={
        isFavorite ? `Remove ${restaurantName} from favourites` : `Save ${restaurantName} to favourites`
      }
      hitSlop={size < 44 ? (44 - size) / 2 : 6}
      scaleTo={1}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: onPhoto ? 'rgba(20,15,12,0.45)' : theme.colors.surface,
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
