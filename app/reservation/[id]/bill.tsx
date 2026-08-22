import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { PaymentMethod } from '@/types';

import {
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
} from '@/components/ui';
import { savedOnBill, settleTotals } from '@/features/offers/deals';
import { formatPaise, isPayable, TIP_PRESETS, tipFor, totalWithTip } from '@/features/payments/bill';
import { useBill } from '@/hooks/useBill';
import { useReservation } from '@/hooks/useReservations';
import { useRestaurant } from '@/hooks/useRestaurants';
import { useTheme } from '@/theme';

/**
 * The bill at the table.
 *
 * Three things this screen refuses to do, all of them things a payment screen
 * is tempted into:
 *
 * **It does not add up the bill.** The subtotal and the taxes are the venue's
 * arithmetic and are drawn as sent. Only the tip and the total move here, and
 * the total the guest is charged is the one the *server* put in the order.
 *
 * **It does not make the tip awkward to decline.** Nothing is preselected and
 * "No tip" is the first chip, because a tip that takes three taps to refuse is
 * a service charge that is embarrassed about itself.
 *
 * **It does not say "Paid" until the server has said so.** Every other
 * optimistic update in this app is worth the speed; telling somebody their
 * money has moved before it has is not.
 */
export default function BillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const { data: reservation } = useReservation(id);
  const { data: restaurant } = useRestaurant(reservation?.restaurantId);
  const { bill, isLoading, error, refetch, pay, isPaying, stage } = useBill(id);

  const [tip, setTip] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>('upi');

  const payable = isPayable(bill);
  const total = useMemo(() => (bill ? totalWithTip(bill, tip) : 0), [bill, tip]);
  const saved = useMemo(() => (bill ? savedOnBill(bill) : 0), [bill]);

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Bill" onBack={router.back} />
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
          <Skeleton height={140} />
          <Skeleton height={64} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="Bill" onBack={router.back} />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  if (!bill) {
    return (
      <Screen>
        <ScreenHeader title="Bill" onBack={router.back} />
        <EmptyState
          icon="receipt-outline"
          title="No bill yet"
          message="The restaurant raises the bill when your table is done. It will appear here."
          action={{ label: 'Back to the booking', onPress: router.back }}
        />
      </Screen>
    );
  }

  const settled = bill.status === 'paid';

  return (
    <Screen edgeBottom={false}>
      <ScreenHeader title={settled ? 'Receipt' : 'Bill'} onBack={router.back} />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 140 }}
      >
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="heading">{restaurant?.name ?? 'Your table'}</Text>
          <Text variant="caption" tone="faint">
            {settled && bill.paidAt
              ? `Paid · ${bill.paymentId}`
              : `Raised by the restaurant · ${bill.lines.length} items`}
          </Text>
        </View>

        <Card>
          <View style={{ gap: theme.spacing.sm }}>
            {bill.lines.map((line) => (
              <View key={line.id} style={styles.row}>
                <Text variant="body" style={{ flex: 1 }}>
                  {line.quantity > 1 ? `${line.name} × ${line.quantity}` : line.name}
                </Text>
                <Text variant="numeric">{formatPaise(line.quantity * line.unitPrice)}</Text>
              </View>
            ))}

            <Divider />

            <View style={styles.row}>
              <Text variant="body" tone="muted" style={{ flex: 1 }}>
                Subtotal
              </Text>
              <Text variant="numeric">{formatPaise(bill.subtotal)}</Text>
            </View>

            {/*
              The discount sits above the tax because that is where it is
              applied: GST is charged on what the guest pays for the food, not
              on the menu price they did not pay. Drawing it below would show
              an order of operations the total does not follow.
            */}
            {bill.discount ? (
              <View style={styles.row}>
                <Text variant="body" tone="accent" style={{ flex: 1 }}>
                  {bill.discount.label}
                </Text>
                <Text variant="numeric" tone="accent">
                  −{formatPaise(bill.discount.amount)}
                </Text>
              </View>
            ) : null}

            {bill.taxes.map((tax) => (
              <View key={tax.label} style={styles.row}>
                <Text variant="body" tone="muted" style={{ flex: 1 }}>
                  {tax.label}
                </Text>
                <Text variant="numeric">{formatPaise(settleTotals(bill, 0).taxes)}</Text>
              </View>
            ))}

            {(settled ? bill.tip > 0 : tip > 0) ? (
              <View style={styles.row}>
                <Text variant="body" tone="muted" style={{ flex: 1 }}>
                  Tip
                </Text>
                <Text variant="numeric">{formatPaise(settled ? bill.tip : tip)}</Text>
              </View>
            ) : null}

            <Divider />

            <View style={styles.row}>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                Total
              </Text>
              <Text variant="bodyStrong" accessibilityLabel={`Total ${formatPaise(settled ? bill.total : total)}`}>
                {formatPaise(settled ? bill.total : total)}
              </Text>
            </View>
          </View>
        </Card>

        {settled ? (
          <View style={{ alignItems: 'flex-start', gap: theme.spacing.sm }}>
            <Badge tone="positive" label="Paid" icon="checkmark-circle-outline" />
            {saved > 0 ? (
              // The line the whole deal exists for, and the one worth leading a
              // receipt with. It includes the tax that was not charged on the
              // discount, because that is money the guest did not spend either.
              <Text variant="heading" tone="accent">
                You saved {formatPaise(saved)}
              </Text>
            ) : null}
            <Text variant="caption" tone="muted">
              Settled on {new Date(bill.paidAt as string).toLocaleString()}. Nothing further is
              owed.
            </Text>
          </View>
        ) : (
          <>
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="subheading">Add a tip</Text>
              <View style={styles.chips}>
                {TIP_PRESETS.map((share) => {
                  const amount = tipFor(bill.subtotal, share);
                  return (
                    <Chip
                      key={share}
                      label={share === 0 ? 'No tip' : `${Math.round(share * 100)}% · ${formatPaise(amount)}`}
                      selected={tip === amount}
                      onPress={() => setTip(amount)}
                    />
                  );
                })}
              </View>
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="subheading">Pay with</Text>
              <View style={styles.chips}>
                <Chip label="UPI" selected={method === 'upi'} onPress={() => setMethod('upi')} />
                <Chip label="Card" selected={method === 'card'} onPress={() => setMethod('card')} />
              </View>
            </View>

            <View style={styles.note}>
              <Ionicons name="lock-closed-outline" size={14} color={theme.colors.inkFaint} />
              <Text variant="caption" tone="faint" style={{ flex: 1 }}>
                Mesa never sees your card or UPI details. The restaurant is paid directly.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {settled ? null : (
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.hairline },
          ]}
        >
          <Button
            label={
              stage === 'at-gateway'
                ? 'Waiting for your bank…'
                : stage === 'verifying'
                  ? 'Confirming…'
                  : `Pay ${formatPaise(total)}`
            }
            onPress={() => pay({ tip, method })}
            loading={isPaying}
            disabled={!payable}
            accessibilityHint={`Pays ${formatPaise(total)} by ${method === 'upi' ? 'U P I' : 'card'}`}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
