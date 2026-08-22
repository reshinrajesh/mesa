import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { ReservationDraft } from '@/types';

import { generateAvailability } from '@/mock/availability';
import { restaurantById } from '@/mock/restaurants';
import { reservationService } from '@/services';
import { useReservationDraftStore } from '@/store/reservationDraftStore';
import { addDaysToKey, todayKey } from '@/utils/date';
import ReviewScreen from '../../app/reserve/[restaurantId]/review';
import { givenStorage, renderScreen } from './harness';

/**
 * The review screen.
 *
 * Two decisions live here and neither is visible below a render. A row is an
 * edit control: tapping "Guests" has to send you back to the step that set it
 * with everything else intact, which is the whole reason the draft is a store
 * rather than screen state. And the button has to say what pressing it does —
 * a table for eight is a *request* to the restaurant, a full slot is a place in
 * a *queue*, and calling either of them "Confirm booking" promises a table
 * nobody has agreed to give.
 */

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ restaurantId: 'rst_ilaya' }),
  Link: 'Link',
}));

/**
 * A slot the board actually offers.
 *
 * Hardcoding "today at 19:30" wrote a draft the mock then refused — the rules
 * decline a sitting in the past, a night the venue is closed and a slot that is
 * full, and today at half past seven is often at least one of those. The board
 * is deterministic, so asking it is both stable and honest: the booking under
 * test is one a user could actually have made.
 */
function firstBookableSlot(): { date: string; time: string } {
  const restaurant = restaurantById.get('rst_ilaya')!;
  for (let day = 1; day < 21; day += 1) {
    const date = addDaysToKey(todayKey(), day);
    const board = generateAvailability(restaurant, date, 2);
    const slot = board.slots.find((s) => s.availability !== 'unavailable');
    if (slot) return { date, time: slot.time };
  }
  throw new Error('no bookable slot at rst_ilaya in the next three weeks');
}

/** A draft that has been through every step, as the wizard would leave it. */
function givenDraft(overrides: Partial<ReservationDraft> & { waitlist?: boolean } = {}) {
  const { date, time } = firstBookableSlot();
  const store = useReservationDraftStore.getState();
  store.reset();
  store.start('rst_ilaya', {
    date,
    time,
    partySize: 2,
    seating: 'any',
    occasion: 'none',
    notes: '',
    ...overrides,
  });
  if (overrides.waitlist) store.setTime(time, true);
}

beforeEach(async () => {
  mockRouter.push.mockClear();
  mockRouter.back.mockClear();
  mockRouter.replace.mockClear();
  await givenStorage({});
});

describe('Review screen', () => {
  it('sends a row back to the step that set it, rather than onwards', async () => {
    givenDraft();
    await renderScreen(<ReviewScreen />);

    fireEvent.press(await screen.findByLabelText(/^Guests:/));

    // Back, not push: the wizard is still underneath, holding everything else
    // that has been chosen.
    expect(useReservationDraftStore.getState().step).toBe('guests');
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('calls a booking a booking', async () => {
    givenDraft();
    await renderScreen(<ReviewScreen />);

    expect(await screen.findByLabelText('Confirm booking')).toBeOnTheScreen();
  });

  it('calls a large party a request, because the restaurant has to agree', async () => {
    givenDraft({ partySize: 8 });
    await renderScreen(<ReviewScreen />);

    expect(await screen.findByLabelText('Request this table')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Confirm booking')).toBeNull();
  });

  it('calls a full slot a waitlist, and says so in the title too', async () => {
    givenDraft({ waitlist: true });
    await renderScreen(<ReviewScreen />);

    expect(await screen.findByLabelText('Join the waitlist')).toBeOnTheScreen();
    expect(screen.getByText('Review your request')).toBeOnTheScreen();
  });

  it('asks a guest for an account without making it a condition of booking', async () => {
    givenDraft();
    await renderScreen(<ReviewScreen />, { session: 'guest' });

    expect(await screen.findByLabelText('Create an account')).toBeOnTheScreen();
    // The booking button is still there and still says the same thing: the
    // prompt is an offer, not a gate.
    expect(screen.getByLabelText('Confirm booking')).toBeOnTheScreen();
  });

  it('writes the booking and moves on to the confirmation', async () => {
    givenDraft();
    await renderScreen(<ReviewScreen />);

    fireEvent.press(await screen.findByLabelText('Confirm booking'));

    await waitFor(async () => {
      const { items } = await reservationService.getReservations();
      expect(items).toHaveLength(1);
    });

    // Replace rather than push: the wizard behind this screen is spent, and
    // swiping back into it would offer to book the table twice.
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledTimes(1));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
