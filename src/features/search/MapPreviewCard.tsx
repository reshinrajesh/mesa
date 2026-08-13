import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RestaurantWithContext } from '@/types';

import { CUISINE_LABEL } from '@/constants/cuisines';
import { Button, Pressable, Rating, SmartImage, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { formatDistance, joinMeta, priceLabel } from '@/utils/format';

export interface MapPreviewCardProps {
  restaurant: RestaurantWithContext;
  onDismiss: () => void;
}

/**
 * The card that appears when a pin is tapped.
 *
 * Two actions, and they are the only two anyone wants from a map: look closer,
 * or book. Anything else belongs on the detail screen.
 */
export function MapPreviewCard({ restaurant, onDismiss }: MapPreviewCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const meta = joinMeta([
    CUISINE_LABEL[restaurant.cuisines[0]] ?? restaurant.kind,
    priceLabel(restaurant.priceTier),
    formatDistance(restaurant.distanceKm),
  ]);

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(160)}
      style={[
        styles.wrap,
        {
          bottom: insets.bottom + theme.spacing.base,
          paddingHorizontal: theme.screenGutter,
        },
      ]}
    >
      <View
        style={[
          styles.card,
          theme.elevation.lifted,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderColor: theme.colors.hairline,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
          },
        ]}
      >
        <Pressable
          onPress={() => router.push(`/restaurant/${restaurant.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`${restaurant.name}, ${meta}`}
          scaleTo={0.99}
          style={styles.body}
        >
          <SmartImage
            uri={restaurant.images[0]}
            fallbackText={restaurant.name}
            accessibilityLabel=""
            style={{ width: 64, height: 64, borderRadius: theme.radius.sm }}
          />

          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="heading" numberOfLines={1} style={{ fontSize: 17 }}>
              {restaurant.name}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {meta}
            </Text>
            <Rating value={restaurant.rating} count={restaurant.reviewCount} />
          </View>

          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close preview"
            hitSlop={12}
            scaleTo={0.85}
            style={{ alignSelf: 'flex-start' }}
          >
            <Ionicons name="close" size={17} color={theme.colors.inkFaint} />
          </Pressable>
        </Pressable>

        <View style={styles.actions}>
          <Button
            label="View restaurant"
            variant="secondary"
            size="sm"
            onPress={() => router.push(`/restaurant/${restaurant.id}`)}
            style={{ flex: 1 }}
          />
          <Button
            label="Reserve"
            size="sm"
            onPress={() =>
              router.push({
                pathname: '/reserve/[restaurantId]',
                params: { restaurantId: restaurant.id },
              })
            }
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
