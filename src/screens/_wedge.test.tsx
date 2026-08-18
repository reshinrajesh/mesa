import { useQuery } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { FilterSheet } from '@/features/search/FilterSheet';
import { restaurantService } from '@/services';
import { useSearchStore } from '@/store/searchStore';
import { givenStorage, renderScreen } from './harness';

/**
 * Probe: the hypothesis without Explore.
 *
 * The sheet, mounted, plus a query keyed on the committed filters. No
 * FlashList, no map, no screen — if this wedges, the reproduction is fifteen
 * lines instead of a route.
 */
function MiniExplore() {
  // No query at all: the sheet, and a commit that changes nothing else.
  const filters = useSearchStore((s) => s.filters);
  return <FilterSheet visible onClose={() => {}} resultCount={filters.cuisines.length} />;
}

beforeEach(async () => {
  useSearchStore.getState().clearAll();
  await givenStorage({});
});

describe('wedge probe', () => {
  for (const attempt of [1, 2, 3, 4, 5]) {
    it(`chip and commit ${attempt}`, async () => {
      await renderScreen(<MiniExplore />);
      await waitFor(() => expect(screen.queryByLabelText('Reset all filters')).not.toBeNull());

      fireEvent.press(await screen.findByLabelText('Italian'));
      await act(async () => {
        useSearchStore.getState().commitDraft();
      });

      expect(useSearchStore.getState().filters.cuisines).toEqual(['italian']);
    });
  }
});
