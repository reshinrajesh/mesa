import React, { useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export interface PressableProps extends Omit<RNPressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Override the press scale. `1` disables it for full-bleed surfaces. */
  scaleTo?: number;
  /** Adds a subtle opacity dip alongside the scale. */
  dim?: boolean;
  children?: React.ReactNode;
}

/**
 * Every pressable surface in the app.
 *
 * It exists for one reason: press feedback must be a *press* response, not a
 * hover one. On touch there is no hover, so a control that only reacts on
 * hover never acknowledges the tap at all. Scale-on-press-in at 110ms is fast
 * enough to read as the finger's own doing.
 *
 * It respects Reduce Motion by falling back to an opacity change, and it
 * enforces the 44pt minimum through `hitSlop` when a control renders smaller.
 */
export const Pressable = React.forwardRef<React.ComponentRef<typeof RNPressable>, PressableProps>(
  function Pressable({ style, scaleTo, dim = false, disabled, children, ...rest }, ref) {
    const theme = useTheme();
    const reduceMotion = useReduceMotion();
    const pressed = useSharedValue(0);

    const target = scaleTo ?? theme.motion.pressScale;

    const onPressIn = useCallback<NonNullable<RNPressableProps['onPressIn']>>(
      (event) => {
        pressed.value = withTiming(1, { duration: theme.motion.duration.instant });
        rest.onPressIn?.(event);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [pressed, theme.motion.duration.instant, rest.onPressIn],
    );

    const onPressOut = useCallback<NonNullable<RNPressableProps['onPressOut']>>(
      (event) => {
        pressed.value = withTiming(0, { duration: theme.motion.duration.fast });
        rest.onPressOut?.(event);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [pressed, theme.motion.duration.fast, rest.onPressOut],
    );

    const animatedStyle = useAnimatedStyle(() => {
      if (reduceMotion) {
        return { opacity: pressed.value === 1 ? 0.7 : 1 };
      }
      const scale = 1 - pressed.value * (1 - target);
      return {
        transform: [{ scale }],
        opacity: dim ? 1 - pressed.value * 0.15 : 1,
      };
    }, [reduceMotion, target, dim]);

    return (
      <AnimatedPressable
        ref={ref}
        {...rest}
        disabled={disabled}
        accessibilityState={{ disabled: Boolean(disabled), ...rest.accessibilityState }}
        hitSlop={rest.hitSlop ?? 6}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[style, animatedStyle, disabled ? { opacity: 0.45 } : null]}
      >
        {children}
      </AnimatedPressable>
    );
  },
);

/** Reads the OS Reduce Motion setting and keeps it current. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => mounted && setReduce(value))
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduce;
}
