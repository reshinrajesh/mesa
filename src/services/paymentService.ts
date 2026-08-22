import type { Bill, PaymentAuthorization, PaymentMethod, PaymentOrder } from '@/types';

import { totalWithTip } from '@/features/payments/bill';
import { AppError } from '@/utils/errors';
import { localId, seededUnit } from '@/utils/id';
import { storage, storageKeys } from '@/utils/storage';
import type { PaymentService } from './contracts';
import { delay, simulate } from './latency';
import { reservationService } from './reservationService';

/**
 * The bill, and a gateway that is not there yet.
 *
 * The mock plays the venue's till *and* the payment provider, and keeps them
 * apart on purpose, because the seam between them is the thing that has to
 * survive a real Razorpay arriving:
 *
 * - the till raises a bill against a booking that has been sat down,
 * - the server mints an order with the amount fixed in it,
 * - the gateway signs a payment,
 * - the server verifies that signature and only then marks the bill paid.
 *
 * The signature here is a seeded hash rather than an HMAC with a secret, and it
 * is verified in this same file, which is precisely the part that is fake: a
 * client cannot really verify anything about itself. What is real is the
 * *shape* — `confirmPayment` is the only path to `paid`, and it takes the
 * gateway's word rather than the app's.
 */

const BILLS_KEY = storageKeys.bills;

/** The venue's own arithmetic, which the client never redoes. */
const GST_RATE = 0.05;

interface StoredBill extends Bill {
  /** Orders minted for this bill, so a replayed one can be refused. */
  orders?: Record<string, { amount: number; expiresAt: number; used?: boolean }>;
}

async function readBills(): Promise<StoredBill[]> {
  return storage.get<StoredBill[]>(BILLS_KEY, []);
}

async function writeBills(bills: StoredBill[]): Promise<void> {
  await storage.set(BILLS_KEY, bills);
}

/**
 * What the table ate, invented once and then remembered.
 *
 * Seeded from the reservation id so the same booking always produces the same
 * bill: a total that changes between two reads of the same screen is a total
 * nobody would pay, and the guest may well open this twice while the card
 * machine is coming.
 */
function draftLines(reservationId: string, partySize: number) {
  const roll = seededUnit(reservationId);
  const perHead = 38_000 + Math.floor(roll * 42_000); // ₹380–₹800 a head, in paise
  const shared = 24_000 + Math.floor(seededUnit(`${reservationId}|shared`) * 30_000);

  return [
    {
      id: `${reservationId}_bl_1`,
      name: partySize > 2 ? 'Table order, mains' : 'Mains',
      quantity: partySize,
      unitPrice: Math.round(perHead / 100) * 100,
    },
    {
      id: `${reservationId}_bl_2`,
      name: 'To start, shared',
      quantity: 1,
      unitPrice: Math.round(shared / 100) * 100,
    },
    {
      id: `${reservationId}_bl_3`,
      name: 'Coffee',
      quantity: partySize,
      unitPrice: 12_000,
    },
  ];
}

/**
 * A bill exists once somebody has eaten, and not before.
 *
 * The venue raises it in the real world; here the trigger is the booking
 * settling into `completed`, four hours after its sitting. A bill against a
 * table that has not arrived is a demand for money for nothing.
 *
 * When the staff surface lands this becomes "seated", which is earlier and
 * more useful — you pay before you leave, not after the app has decided your
 * evening is over.
 */
function billable(status: string): boolean {
  return status === 'completed';
}

async function ensureBill(reservationId: string): Promise<StoredBill | null> {
  const bills = await readBills();
  const existing = bills.find((bill) => bill.reservationId === reservationId);
  if (existing) return existing;

  const reservation = await reservationService.getReservationById(reservationId);
  if (!billable(reservation.status)) return null;

  const lines = draftLines(reservationId, reservation.partySize);
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const taxes = [{ label: 'GST 5%', amount: Math.round(subtotal * GST_RATE) }];

  const bill: StoredBill = {
    id: localId('bil'),
    reservationId,
    restaurantId: reservation.restaurantId,
    currency: 'INR',
    lines,
    subtotal,
    taxes,
    tip: 0,
    total: subtotal + taxes[0].amount,
    status: 'open',
    raisedAt: new Date().toISOString(),
    orders: {},
  };

  await writeBills([...bills, bill]);
  return bill;
}

export const paymentService: PaymentService = {
  async getBill(reservationId) {
    return simulate(() => ensureBill(reservationId));
  },

  async createOrder(billId, tip) {
    await delay();
    const bills = await readBills();
    const bill = bills.find((candidate) => candidate.id === billId);
    if (!bill) throw new AppError('not-found');
    if (bill.status === 'paid') throw new AppError('bill-settled');
    if (bill.status === 'void') throw new AppError('bill-void');

    const amount = totalWithTip(bill, tip);
    const order: PaymentOrder = {
      orderId: localId('ord'),
      billId,
      amount,
      currency: bill.currency,
      // Fifteen minutes, which is longer than paying takes and shorter than a
      // guest leaving the table with the app open.
      expiresAt: Date.now() + 15 * 60_000,
    };

    bill.tip = Math.max(0, tip);
    bill.total = amount;
    bill.orders = { ...bill.orders, [order.orderId]: { amount, expiresAt: order.expiresAt } };
    await writeBills(bills);
    return order;
  },

  async checkout(order, method: PaymentMethod) {
    // Where the Razorpay sheet takes over. The wait is the guest looking at
    // their bank's app, which is why it is longer than everything else here —
    // and why the screen has to hold a pending state rather than a spinner
    // that looks stuck.
    await delay(method === 'upi' ? 2_400 : 1_200);

    if (order.expiresAt <= Date.now()) throw new AppError('payment-failed');

    const paymentId = localId('pay');
    return {
      orderId: order.orderId,
      paymentId,
      // Stands in for Razorpay's HMAC over `order_id|payment_id`. Seeded, so a
      // tampered pair does not verify.
      signature: String(seededUnit(`${order.orderId}|${paymentId}`)).slice(2, 18),
    };
  },

  async confirmPayment(authorization: PaymentAuthorization) {
    await delay();
    const bills = await readBills();
    const bill = bills.find((candidate) => candidate.orders?.[authorization.orderId]);
    if (!bill) throw new AppError('not-found');

    const order = bill.orders?.[authorization.orderId];
    if (!order || order.used) throw new AppError('payment-failed');

    const expected = String(
      seededUnit(`${authorization.orderId}|${authorization.paymentId}`),
    ).slice(2, 18);
    if (expected !== authorization.signature) throw new AppError('payment-failed');

    order.used = true;
    bill.status = 'paid';
    bill.paidAt = new Date().toISOString();
    bill.paymentId = authorization.paymentId;
    bill.total = order.amount;
    await writeBills(bills);

    const { orders: _orders, ...settled } = bill;
    return settled as Bill;
  },
};
