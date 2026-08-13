import React, { useCallback } from 'react';
import { Dimensions, FlatList, View } from 'react-native';

import type { RestaurantWithContext } from '@/types';

import { useTheme } from '@/theme';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { RestaurantCard } from './RestaurantCard';

export interface RestaurantRailProps {
  title: string;
  subtitle?: string;
  restaurants: RestaurantWithContext[];
  /** Reasons keyed by restaurant id, from the recommendation engine. */
  reasons?: Record<string, string | null>;
  onSeeAll?: () => void;
  loading?: boolean;
  showSlots?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * The horizontal rail — the piece that makes the home screen feel like this app
 * rather than a template.
 *
 * The card width is computed so that the *next* card is always partly visible
 * past the right gutter. That peek is the affordance: a row of cards that ends
 * flush at the screen edge looks like a complete set, and people do not swipe
 * it. Snapping is to the card pitch so a flick lands cleanly rather than
 * stopping mid-card.
 */
export const RestaurantRail = React.memo(function RestaurantRail({
  title,
  subtitle,
  restaurants,
  reasons,
  onSeeAll,
  loading = false,
  showSlots = true,
}: RestaurantRailProps) {
  const theme = useTheme();

  const cardWidth = Math.min(
    268,
    SCREEN_WIDTH - theme.screenGutter * 2 - theme.layout.railPeek,
  );
  const pitch = cardWidth + theme.layout.railGap;

  const renderItem = useCallback(
    ({ item }: { item: RestaurantWithContext }) => (
      <RestaurantCard
        restaurant={item}
        width={cardWidth}
        reason={reasons?.[item.id] ?? null}
        showSlots={showSlots}
      />
    ),
    [cardWidth, reasons, showSlots],
  );

  const keyExtractor = useCallback((item: RestaurantWithContext) => item.id, []);

  if (!loading && restaurants.length === 0) return null;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <SectionHeader title={title} subtitle={subtitle} onSeeAll={onSeeAll} />

      {loading ? (
        <View
          style={{
            flexDirection: 'row',
            gap: theme.layout.railGap,
            paddingHorizontal: theme.screenGutter,
          }}
        >
          <SkeletonCard width={cardWidth} imageHeight={cardWidth * 0.72} />
          <SkeletonCard width={cardWidth} imageHeight={cardWidth * 0.72} />
        </View>
      ) : (
        <FlatList
          horizontal
          data={restaurants}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={pitch}
          snapToAlignment="start"
          contentContainerStyle={{
            paddingHorizontal: theme.screenGutter,
            gap: theme.layout.railGap,
          }}
          // Fixed pitch means the list can skip measurement entirely.
          getItemLayout={(_data, index) => ({
            length: pitch,
            offset: pitch * index,
            index,
          })}
          initialNumToRender={3}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
        />
      )}
    </View>
  );
});
