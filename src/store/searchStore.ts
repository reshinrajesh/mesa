import { create } from 'zustand';

import type { RestaurantFilters, SortKey } from '@/types';

import { emptyFilters } from '@/types';
import { countActiveFilters } from '@/features/restaurants/query';
import { storage, storageKeys } from '@/utils/storage';

/**
 * Search and filter state.
 *
 * Separate from the query cache on purpose: the filter sheet mutates a *draft*
 * and only commits on "Show results", so half-built filters never trigger a
 * refetch behind the sheet.
 */

interface SearchState {
  query: string;
  filters: RestaurantFilters;
  sort: SortKey;
  view: 'list' | 'map';
  recentSearches: string[];

  /** The uncommitted copy the filter sheet edits. */
  draftFilters: RestaurantFilters;

  setQuery: (query: string) => void;
  setSort: (sort: SortKey) => void;
  setView: (view: 'list' | 'map') => void;

  openDraft: () => void;
  patchDraft: (patch: Partial<RestaurantFilters>) => void;
  toggleDraftValue: (key: 'cuisines' | 'kinds' | 'amenities', value: string) => void;
  toggleDraftPrice: (tier: number) => void;
  resetDraft: () => void;
  commitDraft: () => void;

  activeFilterCount: () => number;
  clearAll: () => void;

  hydrateRecent: () => Promise<void>;
  rememberSearch: (term: string) => void;
  clearRecent: () => void;
}

const MAX_RECENT = 8;

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  filters: emptyFilters,
  sort: 'recommended',
  view: 'list',
  recentSearches: [],
  draftFilters: emptyFilters,

  setQuery: (query) => set({ query }),
  setSort: (sort) => set({ sort }),
  setView: (view) => set({ view }),

  openDraft: () => set({ draftFilters: get().filters }),
  patchDraft: (patch) => set({ draftFilters: { ...get().draftFilters, ...patch } }),

  toggleDraftValue: (key, value) => {
    const draft = get().draftFilters;
    const list = draft[key];
    set({
      draftFilters: {
        ...draft,
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      },
    });
  },

  toggleDraftPrice: (tier) => {
    const draft = get().draftFilters;
    set({
      draftFilters: {
        ...draft,
        priceTiers: draft.priceTiers.includes(tier)
          ? draft.priceTiers.filter((t) => t !== tier)
          : [...draft.priceTiers, tier],
      },
    });
  },

  resetDraft: () => set({ draftFilters: emptyFilters }),
  commitDraft: () => set({ filters: get().draftFilters }),

  activeFilterCount: () => countActiveFilters(get().filters),

  clearAll: () => set({ query: '', filters: emptyFilters, draftFilters: emptyFilters, sort: 'recommended' }),

  async hydrateRecent() {
    const recentSearches = await storage.get<string[]>(storageKeys.recentSearches, []);
    set({ recentSearches });
  },

  rememberSearch(term) {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    const next = [trimmed, ...get().recentSearches.filter((t) => t !== trimmed)].slice(0, MAX_RECENT);
    set({ recentSearches: next });
    void storage.set(storageKeys.recentSearches, next);
  },

  clearRecent() {
    set({ recentSearches: [] });
    void storage.remove(storageKeys.recentSearches);
  },
}));
