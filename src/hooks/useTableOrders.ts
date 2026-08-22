import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { CartLine, Order } from '@/types';

import { queryKeys } from '@/constants/queryKeys';
import { setQuantity } from '@/features/orders/cart';
import { orderService } from '@/services';
import { toast } from '@/store/uiStore';
import { toAppError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

/**
 * The table's rounds, and the one being assembled.
 *
 * The cart lives here rather than in a store because it dies with the screen:
 * a half-built round is not something to restore three days later at a
 * different restaurant, and a cart that survived a booking would be the most
 * confusing thing in the app.
 *
 * Placing a round invalidates the bill as well as the orders. The bill *is*
 * the rounds — a total that had not noticed the coffee would be the first
 * thing a guest saw and the last thing they trusted.
 */
export function useTableOrders(reservationId: string | undefined) {
  const client = useQueryClient();
  const [cart, setCart] = useState<CartLine[]>([]);

  const query = useQuery({
    queryKey: queryKeys.orders.forReservation(reservationId ?? 'none'),
    queryFn: () => orderService.getOrders(reservationId as string),
    enabled: Boolean(reservationId),
    // The kitchen moves a round on without telling anybody, so this is one of
    // the few things in the app worth asking about again while it is on screen.
    refetchInterval: 30_000,
  });

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: queryKeys.orders.forReservation(reservationId ?? '') });
    void client.invalidateQueries({ queryKey: queryKeys.bills.forReservation(reservationId ?? '') });
  };

  const place = useMutation({
    mutationFn: async (): Promise<Order> => {
      if (!reservationId) throw toAppError(new Error('no table to order to'));
      return orderService.placeOrder(reservationId, cart);
    },
    onSuccess: (order) => {
      setCart([]);
      invalidate();
      haptics.success();
      toast({
        title: `Round ${order.round} sent`,
        message: 'The kitchen has it. You can add another round any time.',
        tone: 'positive',
      });
    },
    onError: (error) => {
      const app = toAppError(error);
      haptics.error();
      toast({ title: app.title, message: app.message, tone: 'danger' });
    },
  });

  const withdraw = useMutation({
    mutationFn: (orderId: string) => orderService.withdrawOrder(orderId),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Round withdrawn', message: 'Nothing was sent to the kitchen.', tone: 'positive' });
    },
    onError: (error) => {
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    },
  });

  return {
    orders: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? toAppError(query.error) : null,
    cart,
    setItemQuantity: (menuItemId: string, quantity: number) =>
      setCart((current) => setQuantity(current, menuItemId, quantity)),
    clearCart: () => setCart([]),
    placeOrder: place.mutate,
    isPlacing: place.isPending,
    withdrawOrder: withdraw.mutate,
  };
}
