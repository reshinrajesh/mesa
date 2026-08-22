/**
 * Ordering from the table.
 *
 * An order is a *round*, not a basket: a table orders starters, then mains,
 * then coffee, and each of those is its own order with its own moment of being
 * placed. Modelling it as one growing cart would mean a guest could edit food
 * that is already on a pass, and would leave the bill unable to say what
 * arrived when.
 *
 * Money is paise here, as it is on a bill, because these lines *become* the
 * bill. A menu price in rupees crossing into a total in paise is the one
 * conversion this app does, and it happens once, in `unitPrice` below.
 */

export type OrderStatus =
  /** Sent from the table. Nothing has been cooked yet. */
  | 'placed'
  /** The kitchen has it. Too late to change. */
  | 'preparing'
  /** On the table. */
  | 'served'
  /** Withdrawn before the kitchen took it. */
  | 'cancelled';

export interface OrderLine {
  id: string;
  /** The menu item this came from, so a bill can be traced back to a menu. */
  menuItemId: string;
  name: string;
  quantity: number;
  /** Paise, per unit, as the menu priced it at the moment of ordering. */
  unitPrice: number;
  /** "No chilli", "one plate to share". The kitchen reads this. */
  note?: string;
}

export interface Order {
  id: string;
  reservationId: string;
  restaurantId: string;
  /** Which round this is: 1 for the first, 2 for the next. Shown as "Round 2". */
  round: number;
  lines: OrderLine[];
  status: OrderStatus;
  placedAt: string;
  /** Paise. The sum of the lines, fixed when the order was placed. */
  subtotal: number;
}

/**
 * A line the guest is still assembling, before it is sent.
 *
 * Deliberately not an `OrderLine`: it has no id and no fixed price yet,
 * because neither exists until the round is placed. A cart that carried a
 * price would let the menu change underneath it and the guest be charged the
 * old one, or the new one, depending on which screen they last looked at.
 */
export interface CartLine {
  menuItemId: string;
  quantity: number;
  note?: string;
}
