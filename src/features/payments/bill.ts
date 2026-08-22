import type { Bill, BillLine } from '@/types';

import { settleTotals } from '@/features/offers/deals';
import { AppError } from '@/utils/errors';

/**
 * The bill, as arithmetic.
 *
 * Same shape as the waitlist: pure functions over a record and the clock, so
 * the screen, the service and the checks all agree by construction rather than
 * by three implementations happening to match. Nothing here reaches for a
 * gateway; paying is what the service does, and deciding whether a bill *can*
 * be paid is what this does.
 *
 * The venue computes the subtotal and the taxes. This file does not, and that
 * is not laziness: a client that recomputes a total is a client that can
 * disagree with the till, and the guest is standing at a table looking at both.
 */

/** Tip presets, as a share of the subtotal. Zero is deliberately first. */
export const TIP_PRESETS = [0, 0.05, 0.1, 0.15] as const;

export function lineTotal(line: BillLine): number {
  return line.quantity * line.unitPrice;
}

/**
 * A tip preset in paise, rounded to a whole rupee.
 *
 * Nobody tips ₹63.40. Rounding to the rupee is what the guest expects to see
 * on the button, and rounding *down* keeps the preset from quietly costing
 * more than the percentage it claims.
 */
export function tipFor(subtotal: number, share: number): number {
  return Math.floor((subtotal * share) / 100) * 100;
}

/**
 * Subtotal, less any discount, plus tax on what is left, plus the tip.
 *
 * Delegates to `settleTotals` rather than adding up again: the order of those
 * operations is the whole rule, and two implementations of it is one more than
 * can be kept in agreement.
 */
export function totalWithTip(bill: Pick<Bill, 'subtotal' | 'taxes' | 'discount'>, tip: number): number {
  return settleTotals(bill, tip).total;
}

/**
 * Whether this bill can be paid right now, and why not when it cannot.
 *
 * Throws rather than returning false for the same reason the booking rules do:
 * every refusal the guest can hit already has written copy, and a boolean
 * would make the caller invent it again at the point of use.
 */
export function assertPayable(bill: Bill): void {
  if (bill.status === 'paid') throw new AppError('bill-settled');
  if (bill.status === 'void') throw new AppError('bill-void');
  if (bill.total <= 0) {
    throw new AppError('validation', { message: 'This bill comes to zero.' });
  }
}

/** True when the guest still owes something on this booking. */
export function isPayable(bill: Bill | null | undefined): boolean {
  if (!bill) return false;
  try {
    assertPayable(bill);
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether an order minted earlier is still good.
 *
 * A stale order is the one failure mode a guest cannot diagnose: the gateway
 * refuses, the app says "something went wrong", and the bill is still open. So
 * the age is checked before the guest is sent anywhere, and a fresh order is
 * cheap.
 */
export function orderIsFresh(expiresAt: number, now: number = Date.now()): boolean {
  return expiresAt > now;
}

/**
 * `₹1,450.00` from paise.
 *
 * The only conversion between paise and rupees in the app, and it happens at
 * the moment of drawing. Paise are shown in full — a bill that reads `₹1,450`
 * when the card is charged `₹1,450.75` is the kind of small lie that ends a
 * conversation with a guest badly.
 */
export function formatPaise(paise: number, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : '';
  const negative = paise < 0;
  const absolute = Math.abs(Math.round(paise));
  const rupees = Math.floor(absolute / 100);
  const remainder = String(absolute % 100).padStart(2, '0');

  const whole = String(rupees);
  const last = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last}` : last;

  return `${negative ? '−' : ''}${symbol}${grouped}.${remainder}`;
}
