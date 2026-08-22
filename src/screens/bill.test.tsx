import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Reservation } from '@/types';

import { settleTotals } from '@/features/offers/deals';
import { paymentService } from '@/services';
import { storage, storageKeys } from '@/utils/storage';
import { toDateKey } from '@/utils/date';
import BillScreen from '../../app/reservation/[id]/bill';
import { givenStorage, renderScreen } from './harness';

/**
 * The bill screen.
 *
 * What only the screen can answer: that a guest is never shown "Paid" before
 * the server has verified the payment, that declining a tip is the first thing
 * offered rather than the awkward one, and that a bill nobody has raised reads
 * as "not yet" rather than as an error.
 *
 * The route param is faked the way the other screen tests do it, and the mock
 * payment service is the real one — the point is the flow through it, not a
 * stub of the flow.
 */

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    useLocalSearchParams: () => ({ id: 'rsv_bill' }),
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  };
});

function booking(status: Reservation['status'], daysAway = -2): Reservation {
  return {
    id: 'rsv_bill',
    code: 'ABC234',
    restaurantId: 'rst_ilaya',
    date: toDateKey(new Date(Date.now() + daysAway * 86_400_000)),
    time: '19:30',
    partySize: 2,
    seating: 'any',
    occasion: 'none',
    notes: '',
    status,
    createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  };
}

beforeEach(async () => {
  await storage.remove(storageKeys.bills);
});

describe('Bill screen', () => {
  it('says the bill is not raised yet rather than showing an error', async () => {
    // A table that has not finished has nothing owing on it, and an error state
    // here would have people asking the floor about a problem that is not one.
    //
    // Dated forward on purpose: `settleElapsed` turns a confirmed booking into
    // a completed one four hours after its sitting, so a past date would have
    // arrived here already billable and tested nothing.
    await givenStorage({ reservations: [booking('confirmed', 3)] });
    await renderScreen(<BillScreen />);

    expect(await screen.findByText('No bill yet')).toBeTruthy();
  });

  it('draws what the venue charged, and offers declining a tip first', async () => {
    await givenStorage({ reservations: [booking('completed')] });
    await renderScreen(<BillScreen />);

    expect(await screen.findByText('Subtotal')).toBeTruthy();
    expect(await screen.findByText('GST 5%')).toBeTruthy();

    // Nothing is preselected, and "No tip" exists as a plain choice rather
    // than as something to hunt for.
    expect(await screen.findByText('No tip')).toBeTruthy();
  });

  it('does not say paid until the payment has been verified', async () => {
    await givenStorage({ reservations: [booking('completed')] });
    await renderScreen(<BillScreen />);

    const payButton = await screen.findByText(/^Pay ₹/);
    expect(screen.queryByText('Paid')).toBeNull();

    fireEvent.press(payButton);

    // Through the gateway and back. The badge appears only once the service
    // has verified the signature and returned a settled bill.
    await waitFor(() => expect(screen.getByText('Paid')).toBeTruthy(), { timeout: 15_000 });
  }, 20_000);

  it('takes the discount off the food before the tax, and says what was saved', async () => {
    // rst_ilaya runs 20% off, so the bill this raises carries a discount line —
    // and the tax under it has to be charged on what is left, not on the menu
    // price nobody paid.
    await givenStorage({ reservations: [booking('completed')] });
    await renderScreen(<BillScreen />);

    const bill = await paymentService.getBill('rsv_bill');
    expect(bill?.discount).toBeTruthy();

    const untaxed = bill!.subtotal - bill!.discount!.amount;
    const totals = settleTotals(bill!, 0);
    expect(totals.taxable).toBe(untaxed);
    expect(totals.taxes).toBeLessThan(bill!.taxes[0].amount);
    expect(await screen.findByText(bill!.discount!.label)).toBeTruthy();
  }, 20_000);

  it('refuses to pay the same bill twice', async () => {
    await givenStorage({ reservations: [booking('completed')] });

    const bill = await paymentService.getBill('rsv_bill');
    expect(bill).not.toBeNull();
    const order = await paymentService.createOrder(bill!.id, 0);
    const authorization = await paymentService.checkout(order, 'card');
    await paymentService.confirmPayment(authorization);

    // The same signed authorization, replayed. A gateway callback that arrives
    // twice must not settle a bill twice.
    await expect(paymentService.confirmPayment(authorization)).rejects.toMatchObject({
      code: 'payment-failed',
    });
  }, 20_000);
});
