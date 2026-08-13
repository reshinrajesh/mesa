import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import type { Reservation } from '@/types';

import { Button, Chip, Sheet, StarPicker, Text } from '@/components/ui';
import { useCreateReview } from '@/hooks/useReviews';
import { useTheme } from '@/theme';
import { reviewSchema } from '@/validation/schemas';

const HIGHLIGHTS = [
  'Great food',
  'Good service',
  'Worth the price',
  'Lovely room',
  'Quiet enough to talk',
  'Ran on time',
  'Good for groups',
  'Would go again',
];

export interface RateSheetProps {
  visible: boolean;
  onClose: () => void;
  reservation: Reservation;
  restaurantName: string;
}

/**
 * Rating a completed booking.
 *
 * Highlights are tappable chips rather than free text because most people will
 * not write a paragraph, and a set of chips still produces something useful for
 * the next person deciding whether to book.
 */
export function RateSheet({ visible, onClose, reservation, restaurantName }: RateSheetProps) {
  const theme = useTheme();
  const createReview = useCreateReview();

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [highlights, setHighlights] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = reviewSchema.safeParse({ rating, body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check what you have written.');
      return;
    }
    setError(null);
    createReview.mutate(
      {
        restaurantId: reservation.restaurantId,
        reservationId: reservation.id,
        rating: parsed.data.rating,
        body: parsed.data.body,
        highlights,
      },
      {
        onSuccess: () => {
          setRating(0);
          setBody('');
          setHighlights([]);
          onClose();
        },
      },
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`How was ${restaurantName}?`}
      footer={
        <Button
          label="Post review"
          fullWidth
          loading={createReview.isPending}
          disabled={rating === 0}
          onPress={submit}
        />
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingBottom: theme.spacing.lg,
          gap: theme.spacing.lg,
        }}
      >
        <View style={{ paddingVertical: theme.spacing.sm }}>
          <StarPicker value={rating} onChange={setRating} />
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Text variant="overline" tone="faint">
            What stood out?
          </Text>
          <View style={styles.wrap}>
            {HIGHLIGHTS.map((highlight) => (
              <Chip
                key={highlight}
                label={highlight}
                size="sm"
                selected={highlights.includes(highlight)}
                onPress={() =>
                  setHighlights((current) =>
                    current.includes(highlight)
                      ? current.filter((h) => h !== highlight)
                      : [...current, highlight],
                  )
                }
              />
            ))}
          </View>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" tone="faint">
            In your own words
          </Text>
          <TextInput
            value={body}
            onChangeText={(text) => {
              setBody(text);
              setError(null);
            }}
            placeholder="What did you order, and would you send a friend?"
            placeholderTextColor={theme.colors.inkFaint}
            selectionColor={theme.colors.accent}
            multiline
            maxLength={1500}
            accessibilityLabel="Your review"
            maxFontSizeMultiplier={1.5}
            style={[
              theme.text.body,
              styles.input,
              {
                color: theme.colors.ink,
                backgroundColor: theme.colors.surface,
                borderColor: error ? theme.colors.danger : theme.colors.hairline,
                borderRadius: theme.radius.md,
              },
            ]}
          />
          {error ? (
            <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  input: {
    minHeight: 110,
    padding: 14,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
