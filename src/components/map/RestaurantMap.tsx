import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Coordinates, RestaurantWithContext } from '@/types';

import { useTheme } from '@/theme';
import { formatRating, priceLabel } from '@/utils/format';
import { regionForPoints } from '@/utils/geo';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { MapCanvas, type MapPin } from './MapCanvas';
import { getNativeMap } from './nativeMap';

export interface RestaurantMapProps {
  restaurants: RestaurantWithContext[];
  origin: Coordinates | null;
  selectedId: string | null;
  onSelect: (restaurantId: string | null) => void;
}

/**
 * Map with pins.
 *
 * Pins carry the price tier and the rating, not just a dot: the whole reason to
 * look at a map instead of a list is to compare options in space, and a field
 * of identical dots forces a tap on each one to learn anything.
 *
 * Renders native tiles when `react-native-maps` is present, and the projected
 * canvas otherwise. Both paths use the same pin component so the two look like
 * the same product.
 */
export function RestaurantMap({ restaurants, origin, selectedId, onSelect }: RestaurantMapProps) {
  const theme = useTheme();
  const native = getNativeMap();

  const pins = useMemo<MapPin<RestaurantWithContext>[]>(
    () => restaurants.map((r) => ({ id: r.id, coordinates: r.coordinates, data: r })),
    [restaurants],
  );

  const region = useMemo(
    () => regionForPoints([...restaurants.map((r) => r.coordinates), ...(origin ? [origin] : [])]),
    [restaurants, origin],
  );

  const pinLabel = (restaurant: RestaurantWithContext) =>
    `${priceLabel(restaurant.priceTier)} · ${formatRating(restaurant.rating)}`;

  if (native && region) {
    const { MapView, Marker } = native;
    return (
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation={Boolean(origin)}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPress={() => onSelect(null)}
      >
        {restaurants.map((restaurant) => (
          <Marker
            key={restaurant.id}
            coordinate={restaurant.coordinates}
            onPress={() => onSelect(restaurant.id)}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 1 }}
          >
            <Pin
              label={pinLabel(restaurant)}
              name={restaurant.name}
              selected={restaurant.id === selectedId}
            />
          </Marker>
        ))}
      </MapView>
    );
  }

  return (
    <MapCanvas
      pins={pins}
      origin={origin}
      selectedId={selectedId}
      region={region}
      onPressBackground={() => onSelect(null)}
      style={{ backgroundColor: theme.colors.canvasSunk }}
      renderPin={(pin, selected, position) => (
        <Pressable
          key={pin.id}
          onPress={() => onSelect(pin.id)}
          accessibilityRole="button"
          accessibilityLabel={`${pin.data.name}, ${pinLabel(pin.data)}`}
          hitSlop={10}
          scaleTo={0.92}
          style={{
            position: 'absolute',
            left: position.left - 34,
            top: position.top - 34,
            zIndex: selected ? 10 : 1,
          }}
        >
          <Pin label={pinLabel(pin.data)} name={pin.data.name} selected={selected} />
        </Pressable>
      )}
    />
  );
}

const Pin = React.memo(function Pin({
  label,
  name,
  selected,
}: {
  label: string;
  name: string;
  selected: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={styles.pinWrap}>
      <View
        style={[
          styles.pin,
          theme.elevation.soft,
          {
            backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
            borderColor: selected ? theme.colors.accent : theme.colors.hairlineStrong,
            borderRadius: theme.radius.pill,
          },
        ]}
      >
        <Text
          variant="numeric"
          numberOfLines={1}
          style={{ color: selected ? theme.colors.accentOn : theme.colors.ink, fontSize: 12 }}
        >
          {label}
        </Text>
      </View>

      {selected ? (
        <Text
          variant="caption"
          numberOfLines={1}
          style={[styles.pinName, { color: theme.colors.ink }]}
        >
          {name}
        </Text>
      ) : null}

      <View
        style={[
          styles.stem,
          { backgroundColor: selected ? theme.colors.accent : theme.colors.hairlineStrong },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  pinWrap: {
    alignItems: 'center',
    width: 68,
  },
  pin: {
    paddingHorizontal: 9,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  pinName: {
    marginTop: 2,
    fontSize: 10,
    maxWidth: 68,
  },
  stem: {
    width: 2,
    height: 6,
  },
});
