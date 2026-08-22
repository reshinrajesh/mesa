import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import type { Restaurant } from '@/types';

import { Button, Sheet, Stepper, Text } from '@/components/ui';
import { reservationService } from '@/services';
import { toast } from '@/store/uiStore';
import { useTheme } from '@/theme';
import { toAppError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

/**
 * Dining in, for somebody already standing in the restaurant.
 *
 * One question — how many of you — because the rest is known: the venue is
 * this venue, the time is now, and the table has been given to them by a
 * person rather than by an app. Asking for a date, a slot and a seating
 * preference at that point would be the app pretending it is doing something
 * it is not.
 *
 * It goes straight to ordering afterwards, since that is the only reason to
 * start a table this way. A confirmation screen in between would be a receipt
 * for a thing that has not happened yet.
 */
export function WalkInSheet({
  restaurant,
  open,
  onClose,
}: {
  restaurant: Restaurant;
  open: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const [partySize, setPartySize] = useState(2);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const table = await reservationService.startWalkIn(restaurant.id, partySize);
      haptics.success();
      onClose();
      router.push(`/reservation/${table.id}/order`);
    } catch (error) {
      const app = toAppError(error);
      haptics.error();
      toast({ title: app.title, message: app.message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={open} onClose={onClose} title="Dine in now">
      <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <Text variant="body" tone="muted">
          For a table you are already sitting at. Start here and the menu becomes orderable, with
          the bill on the same screen when you are done.
        </Text>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="subheading">How many of you?</Text>
          <Stepper
            value={partySize}
            onChange={setPartySize}
            min={1}
            max={restaurant.maxPartySize}
            accessibilityLabel={`Party of ${partySize}`}
          />
        </View>

        <Button
          label="Start the table"
          size="lg"
          fullWidth
          loading={busy}
          onPress={start}
          accessibilityHint="Opens the menu to order from"
        />
      </View>
    </Sheet>
  );
}
