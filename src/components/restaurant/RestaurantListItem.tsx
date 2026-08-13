import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { RestaurantWithContext } from '@/types';

import { CUISINE_LABEL } from '@/constants/cuisines';
import { useTheme } from '@/theme';
import { formatDistance, joinMeta, priceLabel } from '@/utils/format';
import { Pressable } from '@/components/ui/Pressable';
import { Rating } from '@/components/ui/Rating';
import { SmartImage } from '@/components/ui/SmartImage';
import { Text } from '@/components/ui/Text';
import { FavoriteButton } from './FavoriteButton';
import { SlotStrip } from './SlotStrip';

export interface RestaurantListItemProps {
  restaurant: RestaurantWithContext;
  showSlots?: boolean;
}

/**
 * The list row used on Explore, Favourites and search results.
 *
 * A landscape thumbnail rather than the rail card's 4:3, because a vertical
 * list wants a short row: at 96pt tall, six venues fit a screen instead of two,
 * which is the whole reason someone switched from the map to the list.
 */
export const RestaurantListItem = React.memo(function RestaurantListItem({
  restaurant,
  showSlots = true,
}: RestaurantListItemProps) {
  const theme = useTheme();
  const router = useRouter();

  const distance = formatDistance(restaurant.distanceKm);
  const meta = joinMeta([
    CUISINE_LABEL[restaurant.cuisines[0]] ?? restaurant.kind,
    priceLabel(restaurant.priceTier),
    restaurant.neighbourhood,
  ]);

  return (
    <Pressable
      onPress={() => router.push(`/restaurant/${restaurant.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${restaurant.name}. ${meta}. Rated ${restaurant.rating}. ${
        restaurant.isOpenNow ? 'Open now' : 'Closed'
      }.`}
      scaleTo={0.985}
      style={[styles.row, { paddingVertical: theme.spacing.md, gap: theme.spacing.md }]}
    >
      <SmartImage
        uri={restaurant.images[0]}
        fallbackText={restaurant.name}
        accessibilityLabel=""
        style={[styles.thumb, { borderRadius: theme.radius.md }]}
      />

      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.titleRow}>
          <Text variant="heading" numberOfLines={1} style={{ flex: 1, fontSize: 17 }}>
            {restaurant.name}
          </Text>
          <Rating value={restaurant.rating} count={restaurant.reviewCount} />
        </View>

        <Text variant="caption" tone="muted" numberOfLines={1}>
          {meta}
        </Text>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: restaurant.isOpenNow
                  ? theme.colors.positive
                  : theme.colors.inkFaint,
              },
            ]}
          />
          <Text
            variant="caption"
            tone={restaurant.isOpenNow ? 'positive' : 'faint'}
            numberOfLines={1}
          >
            {restaurant.isOpenNow ? 'Open now' : 'Closed'}
          </Text>
          {distance ? (
            <Text variant="caption" tone="faint">
              · {distance}
            </Text>
          ) : null}
        </View>

        {showSlots && restaurant.nextSlots.length > 0 ? (
          <SlotStrip
            times={restaurant.nextSlots.slice(0, 3)}
            onSelect={(time) =>
              router.push({
                pathname: '/reserve/[restaurantId]',
                params: { restaurantId: restaurant.id, time },
              })
            }
            style={{ marginTop: 4 }}
          />
        ) : null}
      </View>

      <FavoriteButton
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        isFavorite={restaurant.isFavorite}
        variant="plain"
        size={34}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumb: {
    width: 96,
    height: 96,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
