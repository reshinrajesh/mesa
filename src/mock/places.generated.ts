/**
 * The empty state of the Places import, and the file that ships.
 *
 * `scripts/import-places.ts` overwrites this locally with real Bengaluru
 * venues from the Google Places API. It is committed empty on purpose: Places
 * content may be cached for thirty days and no longer, and a generated file in
 * version control is a cache that never expires.
 *
 * While it is empty the app runs on the invented dataset in `restaurants.ts`,
 * which is what CI, the domain checks and anybody who has not set a key see.
 *
 * Regenerate:  GOOGLE_PLACES_API_KEY=... npx tsx scripts/import-places.ts
 * Revert:      git checkout src/mock/places.generated.ts
 */
import type { Restaurant } from '@/types';

/** ISO stamp of the import, or null when this file is the committed stub. */
export const importedAt: string | null = null;

export const importedVenues: Restaurant[] = [];
