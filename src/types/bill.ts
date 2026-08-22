/**
 * The bill at the table, and paying it.
 *
 * **Every amount here is paise, and every amount elsewhere in the app is
 * rupees.** That is a deliberate seam rather than an inconsistency. A menu
 * price is a label — `₹420` — and rounding one by a rupee misprices a dosa. A
 * bill is money moving, and a float that rounds by a paisa is a reconciliation
 * failure between what the guest was charged and what the venue banked. Razorpay
 * takes paise for the same reason, and the mock here is shaped like Razorpay.
 *
 * The rule that keeps the two apart: nothing converts between them except
 * `formatPaise`, at the moment it is drawn.
 */

export type BillStatus =
  /** Raised by the venue and not yet settled. The only payable state. */
  | 'open'
  /** Settled. Carries `paidAt` and the payment that did it. */
  | 'paid'
  /** Cancelled by the venue — a mistake, a walk-out, a comped table. */
  | 'void';

export interface BillLine {
  id: string;
  name: string;
  quantity: number;
  /** Paise, per unit. */
  unitPrice: number;
}

/** A tax line as the venue computed it. The client never calculates one. */
export interface BillTax {
  /** "GST 5%", "Service charge 10%" — whatever the venue is charging. */
  label: string;
  /** Paise. */
  amount: number;
}

export interface Bill {
  id: string;
  reservationId: string;
  restaurantId: string;
  /** ISO 4217. Always INR today; carried anyway, because bills are money. */
  currency: string;
  lines: BillLine[];
  /** Paise. The sum of the lines, as the venue computed it. */
  subtotal: number;
  taxes: BillTax[];
  /**
   * Paise, chosen by the guest. Zero is a real answer and the UI must never
   * make it the awkward one — a tip that is hard to decline is a surcharge.
   */
  tip: number;
  /** Paise. Subtotal plus taxes plus tip. */
  total: number;
  status: BillStatus;
  raisedAt: string;
  paidAt?: string;
  /** The payment that settled it, for the receipt. */
  paymentId?: string;
}

/**
 * An order, minted server-side before the guest is sent to a gateway.
 *
 * The amount is fixed here and nowhere else. A client that could name its own
 * amount at checkout is a client that can pay ₹1 for a ₹3,000 dinner, which is
 * why Razorpay works this way and why the mock does too.
 */
export interface PaymentOrder {
  orderId: string;
  billId: string;
  /** Paise, as the server computed it. */
  amount: number;
  currency: string;
  /** Epoch ms after which the order is stale and must be re-created. */
  expiresAt: number;
}

/**
 * What the gateway hands back to the app after the guest has paid.
 *
 * The signature is the whole point: the app cannot be trusted to say "that
 * worked", so it forwards this to the server, which recomputes the HMAC over
 * `orderId|paymentId` and only then marks the bill paid.
 */
export interface PaymentAuthorization {
  orderId: string;
  paymentId: string;
  signature: string;
}

export type PaymentMethod = 'upi' | 'card';
