import React, { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { useReduceMotion } from './Pressable';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Loading placeholder.
 *
 * A slow opacity pulse rather than a sweeping gradient: the sweep needs a
 * gradient layer per element, and a list of twelve of them costs more than the
 * content it is standing in for. Reduce Motion gets a static block.
 */
export const Skeleton = React.memo(function Skeleton({
  width = '100%',
  height = 14,
  radius,
  style,
}: SkeletonProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(0.6);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: reduceMotion ? 0.8 : pulse.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.xs,
          backgroundColor: theme.colors.skeleton,
        },
        animatedStyle,
        style,
      ]}
    />
  );
});

/** The card skeleton used by the home rails and the explore list. */
export const SkeletonCard = React.memo(function SkeletonCard({
  width = 240,
  imageHeight = 150,
}: {
  width?: number;
  imageHeight?: number;
}) {
  const theme = useTheme();
  return (
    <View style={{ width, gap: theme.spacing.sm }}>
      <Skeleton width="100%" height={imageHeight} radius={theme.radius.md} />
      <Skeleton width="72%" height={17} />
      <Skeleton width="52%" height={13} />
    </View>
  );
});

export const SkeletonRow = React.memo(function SkeletonRow() {
  const theme = useTheme();
  return (
    <View style={[styles.row, { gap: theme.spacing.md, paddingVertical: theme.spacing.md }]}>
      <Skeleton width={84} height={84} radius={theme.radius.md} />
      <View style={{ flex: 1, gap: theme.spacing.sm, paddingTop: 4 }}>
        <Skeleton width="68%" height={17} />
        <Skeleton width="44%" height={13} />
        <Skeleton width="80%" height={13} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
});
