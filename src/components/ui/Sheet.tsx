import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Modal, Pressable as RNPressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Footer pinned above the safe area — the "Show results" bar. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Fraction of the screen the sheet may occupy. */
  maxHeightRatio?: number;
}

/**
 * Bottom sheet.
 *
 * Built on `Modal` rather than a portal so it survives navigation and captures
 * the hardware back button on Android for free. Drag-to-dismiss only commits
 * past a third of the sheet's height or on a fast flick, because a sheet that
 * closes on a 20px accidental drag loses the user's filter selections.
 */
export function Sheet({
  visible,
  onClose,
  title,
  footer,
  children,
  maxHeightRatio = 0.88,
}: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const sheetHeight = useSharedValue(600);

  useEffect(() => {
    if (visible) translateY.value = 0;
  }, [visible, translateY]);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      // Downward only. Dragging up must not detach the sheet from the bottom.
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      const past = translateY.value > sheetHeight.value / 3;
      const flicked = event.velocityY > 900;
      if (past || flicked) {
        translateY.value = withTiming(sheetHeight.value, { duration: 180 }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, theme.motion.spring);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <RNPressable
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }]}
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
        />

        <GestureDetector gesture={pan}>
          <Animated.View
            onLayout={(event) => {
              sheetHeight.value = event.nativeEvent.layout.height;
            }}
            style={[
              styles.sheet,
              theme.elevation.lifted,
              {
                backgroundColor: theme.colors.canvas,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                maxHeight: `${maxHeightRatio * 100}%`,
                paddingBottom: insets.bottom,
              },
              sheetStyle,
            ]}
          >
            <View style={styles.grabberRow}>
              <View style={[styles.grabber, { backgroundColor: theme.colors.hairlineStrong }]} />
            </View>

            {title ? (
              <View style={[styles.titleRow, { paddingHorizontal: theme.screenGutter }]}>
                <Text variant="heading">{title}</Text>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={12}
                  scaleTo={0.88}
                  style={[styles.close, { backgroundColor: theme.colors.canvasSunk }]}
                >
                  <Ionicons name="close" size={18} color={theme.colors.ink} />
                </Pressable>
              </View>
            ) : null}

            <View style={{ flexShrink: 1 }}>{children}</View>

            {footer ? (
              <View
                style={[
                  styles.footer,
                  {
                    paddingHorizontal: theme.screenGutter,
                    borderTopColor: theme.colors.hairline,
                    backgroundColor: theme.colors.canvas,
                  },
                ]}
              >
                {footer}
              </View>
            ) : null}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
  },
  grabberRow: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
