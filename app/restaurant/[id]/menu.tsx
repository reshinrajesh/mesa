import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip, Divider, ErrorState, Screen, ScreenHeader, Skeleton, SmartImage, Text } from '@/components/ui';
import { useMenu, useRestaurant } from '@/hooks/useRestaurants';
import { useTheme } from '@/theme';
import { formatCurrency } from '@/utils/format';

const DIET_FILTERS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten-free', label: 'Gluten free' },
] as const;

/**
 * Menu.
 *
 * The dietary filter hides nothing — it dims. Removing dishes from a menu makes
 * a section look shorter than it is and hides the fact that a kitchen has one
 * vegetarian dish out of twelve, which is exactly what a vegetarian wants to
 * know before booking.
 */
export default function MenuScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: restaurant } = useRestaurant(id);
  const { data: menu, isLoading, isError, error, refetch } = useMenu(id);
  const [diet, setDiet] = useState<string | null>(null);

  const matches = useMemo(
    () => (item: { tags: readonly string[] }) => !diet || item.tags.includes(diet),
    [diet],
  );

  return (
    <Screen>
      <ScreenHeader title={restaurant?.name ?? 'Menu'} subtitle="Menu" />

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading || !menu ? (
        <View style={{ padding: theme.screenGutter, gap: theme.spacing.base }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={54} />
          ))}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: theme.screenGutter,
            paddingBottom: theme.spacing.xxxl,
            gap: theme.spacing.xl,
          }}
        >
          <View style={styles.filters}>
            {DIET_FILTERS.map((filter) => (
              <Chip
                key={filter.value}
                label={filter.label}
                size="sm"
                selected={diet === filter.value}
                onPress={() => setDiet(diet === filter.value ? null : filter.value)}
              />
            ))}
          </View>

          {menu.sections.map((section) => (
            <View key={section.id} style={{ gap: theme.spacing.md }}>
              <Text variant="overline" tone="faint">
                {section.title}
              </Text>

              {section.items.map((item, index) => {
                const dimmed = !matches(item);
                return (
                  <View key={item.id} style={{ gap: theme.spacing.md, opacity: dimmed ? 0.35 : 1 }}>
                    <View style={styles.item}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={styles.nameRow}>
                          <Text variant="bodyStrong" style={{ flex: 1 }}>
                            {item.name}
                          </Text>
                          {item.tags.includes('signature') ? (
                            <Ionicons name="ribbon-outline" size={14} color={theme.colors.accent} />
                          ) : null}
                        </View>

                        <Text variant="caption" tone="muted" style={{ lineHeight: 18 }}>
                          {item.description}
                        </Text>

                        {item.tags.length > 0 ? (
                          <Text variant="caption" tone="faint">
                            {item.tags
                              .filter((t) => t !== 'signature')
                              .map((t) => t.replace('-', ' '))
                              .join(' · ')}
                          </Text>
                        ) : null}
                      </View>

                      {item.imageUrl ? (
                        <SmartImage
                          uri={item.imageUrl}
                          fallbackText={item.name}
                          accessibilityLabel=""
                          style={{ width: 72, height: 72, borderRadius: theme.radius.sm }}
                        />
                      ) : null}

                      <Text variant="numeric" tone="muted" style={{ minWidth: 44, textAlign: 'right' }}>
                        {formatCurrency(item.price, menu.currency)}
                      </Text>
                    </View>

                    {index < section.items.length - 1 ? <Divider /> : null}
                  </View>
                );
              })}
            </View>
          ))}

          <Text variant="caption" tone="faint">
            Prices are as last published by the restaurant and may change. Ask about allergens when
            you book — the kitchen sees your booking note.
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
