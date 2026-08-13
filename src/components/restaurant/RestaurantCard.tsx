import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { RestaurantWithContext } from '@/types';

import { CUISINE_LABEL } from '@/constants/cuisines';
import { useTheme } from '@/theme';
import { formatDistance, joinMeta, priceLabel } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';
import { Pressable } from '@/components/ui/Pressable';
import { Rating } from '@/components/ui/Rating';
import { SmartImage } from '@/components/ui/SmartImage';
import { Text } from '@/components/ui/Text';
import { FavoriteButton } from './FavoriteButton';
import { SlotStrip, WaitlistPill } from './SlotStrip';

export interface RestaurantCardProps {
  restaurant: RestaurantWithContext;
  /** Rail cards are fixed-width; the next one peeks past the gutter. */
  width: number;
  /** Optional one-line reason from the recommendation engine. */
  reason?: string | null;
  showSlots?: boolean;
}

/**
 * The rail card. This is the app's signature object.
 *
 * Composition rules it holds to:
 *  - the photo is 4:3 and does all the colour work; nothing is tinted over it
 *  - the name is the display serif, everything else is sans
 *  - the metadata line is a single row that never wraps: cuisine · price ·
 *    distance, built by `joinMeta` so a missing distance drops the separator
 *    rather than leaving a dangling dot
 *  - exactly one badge sits on the photo, and only when it says something
 */
export const RestaurantCard = React.memo(function RestaurantCard({
  restaurant,
  width,
  reason,
  showSlots = true,
}: RestaurantCardProps) {
  const theme = useTheme();
  const router = useRouter();

  const distance = formatDistance(restaurant.distanceKm);
  const meta = joinMeta([
    CUISINE_LABEL[restaurant.cuisines[0]] ?? restaurant.kind,
    priceLabel(restaurant.priceTier),
    distance,
  ]);

  const openBadge = restaurant.isOpenNow
    ? restaurant.minutesUntilStatusChange !== null && restaurant.minutesUntilStatusChange <= 60
      ? { label: `Closes in ${restaurant.minutesUntilStatusChange}m`, tone: 'warning' as const }
      : null
    : { label: 'Closed', tone: 'onPhoto' as const };

  return (
    <Pressable
      onPress={() => router.push(`/restaurant/${restaurant.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${restaurant.name}. ${meta}. Rated ${restaurant.rating} out of 5.`}
      accessibilityHint="Opens the restaurant"
      style={{ width }}
      scaleTo={0.975}
    >
      <View style={[styles.imageWrap, { borderRadius: theme.radius.md }]}>
        <SmartImage
          uri={restaurant.images[0]}
          fallbackText={restaurant.name}
          accessibilityLabel=""
          style={[styles.image, { height: width * 0.72 }]}
        />

        <FavoriteButton
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          isFavorite={restaurant.isFavorite}
          style={styles.heart}
        />

        {openBadge ? <Badge {...openBadge} style={styles.statusBadge} /> : null}
      </View>

      <View style={{ paddingTop: theme.spacing.sm, gap: 3 }}>
        <View style={styles.titleRow}>
          <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
            {restaurant.name}
          </Text>
          <Rating value={restaurant.rating} />
        </View>

        <Text variant="caption" tone="muted" numberOfLines={1}>
          {meta}
        </Text>

        {reason ? (
          <Text variant="caption" tone="accent" numberOfLines={1} style={{ marginTop: 1 }}>
            {reason}
          </Text>
        ) : null}

        {showSlots && restaurant.nextSlots.length > 0 ? (
          <SlotStrip
            times={restaurant.nextSlots.slice(0, 3)}
            onSelect={(time) =>
              router.push({
                pathname: '/reserve/[restaurantId]',
                params: { restaurantId: restaurant.id, time },
              })
            }
            style={{ marginTop: theme.spacing.xs }}
          />
        ) : showSlots && restaurant.waitlistTonight ? (
          <WaitlistPill
            restaurantName={restaurant.name}
            onPress={() =>
              router.push({
                pathname: '/reserve/[restaurantId]',
                params: { restaurantId: restaurant.id },
              })
            }
            style={{ marginTop: theme.spacing.xs }}
          />
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  imageWrap: {
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
  },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  statusBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
