import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RestaurantMap } from '@/components/map/RestaurantMap';
import { hasNativeMap } from '@/components/map/nativeMap';
import { MapPreviewCard } from '@/features/search/MapPreviewCard';
import { ScreenHeader, Text } from '@/components/ui';
import { useMapRestaurants } from '@/hooks/useRestaurants';
import { useUiStore } from '@/store/uiStore';
import { useTheme } from '@/theme';
import { decorate } from '@/features/restaurants/query';
import { useFavoritesStore } from '@/store/favoritesStore';

/**
 * Full-screen map.
 *
 * Reachable from the detail screen's location block and from the Explore
 * toggle. Shows every venue rather than the current filter, because arriving
 * here from a restaurant page means "what else is around this one".
 */
export default function MapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data } = useMapRestaurants();
  const location = useUiStore((s) => s.location);
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const restaurants = useMemo(() => {
    const now = new Date();
    return (data ?? []).map((r) => decorate(r, location, favoriteIds, now));
  }, [data, location, favoriteIds]);

  const selected = restaurants.find((r) => r.id === selectedId) ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <RestaurantMap
        restaurants={restaurants}
        origin={location}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <ScreenHeader title="Nearby" subtitle={location.label} />
      </View>

      {!hasNativeMap() ? (
        <View
          style={[
            styles.notice,
            {
              top: insets.top + 68,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.hairline,
              borderRadius: theme.radius.sm,
            },
          ]}
        >
          <Text variant="caption" tone="muted">
            Plan view — street tiles need a development build
          </Text>
        </View>
      ) : null}

      {selected ? (
        <MapPreviewCard restaurant={selected} onDismiss={() => setSelectedId(null)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  notice: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
