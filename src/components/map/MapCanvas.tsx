import React, { useMemo } from 'react';
import { StyleSheet, View, type LayoutRectangle } from 'react-native';

import type { Coordinates } from '@/types';

import { useTheme } from '@/theme';
import { projectToBox, regionForPoints, type Region } from '@/utils/geo';

export interface MapPin<T> {
  id: string;
  coordinates: Coordinates;
  data: T;
}

export interface MapCanvasProps<T> {
  pins: MapPin<T>[];
  origin?: Coordinates | null;
  selectedId?: string | null;
  renderPin: (pin: MapPin<T>, selected: boolean, position: { left: number; top: number }) => React.ReactNode;
  onPressBackground?: () => void;
  region?: Region | null;
  style?: object;
}

/**
 * The fallback map surface.
 *
 * `react-native-maps` needs a development build; it is not present in Expo Go.
 * Rather than shipping a screen that is blank for anyone running the project
 * straight after `npm install`, the map layer degrades to this: a real
 * coordinate projection drawn on the app's own paper, with the same pins and
 * the same interactions. It is not a placeholder — it is a legible, usable
 * plan view that happens not to have streets on it.
 *
 * `NativeMap` upgrades to the real tiles automatically when the module is
 * available.
 */
export function MapCanvas<T>({
  pins,
  origin,
  selectedId,
  renderPin,
  onPressBackground,
  region: regionProp,
  style,
}: MapCanvasProps<T>) {
  const theme = useTheme();
  const [box, setBox] = React.useState<LayoutRectangle | null>(null);

  const region = useMemo(
    () =>
      regionProp ??
      regionForPoints([...pins.map((p) => p.coordinates), ...(origin ? [origin] : [])]),
    [regionProp, pins, origin],
  );

  const positioned = useMemo(() => {
    if (!box || !region) return [];
    return pins.map((pin) => {
      const { x, y } = projectToBox(pin.coordinates, region);
      return { pin, left: x * box.width, top: y * box.height };
    });
  }, [pins, region, box]);

  const originPoint = useMemo(() => {
    if (!box || !region || !origin) return null;
    const { x, y } = projectToBox(origin, region);
    return { left: x * box.width, top: y * box.height };
  }, [origin, region, box]);

  return (
    <View
      style={[styles.canvas, { backgroundColor: theme.colors.canvasSunk }, style]}
      onLayout={(event) => setBox(event.nativeEvent.layout)}
      onStartShouldSetResponder={() => Boolean(onPressBackground)}
      onResponderRelease={onPressBackground}
    >
      {/* A faint grid so the plane reads as a map rather than an empty box. */}
      <Grid color={theme.colors.hairline} />

      {originPoint ? (
        <View
          pointerEvents="none"
          style={[
            styles.origin,
            { left: originPoint.left - 9, top: originPoint.top - 9, borderColor: theme.colors.accent },
          ]}
        >
          <View style={[styles.originDot, { backgroundColor: theme.colors.accent }]} />
        </View>
      ) : null}

      {positioned.map(({ pin, left, top }) =>
        renderPin(pin, pin.id === selectedId, { left, top }),
      )}
    </View>
  );
}

const Grid = React.memo(function Grid({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 7 }, (_, i) => (
        <View
          key={`h${i}`}
          style={[styles.gridLine, { top: `${(i + 1) * 12.5}%`, backgroundColor: color }]}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <View
          key={`v${i}`}
          style={[styles.gridColumn, { left: `${(i + 1) * 16.6}%`, backgroundColor: color }]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  gridColumn: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
  origin: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  originDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
