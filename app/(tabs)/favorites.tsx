import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RestaurantListItem } from '@/components/restaurant/RestaurantListItem';
import { Chip, EmptyState, Screen, SkeletonRow, Text } from '@/components/ui';
import { useFavoriteRestaurants } from '@/hooks/useFavorites';
import { useTheme } from '@/theme';
import { pluralise } from '@/utils/format';

/**
 * Favourites.
 *
 * Saved venues keep their slot strip, which is the whole point: someone who
 * saved a place is the person most likely to book it, and making them open the
 * detail screen first to see a time is a wasted step.
 *
 * The "Open now" chip is the only filter here. A saved list of eight does not
 * need a filter sheet, but "which of these can I actually get into tonight" is
 * a real question.
 */
export default function FavoritesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { items, isLoading } = useFavoriteRestaurants();
  const [openOnly, setOpenOnly] = useState(false);

  const visible = useMemo(
    () => (openOnly ? items.filter((r) => r.isOpenNow) : items),
    [items, openOnly],
  );

  return (
    <Screen>
      <View
        style={{
          paddingHorizontal: theme.screenGutter,
          paddingTop: theme.spacing.md,
          gap: theme.spacing.md,
        }}
      >
        <Text variant="title">Saved places</Text>

        {items.length > 0 ? (
          <View style={styles.row}>
            <Chip
              label="Open now"
              icon="time-outline"
              size="sm"
              selected={openOnly}
              onPress={() => setOpenOnly((v) => !v)}
            />
            <Text variant="caption" tone="muted" style={{ alignSelf: 'center' }}>
              {pluralise(visible.length, 'place')}
            </Text>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: theme.screenGutter, paddingTop: theme.spacing.sm }}>
          {[0, 1, 2].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : (
        <FlashList
          style={{ flex: 1 }}
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RestaurantListItem restaurant={item} />}
          contentContainerStyle={{
            paddingHorizontal: theme.screenGutter,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.xxxl,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            openOnly ? (
              <EmptyState
                icon="moon-outline"
                title="None of your places are open"
                message="Everything you have saved is closed right now. They will be back tomorrow."
                action={{ label: 'Show all saved', onPress: () => setOpenOnly(false) }}
                compact
              />
            ) : (
              <EmptyState
                icon="heart-outline"
                title="Nothing saved yet"
                message="Tap the heart on any restaurant and it lands here, with its next free tables ready to book."
                action={{ label: 'Find somewhere', onPress: () => router.push('/(tabs)/explore') }}
              />
            )
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
});
