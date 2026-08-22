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

/**
 * Where a table is in its evening, as the floor sees it.
 *
 * Deliberately not `ReservationStatus`. That one is the guest's word — six
 * values the app switches screens on — and the floor needs its own vocabulary
 * for the same table so that a host marking somebody seated is not editing
 * what a guest's app renders as a badge.
 */
export type ServiceState = 'booked' | 'arrived' | 'seated' | 'done' | 'no-show';

/** One row on tonight's board. */
export interface StaffTable {
  id: string;
  restaurantId: string;
  guestName: string;
  time: string;
  partySize: number;
  status: string;
  serviceState: ServiceState;
  walkIn?: boolean;
  /** Rounds the kitchen has not taken yet — what the floor is watching for. */
  roundsWaiting: number;
  roundsSent: number;
  /**
   * The oldest round still waiting, so the row's one action has something to
   * act on. A board that counts rounds but cannot name one has a button that
   * does nothing.
   */
  nextRoundId: string | null;
  bill: { id: string; status: string; total: number } | null;
}

export interface StaffBoard {
  date: string;
  venues: string[];
  tables: StaffTable[];
}
