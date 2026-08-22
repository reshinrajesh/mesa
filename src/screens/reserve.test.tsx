import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { useReservationDraftStore } from '@/store/reservationDraftStore';
import ReserveScreen from '../../app/reserve/[restaurantId]/index';
import { givenStorage, renderScreen } from './harness';

/**
 * The booking wizard.
 *
 * Its central decision is that five steps are one screen rather than five
 * pushed routes, and that decision only exists as behaviour: back has to step
 * *backwards through the wizard* until there is nowhere left to go, and only
 * then leave. Nothing outside a render can tell the difference — a store with a
 * `back()` that returns false looks identical either way.
 *
 * The router is mocked here rather than globally so `back` is a single spy
 * across the whole test: the shared mock in `jest.setup` hands out a fresh
 * object per call, which is right for screens that only navigate away and
 * useless for one where *not* navigating is the assertion.
 */

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
let mockParams: Record<string, string> = { restaurantId: 'rst_ilaya' };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  Link: 'Link',
}));

beforeEach(async () => {
  mockRouter.push.mockClear();
  mockRouter.back.mockClear();
  mockParams = { restaurantId: 'rst_ilaya' };
  // The draft is a module singleton, so a step left over from the last test
  // would decide the next one.
  useReservationDraftStore.getState().reset();
  await givenStorage({});
});

const continueOn = async () => fireEvent.press(await screen.findByLabelText('Continue'));
const goBack = async () => fireEvent.press(await screen.findByLabelText('Go back'));

describe('Reserve screen', () => {
  it('opens on the first step and says which one it is', async () => {
    await renderScreen(<ReserveScreen />);

    expect(await screen.findByText('When are you coming?')).toBeOnTheScreen();
    expect(screen.getByText('Step 1 of 5')).toBeOnTheScreen();
  });

  it('walks forward through the steps without leaving the screen', async () => {
    await renderScreen(<ReserveScreen />);
    await screen.findByText('When are you coming?');

    await continueOn();
    expect(await screen.findByText('How many of you?')).toBeOnTheScreen();
    expect(screen.getByText('Step 2 of 5')).toBeOnTheScreen();

    await continueOn();
    expect(await screen.findByText('Pick a time')).toBeOnTheScreen();

    // Five steps, one screen: nothing has been pushed to get here.
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('steps back through the wizard rather than out of it', async () => {
    await renderScreen(<ReserveScreen />);
    await screen.findByText('When are you coming?');
    await continueOn();
    await screen.findByText('How many of you?');

    await goBack();

    expect(await screen.findByText('When are you coming?')).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('leaves the screen when there is no step left to go back to', async () => {
    await renderScreen(<ReserveScreen />);
    await screen.findByText('When are you coming?');

    await goBack();

    // The one case where back means back: the wizard is at its first step, so
    // the only thing behind it is the restaurant.
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('lets you jump back to a step you have done, but not skip one you have not', async () => {
    await renderScreen(<ReserveScreen />);
    await screen.findByText('When are you coming?');
    await continueOn();
    await screen.findByText('How many of you?');

    fireEvent.press(screen.getByLabelText('Step 1'));
    expect(await screen.findByText('When are you coming?')).toBeOnTheScreen();

    // Jumping ahead would skip a choice the next step depends on, so the
    // segments ahead of you are inert rather than merely unstyled — and a
    // screen reader is told so rather than left to press and find out.
    expect(screen.getByLabelText('Step 4')).toBeDisabled();

    fireEvent.press(screen.getByLabelText('Step 4'));
    // Settled before asserting nothing happened: reading the title straight
    // back finds the old one whether the press was refused or merely slow,
    // which is an assertion that cannot fail.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(screen.getByText('Step 1 of 5')).toBeOnTheScreen();
    expect(screen.queryByText('Where would you like to sit?')).toBeNull();
  });

  it('starts at the time step when a card has already chosen one', async () => {
    // Tapping 7:30 PM on a restaurant card has answered the first two
    // questions, and asking them again is the fastest way to lose the booking.
    mockParams = { restaurantId: 'rst_ilaya', time: '19:30' };

    await renderScreen(<ReserveScreen />);

    expect(await screen.findByText('Pick a time')).toBeOnTheScreen();
    expect(screen.getByText('Step 3 of 5')).toBeOnTheScreen();
  });
});
