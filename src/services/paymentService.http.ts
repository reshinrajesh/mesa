import type { Bill, PaymentAuthorization, PaymentOrder } from '@/types';
import type { PaymentService } from './contracts';

import { delay } from './latency';
import { request } from './http';

/**
 * Bills and payments, server-side.
 *
 * Everything here carries the token. A bill is what somebody owes, and the
 * only person entitled to read one is the guest whose booking it is — the
 * server scopes it, and this file never sends a guest id for the server to
 * take at face value.
 *
 * `createOrder` sends the tip and nothing else about money. The amount comes
 * back from the server, computed there, and `checkout` is handed that amount
 * rather than one this file added up. The client naming its own price is the
 * oldest hole in the book.
 */
export const paymentServiceHttp: PaymentService = {
  async getBill(reservationId) {
    // 404 is the ordinary answer for a table with no bill raised yet, not a
    // fault: most bookings never have one.
    try {
      return await request<Bill>(
        `/reservations/${encodeURIComponent(reservationId)}/bill`,
      );
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'not-found') {
        return null;
      }
      throw error;
    }
  },

  createOrder(billId, tip) {
    return request<PaymentOrder>(`/bills/${encodeURIComponent(billId)}/order`, {
      method: 'POST',
      body: { tip },
    });
  },

  /**
   * The one method with no server call in it.
   *
   * This is the gateway's own sheet — Razorpay's SDK, the guest's UPI app, a
   * card form — and the app is a bystander until it comes back with a signed
   * payment. Until the SDK is wired, it stands in with the same shape and the
   * same delay, so every screen state around it is real code rather than
   * something to be written on the day the keys arrive.
   */
  async checkout(_order: PaymentOrder, method): Promise<PaymentAuthorization> {
    await delay(method === 'upi' ? 2_400 : 1_200);
    throw Object.assign(
      new Error('no payment gateway is configured for this build'),
      { code: 'payment-failed' },
    );
  },

  confirmPayment(authorization) {
    return request<Bill>('/payments/verify', {
      method: 'POST',
      body: authorization,
    });
  },
};
