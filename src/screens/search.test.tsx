import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { config } from '@/constants/config';
import { restaurantService } from '@/services';
import { useSearchStore } from '@/store/searchStore';
import SearchScreen from '../../app/search/index';
import { givenStorage, renderScreen } from './harness';

/**
 * Search.
 *
 * Three things here are decisions rather than plumbing. Suggestions are
 * debounced, so a query is not fired per keystroke. Nothing is searched at all
 * below two characters, because a single letter matches most of the catalogue
 * and answering it is worse than waiting. And the three kinds of result go to
 * three different places — a restaurant to its own page, a cuisine or a
 * neighbourhood to the filtered list — which is the reason this is a screen and
 * not a dropdown.
 *
 * All three are invisible to the service and to the store: each is about what
 * this screen does with the keystrokes.
 */

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  Link: 'Link',
}));

/**
 * Awaited, unlike a plain `fireEvent`: every keystroke arms the debounce timer,
 * and a timer that fires while the next `act()` is opening is what produces
 * "overlapping act() calls" and, after that, a renderer that stops rendering.
 */
const type = async (value: string) => {
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('Search'), value);
  });
};

/** Long enough for the debounce to lapse and the query to land. */
const afterTheDebounce = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, config.searchDebounceMs + 400));
  });

beforeEach(async () => {
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  useSearchStore.getState().clearAll();
  useSearchStore.setState({ recentSearches: [] });
  await givenStorage({});
});

describe('Search screen', () => {
  it('waits for a pause in the typing before asking anything', async () => {
    const suggest = jest.spyOn(restaurantService, 'getSuggestions');
    suggest.mockClear();
    await renderScreen(<SearchScreen />);

    await type('G');
    await type('Gr');
    await type('Gra');
    await type('Gran');

    // Four keystrokes, no query yet: the debounce is the difference between
    // one request and one per letter.
    expect(suggest).not.toHaveBeenCalled();

    await afterTheDebounce();
    await waitFor(() => expect(suggest).toHaveBeenCalledTimes(1));
    expect(suggest).toHaveBeenCalledWith('Gran');
  });

  it('does not answer a single letter', async () => {
    const suggest = jest.spyOn(restaurantService, 'getSuggestions');
    // Cleared, not merely created: spying on a method that is already a spy
    // hands back the same mock with the previous test's calls still on it.
    suggest.mockClear();
    await renderScreen(<SearchScreen />);

    await type('G');
    await afterTheDebounce();

    // One letter matches most of the catalogue. Answering it is worse than
    // waiting for the second.
    expect(suggest).not.toHaveBeenCalled();
    expect(screen.queryByText('Results')).toBeNull();
  });

  it('sends a restaurant straight to its own page', async () => {
    await renderScreen(<SearchScreen />);

    await type('Ilaya');
    await afterTheDebounce();

    fireEvent.press(await screen.findByLabelText(/^Ilaya, restaurant/));

    // Replace rather than push: the search screen has done its job, and
    // swiping back into a stale query is not going back.
    expect(mockRouter.replace).toHaveBeenCalledWith('/restaurant/rst_ilaya');
  });

  it('sends a cuisine to the filtered list instead', async () => {
    await renderScreen(<SearchScreen />);

    await type('Italian');
    await afterTheDebounce();

    fireEvent.press(await screen.findByLabelText(/^Italian, cuisine/));

    // A cuisine is not a place you can open — it is a filter, so it commits
    // the query and hands over to Explore.
    expect(useSearchStore.getState().query).toBe('Italian');
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/explore');
  });

  it('says so when nothing matches, rather than showing an empty heading', async () => {
    await renderScreen(<SearchScreen />);

    await type('zzzzz');
    await afterTheDebounce();

    expect(await screen.findByText(/Nothing matches/)).toBeOnTheScreen();
  });

  it('offers a repeat search before it offers anything else', async () => {
    useSearchStore.setState({ recentSearches: ['Ilaya'] });
    await renderScreen(<SearchScreen />);

    // Recents live above suggestions and need no query: a repeat search is the
    // most common one there is.
    fireEvent.press(await screen.findByLabelText('Search again for Ilaya'));

    expect(useSearchStore.getState().query).toBe('Ilaya');
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/explore');
  });

  it('clears the recent list when asked', async () => {
    useSearchStore.setState({ recentSearches: ['Ilaya', 'Indiranagar'] });
    await renderScreen(<SearchScreen />);

    fireEvent.press(await screen.findByLabelText('Clear recent searches'));

    await waitFor(() => expect(useSearchStore.getState().recentSearches).toEqual([]));
    expect(screen.queryByLabelText('Search again for Indiranagar')).toBeNull();
  });
});
