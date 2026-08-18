import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { useSearchStore } from '@/store/searchStore';
import ExploreScreen from '../../app/(tabs)/explore';
import { givenStorage, renderScreen } from './harness';

/**
 * One test, in a file of its own, for a reason now understood rather than
 * guessed at.
 *
 * Opening the filter sheet and committing a *changed* filter set corrupts
 * React's `act` queue — "overlapping act() calls" — and from then on every
 * render in that Jest module returns an empty tree, so every later test in the
 * file times out whatever it asserts. Twenty-second waits prove it is a wedge
 * and not slowness.
 *
 * The minimal reproduction is four steps: render Explore, open the sheet, press
 * a filter chip, commit. Bisecting it ruled out more than it confirmed, and the
 * eliminations are the useful part:
 *
 * - Not the number of renders. Five plain renders of Explore in one file pass,
 *   which makes the first version of this comment — "a few renders per module"
 *   — simply wrong.
 * - Not the modal. Replacing `Sheet` with an inline `View` still wedges.
 * - Not `FlashList`; swapping it for `FlatList` changes nothing.
 * - Not `react-native-gesture-handler` (its Jest setup is registered now, and
 *   should have been all along, but it is not this).
 * - Not reanimated in `Pressable`; a plain RN `Pressable` still wedges.
 * - Not the test harness; a bare `QueryClientProvider` wedges too.
 * - Not the unmount: committing while the sheet stays *open* wedges as well.
 * - Not the query-key change alone: the same commit with no sheet mounted is
 *   fine, five times over.
 *
 * What is left is the combination — the filter sheet mounted while the results
 * query changes key — and that is where the next person should start. Until
 * then this test gets the first render in its own file, and `explore.test.tsx`
 * holds the three that fit alongside each other.
 *
 * What did not survive the split is the empty-list copy, which changes
 * depending on whether filters are to blame. It is a real branch and it is
 * currently untested; it is written down here rather than quietly dropped.
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
