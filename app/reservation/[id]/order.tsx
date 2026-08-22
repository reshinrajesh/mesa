import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  Skeleton,
  Stepper,
  Text,
} from '@/components/ui';
import { canOrder, cartCount, cartSubtotal, canWithdraw, quantityOf } from '@/features/orders/cart';
import { formatPaise } from '@/features/payments/bill';
import { useMenu } from '@/hooks/useRestaurants';
import { useReservation } from '@/hooks/useReservations';
import { useTableOrders } from '@/hooks/useTableOrders';
import { useTheme } from '@/theme';
import { todayKey } from '@/utils/date';

const ORDER_STATUS: Record<string, { label: string; tone: 'positive' | 'warning' | 'neutral' }> = {
  placed: { label: 'Sent', tone: 'warning' },
  preparing: { label: 'With the kitchen', tone: 'warning' },
  served: { label: 'Served', tone: 'positive' },
  cancelled: { label: 'Withdrawn', tone: 'neutral' },
};

/**
 * Ordering from the table.
 *
 * Rounds rather than a basket. A table orders starters, then mains, then
 * coffee, and each is sent when the table is ready for it — so what is on
 * screen is one round being built above a list of the rounds already sent, and
 * the second list is what the guest checks when they are wondering where the
 * food is.
 *
 * A sent round can be withdrawn only while the kitchen has not taken it. After
 * that the food exists, and an app offering to un-order a cooked dish is an app
 * arguing with a waiter on the guest's behalf.
 */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const { data: reservation, isLoading: loadingBooking } = useReservation(id);
  const { data: menu, isLoading: loadingMenu } = useMenu(reservation?.restaurantId);
  const {
    orders,
    error,
    cart,
    setItemQuantity,
    placeOrder,
    isPlacing,
    withdrawOrder,
  } = useTableOrders(id);

  const orderable = canOrder(reservation, todayKey());
  const subtotal = useMemo(() => cartSubtotal(cart, menu), [cart, menu]);
  const count = cartCount(cart);

  if (loadingBooking || loadingMenu) {
    return (
      <Screen>
        <ScreenHeader title="Order" onBack={router.back} />
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
          <Skeleton height={120} />
          <Skeleton height={120} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="Order" onBack={router.back} />
        <ErrorState error={error} />
      </Screen>
    );
  }

  if (!orderable) {
    return (
      <Screen>
        <ScreenHeader title="Order" onBack={router.back} />
        <EmptyState
          icon="restaurant-outline"
          title="Ordering opens at the table"
          message="On the day of your booking, once you are sitting down, the menu becomes orderable here."
          action={{ label: 'Back to the booking', onPress: router.back }}
        />
      </Screen>
    );
  }

  return (
    <Screen edgeBottom={false}>
      <ScreenHeader title="Order" onBack={router.back} />

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          gap: theme.spacing.lg,
          paddingBottom: count > 0 ? 150 : theme.spacing.xxl,
        }}
      >
        {orders.length > 0 ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="subheading">Sent so far</Text>
            {orders.map((order) => {
              const meta = ORDER_STATUS[order.status] ?? ORDER_STATUS.placed;
              return (
                <Card key={order.id}>
                  <View style={{ gap: theme.spacing.xs }}>
                    <View style={styles.row}>
                      <Text variant="bodyStrong" style={{ flex: 1 }}>
                        Round {order.round}
                      </Text>
                      <Badge label={meta.label} tone={meta.tone} />
                    </View>

                    {order.lines.map((line) => (
                      <View key={line.id} style={styles.row}>
                        <Text variant="body" tone="muted" style={{ flex: 1 }}>
                          {line.quantity > 1 ? `${line.name} × ${line.quantity}` : line.name}
                        </Text>
                        <Text variant="numeric" tone="muted">
                          {formatPaise(line.quantity * line.unitPrice)}
                        </Text>
                      </View>
                    ))}

                    {canWithdraw(order) ? (
                      <Button
                        label="Withdraw this round"
                        variant="secondary"
                        size="sm"
                        onPress={() => withdrawOrder(order.id)}
                      />
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </View>
        ) : null}

        <View style={{ gap: theme.spacing.md }}>
          <Text variant="subheading">
            {orders.length > 0 ? `Round ${orders.length + 1}` : 'What would you like?'}
          </Text>

          {menu?.sections.map((section) => (
            <View key={section.id} style={{ gap: theme.spacing.sm }}>
              <Text variant="overline" tone="faint">
                {section.title}
              </Text>

              {section.items.map((item) => (
                <View key={item.id}>
                  <View style={styles.itemRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="body">{item.name}</Text>
                      <Text variant="caption" tone="faint" numberOfLines={2}>
                        {item.description}
                      </Text>
                      <Text variant="numeric">{formatPaise(item.price * 100)}</Text>
                    </View>

                    <Stepper
                      value={quantityOf(cart, item.id)}
                      onChange={(next) => setItemQuantity(item.id, next)}
                      min={0}
                      max={20}
                      accessibilityLabel={`${item.name}, ${quantityOf(cart, item.id)} on this round`}
                    />
                  </View>
                  <Divider />
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {count > 0 ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.hairline },
          ]}
        >
          <Button
            label={`Send ${count} item${count === 1 ? '' : 's'} · ${formatPaise(subtotal)}`}
            fullWidth
            loading={isPlacing}
            onPress={() => placeOrder()}
            accessibilityHint="Sends this round to the kitchen"
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
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
