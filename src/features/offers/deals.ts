import type { Bill, Offer, Restaurant, TimeSlot } from '@/types';

/**
 * Deals, as arithmetic.
 *
 * A venue advertises offers; a slot carries the one that applies to booking
 * that hour; a bill honours whatever was promised. Three places, one set of
 * rules, so the badge on the card, the chip on the board and the line on the
 * receipt cannot disagree — which they would, being written by three different
 * screens otherwise.
 *
 * The rule that matters more than any of them: **a discount comes off the food
 * before the tax is computed.** GST is levied on what the guest actually pays
 * for the food, not on the menu price they did not pay. Taxing first and
 * discounting after overcharges by the tax on the discount — a few rupees,
 * always in the venue's favour, and exactly the sort of error nobody notices
 * for a year.
 */

/** The percent offers only. The others are real, but no total can apply them. */
export function percentOffers(restaurant: Pick<Restaurant, 'offers'>): Offer[] {
  return restaurant.offers.filter((offer) => offer.kind === 'percent' && (offer.percent ?? 0) > 0);
}

/**
 * The single offer a card should lead with.
 *
 * The deepest percentage, or failing that the first of whatever else is
 * running. A card with room for one badge that shows the smallest offer is
 * worse than one that shows none: it teaches people the badge is not worth
 * reading.
 */
export function headlineOffer(restaurant: Pick<Restaurant, 'offers'>): Offer | null {
  const percents = percentOffers(restaurant);
  if (percents.length) {
    return percents.reduce((best, offer) =>
      (offer.percent ?? 0) > (best.percent ?? 0) ? offer : best,
    );
  }
  return restaurant.offers[0] ?? null;
}

/**
 * What booking this slot is worth, as a percentage.
 *
 * The slot's own discount when the board has set one, and the venue's standing
 * percent offer otherwise. Never both added together: two offers stacking is
 * how a demo ends up giving away 45% of a bill, and no venue means that.
 */
export function discountForSlot(
  restaurant: Pick<Restaurant, 'offers'>,
  slot: Pick<TimeSlot, 'discountPercent'> | null | undefined,
): number {
  const fromSlot = slot?.discountPercent ?? 0;
  if (fromSlot > 0) return fromSlot;
  return headlineOffer(restaurant)?.percent ?? 0;
}

/** Paise off a subtotal, rounded down so the venue never over-discounts. */
export function discountAmount(subtotal: number, percent: number): number {
  if (percent <= 0 || subtotal <= 0) return 0;
  return Math.floor((subtotal * Math.min(100, percent)) / 100);
}

/**
 * The bill as it should be totalled, in order.
 *
 * subtotal → less the discount → tax on what is left → plus the tip.
 *
 * The tip is last and is not discounted, because a tip is not the venue's
 * price and taking a percentage off it would be helping yourself to somebody
 * else's gratuity.
 */
export function settleTotals(
  bill: Pick<Bill, 'subtotal' | 'taxes' | 'discount'>,
  tip: number,
): { discount: number; taxable: number; taxes: number; total: number } {
  const discount = bill.discount?.amount ?? 0;
  const taxable = Math.max(0, bill.subtotal - discount);
  // Taxes arrive computed by the venue against the *undiscounted* subtotal, so
  // they are rescaled to what is actually being charged rather than recomputed
  // from a rate this app would have to guess at.
  const scale = bill.subtotal > 0 ? taxable / bill.subtotal : 0;
  const taxes = bill.taxes.reduce((sum, tax) => sum + Math.round(tax.amount * scale), 0);
  return {
    discount,
    taxable,
    taxes,
    total: taxable + taxes + Math.max(0, tip),
  };
}

/** "You saved ₹642" — the number a receipt should lead with, in paise. */
export function savedOnBill(bill: Pick<Bill, 'subtotal' | 'taxes' | 'discount'>): number {
  const discount = bill.discount?.amount ?? 0;
  if (discount <= 0) return 0;
  const scale = bill.subtotal > 0 ? discount / bill.subtotal : 0;
  const taxSaved = bill.taxes.reduce((sum, tax) => sum + Math.round(tax.amount * scale), 0);
  // The tax the guest did not pay is money they did not spend, and a receipt
  // that omitted it would understate the deal the venue actually gave.
  return discount + taxSaved;
}
