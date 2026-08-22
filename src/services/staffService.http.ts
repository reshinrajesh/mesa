import type { Order, Reservation, StaffBoard } from '@/types';
import type { StaffService } from './contracts';

import { request } from './http';

/**
 * The floor, server-side.
 *
 * No venue in any path. Which rooms this account works comes from the join on
 * the server, so there is nothing here for somebody to edit in order to look
 * at another restaurant's evening.
 */
export const staffServiceHttp: StaffService = {
  getBoard() {
    return request<StaffBoard>('/staff/tonight');
  },

  setServiceState(reservationId, state) {
    return request<Reservation>(
      `/staff/reservations/${encodeURIComponent(reservationId)}/state`,
      { method: 'POST', body: { state } },
    );
  },

  advanceRound(orderId, state) {
    return request<Order>(`/staff/orders/${encodeURIComponent(orderId)}/state`, {
      method: 'POST',
      body: { state },
    });
  },
};
