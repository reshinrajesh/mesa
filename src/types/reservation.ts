export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'waitlisted'
  | 'completed'
  | 'cancelled'
  | 'no-show';

export type SeatingPreference = 'any' | 'indoor' | 'outdoor' | 'bar' | 'window' | 'private';

export type Occasion =
  | 'none'
  | 'birthday'
  | 'anniversary'
  | 'business'
  | 'date-night'
  | 'celebration';

export type SlotAvailability = 'available' | 'limited' | 'unavailable';

/**
 * The queue behind a full slot.
 *
 * Present only on `unavailable` slots, and only at venues that keep a list.
 * A full slot with no `waitlist` is exactly that: full, with nothing to join.
 */
export interface SlotWaitlist {
  /** Parties already queued for this time. Never zero — an empty queue is a free table. */
  queueLength: number;
}

export interface TimeSlot {
  /** "18:30" in venue-local 24h time. The single canonical slot key. */
  time: string;
  availability: SlotAvailability;
  /** Tables left, for the "2 tables left" hint on limited slots. */
  tablesLeft: number;
  /** Populated by the smart-suggestion layer, e.g. "Usually quieter". */
  hint?: string;
  /** True when the recommendation engine wants this slot highlighted. */
  recommended?: boolean;
  /** Set when the slot is full but the venue will take a waitlist entry. */
  waitlist?: SlotWaitlist;
}

export interface AvailabilityDay {
  restaurantId: string;
  /** ISO date, "2026-08-14". Local calendar date, never a UTC timestamp. */
  date: string;
  partySize: number;
  slots: TimeSlot[];
  /** Set when the venue takes no bookings at all that day. */
  closedReason?: string;
  /** Whether this venue keeps a waitlist at all, so the UI can say so once. */
  waitlistOpen: boolean;
}

/**
 * A place in a queue.
 *
 * Only `position` and `joinedAt` are stored. Everything the screen shows — how
 * far up the queue you are now, whether a table is being held, how long is left
 * on the hold — is derived from those two by `features/reservations/waitlist`,
 * so no clock, timer or background write can leave the record disagreeing with
 * what the user is looking at.
 */
export interface WaitlistEntry {
  /** Parties ahead at the moment of joining. Always at least 1. */
  position: number;
  /** ISO timestamp. The origin the derived position counts down from. */
  joinedAt: string;
}

export interface ReservationDraft {
  restaurantId: string;
  date: string | null;
  partySize: number;
  time: string | null;
  seating: SeatingPreference;
  occasion: Occasion;
  notes: string;
}

export interface CreateReservationInput {
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
  seating: SeatingPreference;
  occasion: Occasion;
  notes: string;
}

/**
 * Joining a queue asks for exactly what booking a table asks for. The guest
 * fills in the same wizard; only the outcome differs.
 */
export type JoinWaitlistInput = CreateReservationInput;

export interface Reservation {
  id: string;
  /**
   * Six-character human code shown on the confirmation and encoded in the QR.
   * Absent on waitlist entries: there is no table yet, and printing a code for
   * one would be the app lying about what the guest holds.
   */
  code?: string;
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
  seating: SeatingPreference;
  occasion: Occasion;
  notes: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
  /** Set once the guest has left a review, so the "Rate" action can retire. */
  reviewId?: string;
  /** Populated when the venue attaches a note, e.g. a table number. */
  venueMessage?: string;
  /** Present exactly when `status === 'waitlisted'`. */
  waitlist?: WaitlistEntry;
}

export interface UpdateReservationInput {
  id: string;
  date?: string;
  time?: string;
  partySize?: number;
  seating?: SeatingPreference;
  occasion?: Occasion;
  notes?: string;
}
