import { create } from 'zustand';

import type { Occasion, ReservationDraft, SeatingPreference } from '@/types';

import { todayKey } from '@/utils/date';

/**
 * The in-progress booking.
 *
 * A booking spans several screens, so it cannot live in a screen's local state:
 * navigating back from Review to change the party size must not lose the time
 * already chosen. It is cleared explicitly on confirmation and on abandon, so a
 * half-finished booking from last week never reappears.
 */

export type BookingStep = 'date' | 'guests' | 'time' | 'seating' | 'notes';

export const BOOKING_STEPS: BookingStep[] = ['date', 'guests', 'time', 'seating', 'notes'];

interface DraftState extends ReservationDraft {
  step: BookingStep;
  /** Set when editing an existing booking rather than creating one. */
  editingReservationId: string | null;
  /**
   * True when the chosen time is full and the guest is queueing for it rather
   * than booking it. It rides with the draft because the screen that acts on it
   * — Review — is two steps away from the board that knows, and re-deriving it
   * there would mean fetching the whole day's availability again to answer one
   * boolean.
   */
  waitlist: boolean;

  start: (restaurantId: string, initial?: Partial<ReservationDraft>) => void;
  startEdit: (reservationId: string, draft: ReservationDraft) => void;
  setDate: (date: string) => void;
  setPartySize: (size: number) => void;
  setTime: (time: string | null, waitlist?: boolean) => void;
  setSeating: (seating: SeatingPreference) => void;
  setOccasion: (occasion: Occasion) => void;
  setNotes: (notes: string) => void;
  goToStep: (step: BookingStep) => void;
  next: () => void;
  back: () => boolean;
  reset: () => void;

  /** True when the draft has everything `createReservation` needs. */
  isComplete: () => boolean;
}

const initialDraft: ReservationDraft = {
  restaurantId: '',
  date: null,
  partySize: 2,
  time: null,
  seating: 'any',
  occasion: 'none',
  notes: '',
};

export const useReservationDraftStore = create<DraftState>((set, get) => ({
  ...initialDraft,
  step: 'date',
  editingReservationId: null,
  waitlist: false,

  start(restaurantId, initial) {
    set({
      ...initialDraft,
      restaurantId,
      date: todayKey(),
      ...initial,
      step: 'date',
      editingReservationId: null,
      waitlist: false,
    });
  },

  startEdit(reservationId, draft) {
    set({ ...draft, step: 'date', editingReservationId: reservationId, waitlist: false });
  },

  setDate(date) {
    // The chosen time belongs to the old day's board; keeping it would let
    // someone confirm a slot that was never offered on the new date.
    set({ date, time: null, waitlist: false });
  },

  setPartySize(partySize) {
    // Same reasoning: availability is per party size.
    set({ partySize, time: null, waitlist: false });
  },

  setTime: (time, waitlist = false) => set({ time, waitlist }),
  setSeating: (seating) => set({ seating }),
  setOccasion: (occasion) => set({ occasion }),
  setNotes: (notes) => set({ notes }),
  goToStep: (step) => set({ step }),

  next() {
    const index = BOOKING_STEPS.indexOf(get().step);
    if (index < BOOKING_STEPS.length - 1) set({ step: BOOKING_STEPS[index + 1] });
  },

  /** Returns false when already on the first step, so the screen can pop instead. */
  back() {
    const index = BOOKING_STEPS.indexOf(get().step);
    if (index <= 0) return false;
    set({ step: BOOKING_STEPS[index - 1] });
    return true;
  },

  reset: () => set({ ...initialDraft, step: 'date', editingReservationId: null, waitlist: false }),

  isComplete() {
    const { restaurantId, date, time, partySize } = get();
    return Boolean(restaurantId && date && time && partySize > 0);
  },
}));
