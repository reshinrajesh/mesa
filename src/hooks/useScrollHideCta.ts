import { useCallback } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

/**
 * The sticky CTA's hide-on-scroll behaviour.
 *
 * Down hides, up reveals — the standard, because the bar is what the screen is
 * for and hiding it permanently would be hostile. The 12px dead zone stops the
 * bar flickering on the small jitter that a finger produces while reading.
 */
export function useScrollHideCta(): {
  hidden: SharedValue<number>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
} {
  const hidden = useSharedValue(0);
  const lastY = useSharedValue(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const delta = y - lastY.value;

      // Always visible at the top of the scroll, whatever the last direction was.
      if (y < 40) {
        hidden.value = withTiming(0, { duration: 180 });
      } else if (delta > 12) {
        hidden.value = withTiming(1, { duration: 180 });
      } else if (delta < -12) {
        hidden.value = withTiming(0, { duration: 180 });
      }

      lastY.value = y;
    },
    [hidden, lastY],
  );

  return { hidden, onScroll };
}
