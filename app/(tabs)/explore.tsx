import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import type { SortKey } from '@/types';

import { FilterSheet } from '@/features/search/FilterSheet';
import { RestaurantMap } from '@/components/map/RestaurantMap';
import { RestaurantListItem } from '@/components/restaurant/RestaurantListItem';
import { MapPreviewCard } from '@/features/search/MapPreviewCard';
import {
  Chip,
  EmptyState,
  ErrorState,
  Pressable,
  Screen,
  SegmentedControl,
  Sheet,
  SkeletonRow,
  Text,
} from '@/components/ui';
import { SORT_OPTIONS } from '@/features/restaurants/query';
import { useDebounce } from '@/hooks/useDebounce';
import { useRestaurantSearch } from '@/hooks/useRestaurants';
import { config } from '@/constants/config';
import { useSearchStore } from '@/store/searchStore';
import { useUiStore } from '@/store/uiStore';
import { useTheme } from '@/theme';
import { pluralise } from '@/utils/format';

/**
 * Explore.
 *
 * List and map are two views of one query, not two screens. Switching between
 * them keeps the query, the filters and the sort, because the whole point of
 * the map is to see the *same* results laid out in space.
 */
export default function ExploreScreen() {
  const theme = useTheme();
  const router = useRouter();

  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const filters = useSearchStore((s) => s.filters);
  const sort = useSearchStore((s) => s.sort);
  const setSort = useSearchStore((s) => s.setSort);
  const view = useSearchStore((s) => s.view);
  const setView = useSearchStore((s) => s.setView);
  const activeFilterCount = useSearchStore((s) => s.activeFilterCount());
  const openDraft = useSearchStore((s) => s.openDraft);
  const clearAll = useSearchStore((s) => s.clearAll);

  const location = useUiStore((s) => s.location);

  const debouncedQuery = useDebounce(query, config.searchDebounceMs);
  const results = useRestaurantSearch({ query: debouncedQuery, filters, sort });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const selectedRestaurant = useMemo(
    () => results.items.find((r) => r.id === selectedPin) ?? null,
    [results.items, selectedPin],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await results.refetch();
    setRefreshing(false);
  }, [results]);

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Recommended';

  return (
    <Screen>
      <View style={{ paddingHorizontal: theme.screenGutter, paddingTop: theme.spacing.md, gap: theme.spacing.md }}>
        <View style={styles.headerRow}>
          <Text variant="title">Explore</Text>
          <SegmentedControl
            options={[
              { value: 'list', label: 'List' },
              { value: 'map', label: 'Map' },
            ]}
            value={view}
            onChange={setView}
            style={{ width: 132, alignSelf: 'flex-end' }}
          />
        </View>

        <Pressable
          onPress={() => router.push('/search')}
          accessibilityRole="search"
          accessibilityLabel={query ? `Search, currently ${query}` : 'Search restaurants'}
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
          <Ionicons name="search" size={17} color={theme.colors.inkFaint} />
          <Text variant="body" tone={query ? 'primary' : 'faint'} numberOfLines={1} style={{ flex: 1 }}>
            {query || 'Restaurants, cuisines, places'}
          </Text>
          {query ? (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={12}
              scaleTo={0.85}
            >
              <Ionicons name="close-circle" size={17} color={theme.colors.inkFaint} />
            </Pressable>
          ) : null}
        </Pressable>

        <View style={styles.controlRow}>
          <Chip
            label="Filters"
            icon="options-outline"
            count={activeFilterCount}
            selected={activeFilterCount > 0}
            onPress={() => {
              openDraft();
              setFiltersOpen(true);
            }}
          />
          <Chip label={sortLabel} icon="swap-vertical-outline" onPress={() => setSortOpen(true)} />
          {activeFilterCount > 0 || query ? (
            <Chip label="Clear" icon="close-outline" onPress={clearAll} />
          ) : null}
        </View>

        {!results.isLoading ? (
          <Text variant="caption" tone="muted">
            {results.items.length === 0
              ? 'No matches'
              : pluralise(results.items.length, 'restaurant')}
          </Text>
        ) : null}
      </View>

      {view === 'map' ? (
        <View style={{ flex: 1, marginTop: theme.spacing.md }}>
          <RestaurantMap
            restaurants={results.items}
            origin={location}
            selectedId={selectedPin}
            onSelect={setSelectedPin}
          />
          {selectedRestaurant ? (
            <MapPreviewCard
              restaurant={selectedRestaurant}
              onDismiss={() => setSelectedPin(null)}
            />
          ) : null}
        </View>
      ) : results.isError ? (
        <ErrorState error={results.error} onRetry={() => void results.refetch()} />
      ) : results.isLoading ? (
        <View style={{ paddingHorizontal: theme.screenGutter, paddingTop: theme.spacing.sm }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : (
        <FlashList
          style={{ flex: 1 }}
          data={results.items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RestaurantListItem restaurant={item} />}
          contentContainerStyle={{
            paddingHorizontal: theme.screenGutter,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.xxxl,
          }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.inkMuted}
              colors={[theme.colors.accent]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="Nothing matches that"
              message={
                activeFilterCount > 0
                  ? 'Your filters are narrow. Loosening the distance or price usually opens things up.'
                  : 'Try a cuisine, a neighbourhood, or a restaurant name.'
              }
              action={
                activeFilterCount > 0
                  ? { label: 'Clear filters', onPress: clearAll }
                  : { label: 'Search', onPress: () => router.push('/search') }
              }
            />
          }
        />
      )}

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        resultCount={results.items.length}
      />

      <Sheet visible={sortOpen} onClose={() => setSortOpen(false)} title="Sort by">
        <View style={{ paddingHorizontal: theme.screenGutter, paddingBottom: theme.spacing.base }}>
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                setSort(option.value as SortKey);
                setSortOpen(false);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === sort }}
              scaleTo={0.99}
              style={[styles.sortRow, { borderBottomColor: theme.colors.hairline }]}
            >
              <Text variant="body">{option.label}</Text>
              {option.value === sort ? (
                <Ionicons name="checkmark" size={19} color={theme.colors.accent} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
});
