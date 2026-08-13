import type { Page, Reservation } from '@/types';
import type { ReservationService } from './contracts';

import { request } from './http';

/**
 * The real reservation service.
 *
 * Every method here is authenticated — a booking belongs to somebody, and the
 * bearer token comes from SecureStore inside `request()` rather than being
 * threaded through the UI.
 *
 * The rules in `features/reservations/rules.ts` are *not* called from here, and
 * that is deliberate rather than an oversight. On a real backend those checks
 * are the server's: it owns the table inventory, and a client that decided for
 * itself whether a slot was free would be racing every other client in the
 * restaurant. They stay in the mock, which is playing the server's part, and
 * they stay pure so both can use them. What this file relies on instead is the
 * status mapping already in `http.ts` — a 409 becomes `slot-taken`, whose copy
 * is the same "That time just went" the mock produces.
 */
export const reservationServiceHttp: ReservationService = {
  getReservations() {
    return request<Page<Reservation>>('/reservations');
  },

  getReservationById(id) {
    return request<Reservation>(`/reservations/${encodeURIComponent(id)}`);
  },

  createReservation(input) {
    return request<Reservation>('/reservations', { method: 'POST', body: input });
  },

  updateReservation(input) {
    const { id, ...patch } = input;
    return request<Reservation>(`/reservations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: patch,
    });
  },

  cancelReservation(id, reason) {
    // POST to a sub-resource rather than DELETE: cancelling is a state change
    // that keeps the record, and the guest can still see it afterwards.
    return request<Reservation>(`/reservations/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: { reason },
    });
  },

  joinWaitlist(input) {
    return request<Reservation>('/waitlist', { method: 'POST', body: input });
  },

  acceptWaitlistOffer(id) {
    return request<Reservation>(`/waitlist/${encodeURIComponent(id)}/accept`, { method: 'POST' });
  },
};
