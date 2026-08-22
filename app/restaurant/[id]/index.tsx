import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Linking, ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AMENITY_ICON, AMENITY_LABEL, CUISINE_LABEL } from '@/constants/cuisines';
import { FavoriteButton } from '@/components/restaurant/FavoriteButton';
import { RestaurantMap } from '@/components/map/RestaurantMap';
import {
  Badge,
  Button,
  Card,
  Divider,
  ErrorState,
  Pressable,
  Rating,
  Skeleton,
  SmartImage,
  Text,
} from '@/components/ui';
import { getOpenState, weeklyHours } from '@/features/restaurants/openingHours';
import { useMenu, useRestaurant } from '@/hooks/useRestaurants';
import { useReviews } from '@/hooks/useReviews';
import { useScrollHideCta } from '@/hooks/useScrollHideCta';
import { useUiStore } from '@/store/uiStore';
import { useTheme } from '@/theme';
import { formatCurrency, formatDistance, joinMeta, priceLabel } from '@/utils/format';
import { formatMonthYear } from '@/utils/date';
import { usingImportedVenues } from '@/mock/restaurants';
import { WalkInSheet } from '@/features/reservations/WalkInSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 320;

/**
 * Restaurant detail.
 *
 * Structure follows the order of the questions people actually ask, which is
 * not the order a CMS would list fields in: what does it look like → is it any
 * good → can I get in → what is it → where is it → what do others say.
 *
 * The "Reserve a table" bar is pinned and hides on scroll-down / returns on
 * scroll-up. It is the reason this screen exists; it never scrolls away for good.
 */
export default function RestaurantDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: restaurant, isLoading, isError, error, refetch } = useRestaurant(id);
  const { data: menu } = useMenu(id);
  const { reviews } = useReviews(id);
  const markViewed = useUiStore((s) => s.markViewed);

  const scrollY = useSharedValue(0);
  const { hidden, onScroll: ctaScroll } = useScrollHideCta();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [walkInOpen, setWalkInOpen] = useState(false);

  useEffect(() => {
    if (id) markViewed(id);
  }, [id, markViewed]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Parallax: the hero drifts at half speed and zooms on overscroll.
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-200, 0, HERO_HEIGHT], [-100, 0, HERO_HEIGHT * 0.5]) },
      { scale: interpolate(scrollY.value, [-200, 0], [1.4, 1], 'clamp') },
    ],
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hidden.value * 140 }],
    opacity: 1 - hidden.value * 0.4,
  }));

  const openState = useMemo(
    () => (restaurant ? getOpenState(restaurant) : null),
    [restaurant],
  );
  const hours = useMemo(() => (restaurant ? weeklyHours(restaurant) : []), [restaurant]);

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.canvas, paddingTop: insets.top }}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </View>
    );
  }

  if (isLoading || !restaurant) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
        <Skeleton width="100%" height={HERO_HEIGHT} radius={0} />
        <View style={{ padding: theme.screenGutter, gap: theme.spacing.md }}>
          <Skeleton width="70%" height={28} />
          <Skeleton width="50%" height={16} />
          <Skeleton width="90%" height={16} />
        </View>
      </View>
    );
  }

  const meta = joinMeta([
    restaurant.cuisines.map((c) => CUISINE_LABEL[c]).join(', '),
    priceLabel(restaurant.priceTier),
    restaurant.neighbourhood,
    formatDistance(restaurant.distanceKm),
  ]);

  const share = () =>
    Share.share({
      message: `${restaurant.name} — ${restaurant.tagline}. ${restaurant.address}`,
      title: restaurant.name,
    }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        onScrollBeginDrag={ctaScroll}
        // Two handlers: the parallax runs on the UI thread; the CTA reads
        // direction on the JS thread where `withTiming` is set up.
        onMomentumScrollEnd={ctaScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.layout.stickyBarHeight + insets.bottom + 24 }}
      >
        {/* Gallery */}
        <View style={{ height: HERO_HEIGHT, overflow: 'hidden' }}>
          <Animated.View style={[StyleSheet.absoluteFill, heroStyle]}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) =>
                setGalleryIndex(Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH))
              }
            >
              {restaurant.images.map((image, index) => (
                <SmartImage
                  key={image}
                  uri={image}
                  fallbackText={restaurant.name}
                  accessibilityLabel={`${restaurant.name}, photo ${index + 1} of ${restaurant.images.length}`}
                  style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }}
                />
              ))}
            </ScrollView>
          </Animated.View>

          {/* One scrim, bottom only, so the name below stays readable on any photo. */}
          <View
            pointerEvents="none"
            style={[styles.heroScrim, { backgroundColor: theme.colors.canvas }]}
          />

          <View style={[styles.heroBar, { top: insets.top + 8 }]}>
            <CircleButton icon="chevron-back" label="Go back" onPress={() => router.back()} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <CircleButton icon="share-outline" label="Share" onPress={share} />
              <FavoriteButton
                restaurantId={restaurant.id}
                restaurantName={restaurant.name}
                isFavorite={restaurant.isFavorite}
                size={38}
              />
            </View>
          </View>

          {restaurant.images.length > 1 ? (
            <View style={styles.dots}>
              {restaurant.images.map((image, index) => (
                <View
                  key={image}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: theme.colors.onPhoto,
                      // Decorative, and duplicated by the gallery's own count —
                      // so the inactive dots may fade rather than hold 3:1.
                      opacity: index === galleryIndex ? 1 : 0.4,
                      width: index === galleryIndex ? 16 : 5,
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: theme.screenGutter, gap: theme.spacing.xl, marginTop: -14 }}>
          {/* Identity */}
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="title" style={{ fontSize: 30, lineHeight: 34 }}>
              {restaurant.name}
            </Text>

            <Text variant="body" tone="muted">
              {restaurant.tagline}
            </Text>

            <View style={styles.metaRow}>
              <Rating value={restaurant.rating} count={restaurant.reviewCount} size="md" />
              {openState ? (
                <Badge
                  label={openState.label}
                  tone={openState.tone === 'positive' ? 'positive' : openState.tone === 'warning' ? 'warning' : 'neutral'}
                  dot
                />
              ) : null}
            </View>

            <Text variant="caption" tone="faint">
              {meta}
            </Text>
          </View>

          {/* Amenities */}
          <View style={styles.amenities}>
            {restaurant.amenities.slice(0, 8).map((amenity) => (
              <View
                key={amenity}
                style={[
                  styles.amenity,
                  { backgroundColor: theme.colors.canvasSunk, borderRadius: theme.radius.xs },
                ]}
              >
                <Ionicons
                  name={AMENITY_ICON[amenity] as keyof typeof Ionicons.glyphMap}
                  size={13}
                  color={theme.colors.inkMuted}
                />
                <Text variant="caption" tone="muted">
                  {AMENITY_LABEL[amenity]}
                </Text>
              </View>
            ))}
          </View>

          <Divider />

          {/* About */}
          <Section title="About">
            <Text variant="body" tone="muted" style={{ lineHeight: 23 }}>
              {restaurant.about}
            </Text>
          </Section>

          {/* Menu preview */}
          {menu ? (
            <Section
              title="Menu"
              actionLabel="Full menu"
              onAction={() => router.push(`/restaurant/${restaurant.id}/menu`)}
            >
              <View style={{ gap: theme.spacing.md }}>
                {menu.sections[0]?.items.slice(0, 3).map((item) => (
                  <View key={item.id} style={styles.menuItem}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text variant="caption" tone="muted" numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>
                    <Text variant="numeric" tone="muted">
                      {formatCurrency(item.price, menu.currency)}
                    </Text>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {/* Hours */}
          <Section title="Opening hours">
            <View style={{ gap: 6 }}>
              {hours.map((row) => (
                <View key={row.day} style={styles.hourRow}>
                  <Text
                    variant={row.isToday ? 'bodyStrong' : 'body'}
                    tone={row.isToday ? 'primary' : 'muted'}
                  >
                    {row.day}
                  </Text>
                  <Text
                    variant={row.isToday ? 'bodyStrong' : 'body'}
                    tone={row.hours === 'Closed' ? 'faint' : row.isToday ? 'primary' : 'muted'}
                  >
                    {row.hours}
                  </Text>
                </View>
              ))}
            </View>
          </Section>

          {/* Location */}
          <Section title="Where it is">
            <View style={{ gap: theme.spacing.md }}>
              <View style={[styles.mapBox, { borderRadius: theme.radius.md, borderColor: theme.colors.hairline }]}>
                <RestaurantMap
                  restaurants={[restaurant]}
                  origin={null}
                  selectedId={restaurant.id}
                  onSelect={() => router.push('/map')}
                />
              </View>

              <Text variant="body" tone="muted">
                {restaurant.address}
              </Text>

              {usingImportedVenues ? (
                // Required by Google's terms wherever their Places content is
                // shown, and honest besides: the name, address, hours and
                // rating on this screen are theirs, while the availability
                // below it is this app's own simulation.
                <Text variant="caption" tone="faint">
                  Venue details and rating from Google. Availability is simulated.
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  label="Directions"
                  variant="secondary"
                  size="sm"
                  icon="navigate-outline"
                  onPress={() =>
                    Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${restaurant.coordinates.latitude},${restaurant.coordinates.longitude}`,
                    ).catch(() => {})
                  }
                />
                <Button
                  label="Call"
                  variant="secondary"
                  size="sm"
                  icon="call-outline"
                  onPress={() => Linking.openURL(`tel:${restaurant.phone}`).catch(() => {})}
                />
                {restaurant.website ? (
                  <Button
                    label="Website"
                    variant="secondary"
                    size="sm"
                    icon="globe-outline"
                    onPress={() => Linking.openURL(restaurant.website!).catch(() => {})}
                  />
                ) : null}
              </View>
            </View>
          </Section>

          {/* Reviews */}
          <Section
            title={`Reviews (${restaurant.reviewCount})`}
            actionLabel="See all"
            onAction={() => router.push(`/restaurant/${restaurant.id}/reviews`)}
          >
            <View style={{ gap: theme.spacing.md }}>
              {reviews.slice(0, 2).map((review) => (
                <Card key={review.id} style={{ gap: theme.spacing.sm }}>
                  <View style={styles.reviewHeader}>
                    <View
                      style={[
                        styles.reviewAvatar,
                        { backgroundColor: theme.colors.canvasSunk },
                      ]}
                    >
                      <Text variant="label">{review.authorInitials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {review.authorName}
                      </Text>
                      <Text variant="caption" tone="faint">
                        {formatMonthYear(review.createdAt)}
                        {review.verified ? ' · Booked on Mesa' : ''}
                      </Text>
                    </View>
                    <Rating value={review.rating} />
                  </View>

                  <Text variant="body" tone="muted" numberOfLines={4} style={{ lineHeight: 22 }}>
                    {review.body}
                  </Text>
                </Card>
              ))}
            </View>
          </Section>
        </View>
      </Animated.ScrollView>

      {/* The reason this screen exists. */}
      <Animated.View
        style={[
          styles.cta,
          ctaStyle,
          {
            paddingBottom: insets.bottom + theme.spacing.md,
            paddingHorizontal: theme.screenGutter,
            backgroundColor: theme.colors.canvas,
            borderTopColor: theme.colors.hairline,
          },
        ]}
      >
        {/* Said here rather than only inside the wizard, because this is where
            someone decides whether this place is still an option tonight. The
            button stays "Reserve a table": another evening may be wide open,
            and the board is where that choice belongs. */}
        {restaurant.waitlistTonight ? (
          <View style={styles.ctaNote}>
            <Ionicons name="hourglass-outline" size={14} color={theme.colors.inkMuted} />
            <Text variant="caption" tone="muted" numberOfLines={2} style={{ flex: 1 }}>
              Fully booked tonight — but {restaurant.name} keeps a waitlist, and another evening may
              be free.
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button
            label="Reserve a table"
            size="lg"
            icon="arrow-forward"
            iconPosition="right"
            style={{ flex: 1 }}
            onPress={() =>
              router.push({
                pathname: '/reserve/[restaurantId]',
                params: { restaurantId: restaurant.id },
              })
            }
          />

          {/*
            Only while the doors are open, because it is for somebody standing
            inside them. Offering it to a closed venue would be the app
            inviting people to a room with the lights off.
          */}
          {restaurant.isOpenNow ? (
            <Button
              label="Dine in"
              variant="secondary"
              size="lg"
              icon="restaurant-outline"
              onPress={() => setWalkInOpen(true)}
              accessibilityHint="For a table you are already sitting at"
            />
          ) : null}
        </View>
      </Animated.View>

      <WalkInSheet
        restaurant={restaurant}
        open={walkInOpen}
        onClose={() => setWalkInOpen(false)}
      />
    </View>
  );
}

function CircleButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      scaleTo={0.88}
      style={[styles.circle, { backgroundColor: theme.colors.photoChip }]}
    >
      <Ionicons name={icon} size={19} color={theme.colors.onPhoto} />
    </Pressable>
  );
}

function Section({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={styles.sectionHeader}>
        <Text variant="heading" style={{ flex: 1 }}>
          {title}
        </Text>
        {onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={`${actionLabel}, ${title}`}
            hitSlop={10}
            style={{ minHeight: 32, justifyContent: 'center' }}
          >
            <Text variant="label" tone="accent">
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  heroScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  heroBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  amenity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    height: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 24,
  },
  mapBox: {
    height: 168,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  ctaNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    paddingBottom: 9,
  },
});
