import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Card, Divider, EmptyState, Rating, Screen, ScreenHeader, Skeleton, Text } from '@/components/ui';
import { useRestaurant } from '@/hooks/useRestaurants';
import { useReviews } from '@/hooks/useReviews';
import { useTheme } from '@/theme';
import { formatMonthYear } from '@/utils/date';
import { formatRating, pluralise } from '@/utils/format';

export default function ReviewsScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: restaurant } = useRestaurant(id);
  const { reviews, breakdown, isLoading } = useReviews(id);

  return (
    <Screen>
      <ScreenHeader title={restaurant?.name ?? 'Reviews'} subtitle="Reviews" />

      {isLoading ? (
        <View style={{ padding: theme.screenGutter, gap: theme.spacing.base }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={96} radius={theme.radius.lg} />
          ))}
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: theme.screenGutter,
            paddingBottom: theme.spacing.xxxl,
            gap: theme.spacing.md,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            breakdown && breakdown.total > 0 ? (
              <View style={{ gap: theme.spacing.base, paddingBottom: theme.spacing.sm }}>
                <View style={styles.summary}>
                  <Text variant="display" style={{ fontSize: 44, lineHeight: 48 }}>
                    {formatRating(breakdown.average)}
                  </Text>

                  <View style={{ flex: 1, gap: 4 }}>
                    {/* Highest star first, which is how people read a breakdown. */}
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = breakdown.counts[star - 1];
                      const ratio = breakdown.total === 0 ? 0 : count / breakdown.total;
                      return (
                        <View key={star} style={styles.barRow}>
                          <Text variant="caption" tone="faint" style={{ width: 10 }}>
                            {star}
                          </Text>
                          <View
                            style={[styles.barTrack, { backgroundColor: theme.colors.canvasSunk }]}
                          >
                            <View
                              style={[
                                styles.barFill,
                                {
                                  width: `${Math.max(ratio * 100, count > 0 ? 3 : 0)}%`,
                                  backgroundColor: theme.colors.ink,
                                },
                              ]}
                            />
                          </View>
                          <Text variant="caption" tone="faint" style={{ width: 26, textAlign: 'right' }}>
                            {count}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <Text variant="caption" tone="muted">
                  {pluralise(breakdown.total, 'review')} · reviews marked “Booked on Mesa” come from
                  a completed reservation.
                </Text>

                <Divider />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Card style={{ gap: theme.spacing.sm }}>
              <View style={styles.header}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.canvasSunk }]}>
                  <Text variant="label">{item.authorInitials}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {item.authorName}
                  </Text>
                  <Text variant="caption" tone="faint">
                    {formatMonthYear(item.createdAt)}
                    {item.verified ? ' · Booked on Mesa' : ''}
                  </Text>
                </View>

                <Rating value={item.rating} />
              </View>

              <Text variant="body" tone="muted" style={{ lineHeight: 22 }}>
                {item.body}
              </Text>

              {item.highlights.length > 0 ? (
                <View style={styles.highlights}>
                  {item.highlights.map((highlight) => (
                    <View
                      key={highlight}
                      style={[
                        styles.highlight,
                        { backgroundColor: theme.colors.canvasSunk, borderRadius: theme.radius.xs },
                      ]}
                    >
                      <Text variant="caption" tone="muted">
                        {highlight}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubble-outline"
              title="No reviews yet"
              message="Be the first to say something after you have eaten here."
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  highlight: {
    paddingHorizontal: 9,
    height: 26,
    justifyContent: 'center',
  },
});
