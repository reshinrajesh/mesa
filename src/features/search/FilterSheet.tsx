import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AMENITIES, CUISINES, PRICE_TIERS, VENUE_KINDS } from '@/constants/cuisines';
import { Button, Chip, Pressable, Text } from '@/components/ui';
import { Sheet } from '@/components/ui/Sheet';
import { countActiveFilters } from '@/features/restaurants/query';
import { useSearchStore } from '@/store/searchStore';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { pluralise } from '@/utils/format';

export interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  resultCount: number;
}

/**
 * The filter sheet.
 *
 * It edits a *draft* and commits on "Show results". Live-applying every tap
 * would refetch six times while someone picks three cuisines, and the count on
 * the button is only meaningful once the user has finished choosing.
 *
 * "Reset" is a text button, not a destructive-looking one: clearing filters is
 * cheap and completely reversible.
 */
export function FilterSheet({ visible, onClose, resultCount }: FilterSheetProps) {
  const theme = useTheme();

  const draft = useSearchStore((s) => s.draftFilters);
  const toggleValue = useSearchStore((s) => s.toggleDraftValue);
  const togglePrice = useSearchStore((s) => s.toggleDraftPrice);
  const patch = useSearchStore((s) => s.patchDraft);
  const reset = useSearchStore((s) => s.resetDraft);
  const commit = useSearchStore((s) => s.commitDraft);

  const draftCount = countActiveFilters(draft);

  const apply = () => {
    commit();
    haptics.tap();
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      footer={
        <View style={styles.footer}>
          <Pressable
            onPress={reset}
            accessibilityRole="button"
            accessibilityLabel="Reset all filters"
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}
          >
            <Text variant="label" tone={draftCount > 0 ? 'primary' : 'faint'}>
              Reset
            </Text>
          </Pressable>

          <Button
            label={
              draftCount === 0
                ? 'Show all restaurants'
                : `Show ${pluralise(resultCount, 'result')}`
            }
            onPress={apply}
            size="md"
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingBottom: theme.spacing.lg,
          gap: theme.spacing.xl,
        }}
      >
        <Group title="Cuisine">
          <View style={styles.wrap}>
            {CUISINES.map((cuisine) => (
              <Chip
                key={cuisine.value}
                label={cuisine.label}
                size="sm"
                selected={draft.cuisines.includes(cuisine.value)}
                onPress={() => toggleValue('cuisines', cuisine.value)}
              />
            ))}
          </View>
        </Group>

        <Group title="Price" hint="Roughly, per person, before drinks">
          <View style={styles.wrap}>
            {PRICE_TIERS.map((tier) => (
              <Chip
                key={tier.value}
                label={`${tier.label}  ${tier.hint}`}
                size="sm"
                selected={draft.priceTiers.includes(tier.value)}
                onPress={() => togglePrice(tier.value)}
              />
            ))}
          </View>
        </Group>

        <Group title="Rating">
          <View style={styles.wrap}>
            {[0, 4, 4.5, 4.8].map((rating) => (
              <Chip
                key={rating}
                label={rating === 0 ? 'Any rating' : `${rating}+`}
                size="sm"
                icon={rating === 0 ? undefined : 'star'}
                selected={draft.minRating === rating}
                onPress={() => patch({ minRating: rating })}
              />
            ))}
          </View>
        </Group>

        <Group title="Distance">
          <View style={styles.wrap}>
            {[null, 1, 3, 5, 10].map((km) => (
              <Chip
                key={String(km)}
                label={km === null ? 'Anywhere' : `Within ${km} km`}
                size="sm"
                selected={draft.maxDistanceKm === km}
                onPress={() => patch({ maxDistanceKm: km })}
              />
            ))}
          </View>
        </Group>

        <Group title="Type of place">
          <View style={styles.wrap}>
            {VENUE_KINDS.map((kind) => (
              <Chip
                key={kind.value}
                label={kind.label}
                size="sm"
                selected={draft.kinds.includes(kind.value)}
                onPress={() => toggleValue('kinds', kind.value)}
              />
            ))}
          </View>
        </Group>

        <Group title="Must have" hint="All selected features have to be present">
          <View style={styles.wrap}>
            <Chip
              label="Open now"
              size="sm"
              icon="time-outline"
              selected={draft.openNow}
              onPress={() => patch({ openNow: !draft.openNow })}
            />
            {AMENITIES.map((amenity) => (
              <Chip
                key={amenity.value}
                label={amenity.label}
                size="sm"
                selected={draft.amenities.includes(amenity.value)}
                onPress={() => toggleValue('amenities', amenity.value)}
              />
            ))}
          </View>
        </Group>
      </ScrollView>
    </Sheet>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ gap: 2 }}>
        <Text variant="overline" tone="faint">
          {title}
        </Text>
        {hint ? (
          <Text variant="caption" tone="faint">
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
