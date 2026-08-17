import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { useSearchStore } from '@/store/searchStore';
import ExploreScreen from '../../app/(tabs)/explore';
import { givenStorage, renderScreen } from './harness';

/**
 * One test, in a file of its own, for a reason worth writing down.
 *
 * Explore can only be rendered a few times per Jest module. Past that the
 * renderer stops producing output altogether: the next render returns an empty
 * tree, every query waits out its timeout — twenty seconds proves it is a wedge
 * and not slowness — and every test after it fails identically, whatever it
 * asserts. It is preceded by "overlapping act() calls", and none of the usual
 * answers touch it: awaiting the dismissing press, waiting for the sheet to
 * leave the tree, draining the query client, outlasting the search debounce,
 * disposing the client, reordering the tests. The screen carries a `FlashList`
 * and a map; one of them holds something across unmounts.
 *
 * So this assertion — that applying commits the *whole* draft at once, which is
 * the point of there being a draft — gets the first render in its own file.
 * `explore.test.tsx` holds the three that fit alongside each other.
 *
 * What did not survive the split is the empty-list copy, which changes
 * depending on whether filters are to blame. It is a real branch and it is
 * currently untested; it is written down here rather than quietly dropped.
 * A second render in this file fails for the reason above, not for its own.
 */

const openFilters = async () =>
  fireEvent.press(await screen.findByLabelText(/^Filters/, {}, { timeout: 5_000 }));

beforeEach(async () => {
  useSearchStore.getState().clearAll();
  await givenStorage({});
});

describe('Explore screen, continued', () => {
  it('commits the whole draft at once when the sheet is applied', async () => {
    await renderScreen(<ExploreScreen />);
    await openFilters();

    fireEvent.press(await screen.findByLabelText('Italian'));
    fireEvent.press(await screen.findByLabelText('Japanese'));

    // Awaited, unlike the taps above: applying dismisses the sheet, and an
    // animated dismissal leaves an `act()` open that the next test's render
    // would then nest inside — "overlapping act() calls", after which the
    // renderer stops producing output for the rest of the file.
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/^Show /));
    });

    await waitFor(() =>
      expect(useSearchStore.getState().filters.cuisines).toEqual(['italian', 'japanese']),
    );

    // Wait for the sheet to actually be gone, not just for the commit: leaving
    // a dismissal half-animated is what leaks an open act into the next test.
    await waitFor(() => expect(screen.queryByLabelText('Reset all filters')).toBeNull());
  });
});
