import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { Cuisine } from '@/types';

import { CuisineRow } from '@/components/restaurant/CuisineRow';
import { RestaurantRail } from '@/components/restaurant/RestaurantRail';
import {
  Badge,
  Card,
  ErrorState,
  Pressable,
  Screen,
  SectionHeader,
  SkeletonCard,
  SmartImage,
  Text,
} from '@/components/ui';
import { useNotifications } from '@/hooks/useNotifications';
import { useRestaurantCollections } from '@/hooks/useRestaurants';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useReservations } from '@/hooks/useReservations';
import { restaurantById } from '@/mock/restaurants';
import { useAuthStore } from '@/store/authStore';
import { useSearchStore } from '@/store/searchStore';
import { useUiStore } from '@/store/uiStore';
import { useTheme } from '@/theme';
import { dayPartLabel, formatDateKeyShort, formatTime } from '@/utils/date';
import { formatPartySize } from '@/utils/format';

/**
 * Home.
 *
 * A utility surface, not a marketing page: no hero, no value proposition. It
 * orients you (where and when you are), shows status (your next booking), and
 * enables the action (find a table). Everything else is rails.
 *
 * The rails are ordered by how likely each is to end the session successfully:
 * your own next booking, then tonight's availability, then personal
 * recommendations, then the broader discovery sets.
 */
export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const location = useUiStore((s) => s.location);
  const recentlyViewed = useUiStore((s) => s.recentlyViewed);
  const setQuery = useSearchStore((s) => s.setQuery);

  const collections = useRestaurantCollections();
  const { upcoming } = useReservations();
  const { unreadCount } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const pool = collections.data?.recommended ?? [];
  const scored = useRecommendations(pool, 8);

  const reasons = useMemo(
    () => Object.fromEntries(scored.map((s) => [s.restaurant.id, s.reason])),
    [scored],
  );

  const recentRestaurants = useMemo(() => {
    const all = [
      ...(collections.data?.recommended ?? []),
      ...(collections.data?.topRated ?? []),
      ...(collections.data?.popularNearYou ?? []),
    ];
    const byId = new Map(all.map((r) => [r.id, r]));
    return recentlyViewed.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));
  }, [recentlyViewed, collections.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await collections.refetch();
    setRefreshing(false);
  }, [collections]);

  const goToCuisine = (cuisine: Cuisine) => {
    setQuery(cuisine);
    router.push('/(tabs)/explore');
  };

  const firstName = user?.name?.split(' ')[0];

  if (collections.isError) {
    return (
      <Screen>
        <ErrorState error={collections.error} onRetry={() => void collections.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing.xxxl, gap: theme.spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.inkMuted}
            colors={[theme.colors.accent]}
          />
        }
      >
        {/* Orient */}
        <View style={{ paddingHorizontal: theme.screenGutter, paddingTop: theme.spacing.md, gap: theme.spacing.base }}>
          <View style={styles.topRow}>
            <Pressable
              onPress={() => router.push('/location-picker')}
              accessibilityRole="button"
              accessibilityLabel={`Change location, currently ${location.label}`}
              style={styles.locationChip}
              scaleTo={0.97}
            >
              <Ionicons name="location-outline" size={15} color={theme.colors.accent} />
              <Text variant="label" numberOfLines={1} style={{ maxWidth: 180 }}>
                {location.label}
              </Text>
              <Ionicons name="chevron-down" size={13} color={theme.colors.inkMuted} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/notifications')}
              accessibilityRole="button"
              // The count belongs in the label, not only in a dot: a dot is
              // "something happened" to anyone who can see it and nothing at
              // all to anyone who cannot.
              accessibilityLabel={
                unreadCount > 0
                  ? `Notifications, ${unreadCount} unread`
                  : 'Notifications, none unread'
              }
              hitSlop={10}
              scaleTo={0.88}
              style={[
                styles.iconButton,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.hairline },
              ]}
            >
              <Ionicons name="notifications-outline" size={19} color={theme.colors.ink} />
              {unreadCount > 0 ? (
                // Ringed in the canvas colour so it reads as a dot on the bell
                // rather than a smudge where it overlaps the button's edge.
                <View
                  style={[
                    styles.unreadDot,
                    { backgroundColor: theme.colors.accent, borderColor: theme.colors.canvas },
                  ]}
                />
              ) : null}
            </Pressable>
          </View>

          <View style={{ gap: 2 }}>
            <Text variant="label" tone="muted">
              {dayPartLabel()}
            </Text>
            <Text variant="display">
              {firstName ? `Where to, ${firstName}?` : 'Where are we\neating tonight?'}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="search"
            accessibilityLabel="Search restaurants, cuisines and places"
            scaleTo={0.99}
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.hairline,
                borderRadius: theme.radius.pill,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={theme.colors.inkFaint} />
            <Text variant="body" tone="faint">
              Restaurants, cuisines, places
            </Text>
          </Pressable>
        </View>

        {/* Status: the next booking, if there is one */}
        {upcoming.length > 0 ? <NextBookingCard reservationIndex={0} /> : null}

        <CuisineRow onSelect={goToCuisine} />

        {collections.isLoading ? (
          <View style={{ paddingHorizontal: theme.screenGutter, flexDirection: 'row', gap: theme.spacing.md }}>
            <SkeletonCard width={250} imageHeight={180} />
            <SkeletonCard width={250} imageHeight={180} />
          </View>
        ) : (
          <>
            <RestaurantRail
              title="Free tonight"
              subtitle="Tables still open in the next few hours"
              restaurants={collections.data?.availableTonight ?? []}
            />

            <RestaurantRail
              title="Chosen for you"
              subtitle="From what you have booked and saved"
              restaurants={scored.map((s) => s.restaurant)}
              reasons={reasons}
              showSlots={false}
            />

            <RestaurantRail
              title="Popular near you"
              subtitle={location.source === 'device' ? 'Close to where you are' : `Around ${location.label}`}
              restaurants={collections.data?.popularNearYou ?? []}
              onSeeAll={() => router.push('/(tabs)/explore')}
            />

            <RestaurantRail
              title="Trending cafés"
              restaurants={collections.data?.trendingCafes ?? []}
              showSlots={false}
            />

            <RestaurantRail
              title="Top rated"
              subtitle="The city's most consistently praised rooms"
              restaurants={collections.data?.topRated ?? []}
              showSlots={false}
            />

            <RestaurantRail
              title="Just opened"
              subtitle="New rooms worth a first look"
              restaurants={collections.data?.newlyOpened ?? []}
              showSlots={false}
            />

            {recentRestaurants.length > 0 ? (
              <View style={{ gap: theme.spacing.md }}>
                <SectionHeader title="You looked at" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: theme.screenGutter, gap: theme.spacing.md }}
                >
                  {recentRestaurants.map((restaurant) => (
                    <Pressable
                      key={restaurant.id}
                      onPress={() => router.push(`/restaurant/${restaurant.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel={restaurant.name}
                      scaleTo={0.96}
                      style={{ width: 132, gap: 6 }}
                    >
                      <SmartImage
                        uri={restaurant.images[0]}
                        fallbackText={restaurant.name}
                        accessibilityLabel=""
                        style={{ width: 132, height: 88, borderRadius: theme.radius.sm }}
                      />
                      <Text variant="label" numberOfLines={1}>
                        {restaurant.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/** The next booking, promoted above discovery because it is why people open the app. */
function NextBookingCard({ reservationIndex }: { reservationIndex: number }) {
  const theme = useTheme();
  const router = useRouter();
  const { upcoming } = useReservations();
  const reservation = upcoming[reservationIndex];

  if (!reservation) return null;
  const restaurant = restaurantById.get(reservation.restaurantId);

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: theme.screenGutter }}>
      <Pressable
        onPress={() => router.push(`/reservation/${reservation.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Your next booking: ${restaurant?.name}, ${formatDateKeyShort(
          reservation.date,
        )} at ${formatTime(reservation.time)}`}
        scaleTo={0.985}
      >
        <Card padded={false} style={{ backgroundColor: theme.colors.ink, borderColor: theme.colors.ink }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SmartImage
              uri={restaurant?.images[0]}
              fallbackText={restaurant?.name ?? 'Mesa'}
              accessibilityLabel=""
              style={{ width: 92, height: 92 }}
            />

            <View style={{ flex: 1, padding: theme.spacing.base, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="overline" style={{ color: theme.colors.inkOnMuted }}>
                  Your next table
                </Text>
                {reservation.status === 'pending' ? (
                  <Badge label="Awaiting venue" tone="warning" />
                ) : null}
              </View>

              <Text variant="heading" numberOfLines={1} style={{ color: theme.colors.inkOn, fontSize: 18 }}>
                {restaurant?.name}
              </Text>

              <Text variant="caption" style={{ color: theme.colors.inkOnMuted }} numberOfLines={1}>
                {formatDateKeyShort(reservation.date)} · {formatTime(reservation.time)} ·{' '}
                {formatPartySize(reservation.partySize)}
              </Text>
            </View>

            <View style={{ paddingRight: theme.spacing.base }}>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.inkOnMuted} />
            </View>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 40,
    paddingRight: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  unreadDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
