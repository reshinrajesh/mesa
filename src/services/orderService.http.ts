import type { CartLine, Order } from '@/types';
import type { OrderService } from './contracts';

import { request } from './http';

/**
 * Rounds from the table, server-side.
 *
 * Everything carries the token: a round is food somebody will be charged for,
 * and the only person entitled to send one to a table is the guest whose
 * booking it is.
 *
 * `placeOrder` sends menu item ids and quantities and no prices at all. The
 * server prices the round from its own menu, which is the only copy that
 * cannot have been edited on the way — a client that named its own prices
 * could order a tasting menu for a rupee.
 */
export const orderServiceHttp: OrderService = {
  getOrders(reservationId) {
    return request<Order[]>(`/reservations/${encodeURIComponent(reservationId)}/orders`);
  },

  placeOrder(reservationId, lines: CartLine[]) {
    return request<Order>(`/reservations/${encodeURIComponent(reservationId)}/orders`, {
      method: 'POST',
      body: {
        lines: lines.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
          note: line.note,
        })),
      },
    });
  },

  withdrawOrder(orderId) {
    return request<Order>(`/orders/${encodeURIComponent(orderId)}/withdraw`, { method: 'POST' });
  },
};
