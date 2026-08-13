import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CUISINES } from '@/constants/cuisines';
import { config } from '@/constants/config';
import { Chip, Divider, Pressable, Screen, Text } from '@/components/ui';
import { useDebounce } from '@/hooks/useDebounce';
import { useSuggestions } from '@/hooks/useRestaurants';
import { useSearchStore } from '@/store/searchStore';
import { useTheme } from '@/theme';

/**
 * Search.
 *
 * A dedicated screen rather than an inline field, because search here has three
 * result types — restaurants, cuisines and neighbourhoods — and each routes
 * somewhere different. An inline dropdown cannot carry that without becoming a
 * cramped popover.
 *
 * Suggestions are debounced; recent searches are instant and live above them,
 * because a repeat search is the most common one.
 */
export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();

  const storedQuery = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const remember = useSearchStore((s) => s.rememberSearch);
  const recentSearches = useSearchStore((s) => s.recentSearches);
  const clearRecent = useSearchStore((s) => s.clearRecent);

  const [text, setText] = useState(storedQuery);
  const debounced = useDebounce(text, config.searchDebounceMs);
  const { data: suggestions = [], isFetching } = useSuggestions(debounced);

  const commit = (value: string) => {
    setQuery(value);
    remember(value);
    router.replace('/(tabs)/explore');
  };

  return (
    <Screen keyboardSafe>
      <View style={[styles.searchRow, { paddingHorizontal: theme.screenGutter }]}>
        <View
          style={[
            styles.field,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.hairline,
              borderRadius: theme.radius.pill,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.colors.inkFaint} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Restaurants, cuisines, places"
            placeholderTextColor={theme.colors.inkFaint}
            selectionColor={theme.colors.accent}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => commit(text)}
            accessibilityLabel="Search"
            maxFontSizeMultiplier={1.5}
            style={[theme.text.body, { flex: 1, color: theme.colors.ink, paddingVertical: 12 }]}
          />
          {text.length > 0 ? (
            <Pressable
              onPress={() => setText('')}
              accessibilityRole="button"
              accessibilityLabel="Clear"
              hitSlop={12}
              scaleTo={0.85}
            >
              <Ionicons name="close-circle" size={18} color={theme.colors.inkFaint} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancel search"
          hitSlop={10}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text variant="label" tone="muted">
            Cancel
          </Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingTop: theme.spacing.base,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.xl,
        }}
      >
        {debounced.trim().length > 1 ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="overline" tone="faint">
              {isFetching ? 'Searching…' : 'Results'}
            </Text>

            {suggestions.length === 0 && !isFetching ? (
              <Text variant="body" tone="muted">
                Nothing matches “{debounced}”. Try a cuisine or a neighbourhood.
              </Text>
            ) : null}

            {suggestions.map((suggestion) => (
              <Pressable
                key={`${suggestion.kind}-${suggestion.value}`}
                onPress={() => {
                  if (suggestion.kind === 'restaurant') {
                    remember(suggestion.label);
                    router.replace(`/restaurant/${suggestion.value}`);
                  } else {
                    commit(suggestion.label);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={`${suggestion.label}, ${suggestion.kind}`}
                scaleTo={0.99}
                style={styles.suggestion}
              >
                <View
                  style={[
                    styles.suggestionGlyph,
                    { backgroundColor: theme.colors.canvasSunk, borderRadius: theme.radius.sm },
                  ]}
                >
                  <Ionicons
                    name={
                      suggestion.kind === 'restaurant'
                        ? 'restaurant-outline'
                        : suggestion.kind === 'cuisine'
                          ? 'pricetag-outline'
                          : 'location-outline'
                    }
                    size={16}
                    color={theme.colors.inkMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text variant="body" numberOfLines={1}>
                    {suggestion.label}
                  </Text>
                  <Text variant="caption" tone="faint">
                    {suggestion.kind === 'restaurant'
                      ? 'Restaurant'
                      : suggestion.kind === 'cuisine'
                        ? 'Cuisine'
                        : 'Neighbourhood'}
                  </Text>
                </View>

                <Ionicons name="arrow-forward" size={15} color={theme.colors.inkFaint} />
              </Pressable>
            ))}
          </View>
        ) : (
          <>
            {recentSearches.length > 0 ? (
              <View style={{ gap: theme.spacing.md }}>
                <View style={styles.headerRow}>
                  <Text variant="overline" tone="faint" style={{ flex: 1 }}>
                    Recent
                  </Text>
                  <Pressable
                    onPress={clearRecent}
                    accessibilityRole="button"
                    accessibilityLabel="Clear recent searches"
                    hitSlop={10}
                    style={{ minHeight: 32, justifyContent: 'center' }}
                  >
                    <Text variant="label" tone="muted">
                      Clear
                    </Text>
                  </Pressable>
                </View>

                {recentSearches.map((term) => (
                  <Pressable
                    key={term}
                    onPress={() => commit(term)}
                    accessibilityRole="button"
                    accessibilityLabel={`Search again for ${term}`}
                    scaleTo={0.99}
                    style={styles.recentRow}
                  >
                    <Ionicons name="time-outline" size={17} color={theme.colors.inkFaint} />
                    <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                      {term}
                    </Text>
                    <Ionicons name="arrow-up-outline" size={15} color={theme.colors.inkFaint} />
                  </Pressable>
                ))}

                <Divider />
              </View>
            ) : null}

            <View style={{ gap: theme.spacing.md }}>
              <Text variant="overline" tone="faint">
                Browse by cuisine
              </Text>
              <View style={styles.chips}>
                {CUISINES.map((cuisine) => (
                  <Chip
                    key={cuisine.value}
                    label={cuisine.label}
                    icon={cuisine.icon as never}
                    size="sm"
                    onPress={() => commit(cuisine.label)}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
  },
  suggestionGlyph: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
