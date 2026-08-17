import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { useSearchStore } from '@/store/searchStore';
import ExploreScreen from '../../app/(tabs)/explore';
import { givenStorage, renderScreen } from './harness';

/**
 * Explore, and mostly its filter sheet.
 *
 * The sheet edits a *draft* and commits on "Show results". That is a decision
 * about network traffic and about meaning — live-applying every tap refetches
 * six times while someone picks three cuisines, and the count on the button is
 * only true once they have finished choosing — and it is invisible to anything
 * that does not render: a store with a `commitDraft` looks the same whether or
 * not the sheet ever calls it.
 *
 * The failure it guards against is the quiet kind. A sheet that applied on tap
 * would still look right in a screenshot and still return the right results;
 * what it would cost is a refetch per tap and a button that lies about how many
 * results are behind it.
 */

/**
 * The chip is labelled "Filters" until something is committed and "Filters, 2
 * selected" afterwards — it tells a screen reader how many are in force — so
 * the query has to match the prefix rather than the whole label.
 */
const openFilters = async () =>
  fireEvent.press(await screen.findByLabelText(/^Filters/, {}, { timeout: 5_000 }));

beforeEach(async () => {
  useSearchStore.getState().clearAll();
  await givenStorage({});
});

describe('Explore screen', () => {
  it('holds a filter tap in the draft until the sheet is applied', async () => {
    await renderScreen(<ExploreScreen />);
    await openFilters();

    fireEvent.press(await screen.findByLabelText('Italian'));

    // Chosen, but not in force: the committed filters are what the list reads.
    expect(useSearchStore.getState().draftFilters.cuisines).toEqual(['italian']);
    expect(useSearchStore.getState().filters.cuisines).toEqual([]);
  });

  it('counts the results behind the button rather than the taps in front of it', async () => {
    await renderScreen(<ExploreScreen />);
    await openFilters();

    // Nothing chosen: the button offers everything rather than "0 results".
    expect(await screen.findByLabelText('Show all restaurants')).toBeOnTheScreen();

    fireEvent.press(await screen.findByLabelText('Italian'));
    expect(await screen.findByLabelText(/^Show \d+ result/)).toBeOnTheScreen();
  });

  it('abandons a draft that was never applied', async () => {
    useSearchStore.setState({ filters: { ...useSearchStore.getState().filters, openNow: true } });
    await renderScreen(<ExploreScreen />);

    await openFilters();
    fireEvent.press(await screen.findByLabelText('Italian'));
    fireEvent.press(screen.getByLabelText('Reset all filters'));

    // Reset empties the draft, and the draft is all it can reach: what is in
    // force stays in force until something is applied.
    expect(useSearchStore.getState().draftFilters.cuisines).toEqual([]);
    expect(useSearchStore.getState().filters.openNow).toBe(true);
  });

});
