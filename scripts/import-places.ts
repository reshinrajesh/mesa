/**
 * Import real Bengaluru venues from the Google Places API.
 *
 *   GOOGLE_PLACES_API_KEY=... npx tsx scripts/import-places.ts
 *   GOOGLE_PLACES_API_KEY=... npx tsx scripts/import-places.ts --limit 40 --dry-run
 *
 * Writes `src/mock/places.generated.ts`, which `mock/restaurants.ts` prefers
 * over the invented dataset when it is populated.
 *
 * Three rules this script exists to keep, all of them Google's rather than
 * ours, and all of them easy to break by accident:
 *
 * **Do not commit what this writes.** Places content may be cached for thirty
 * days and no longer. A generated file in git is a cache with no expiry, so
 * `places.generated.ts` carries a `importedAt` stamp and a domain check fails
 * once it is older than thirty days — the licence term is enforced by the test
 * suite rather than by remembering it.
 *
 * **Attribution is not optional.** Every screen drawing an imported venue shows
 * "Powered by Google", wired from the same flag that switches the dataset.
 *
 * **Ratings are real, everything else here is not.** The app fabricates
 * availability, queue depth, menus and prices, and none of that belongs to the
 * business whose name is now attached to it. So imported venues carry Google's
 * rating and review *count* and no invented reviews at all: a made-up review
 * under a real restaurant's name is the one thing this import must never
 * produce.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Cuisine, Restaurant, VenueKind } from '../src/types';

const KEY = process.env.GOOGLE_PLACES_API_KEY;
const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

/** The fields we ask for, which is also what we are billed for. */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.primaryType',
  'places.types',
  'places.regularOpeningHours',
  'places.nationalPhoneNumber',
  'places.websiteUri',
].join(',');

/**
 * One query per neighbourhood rather than one over the city.
 *
 * A single "restaurants in Bengaluru" search returns twenty places clustered
 * wherever Google thinks the centre is, which would give the rails and the
 * distance line nothing to work with. Asking per neighbourhood is what
 * produces the spread the app is built to show.
 */
const NEIGHBOURHOODS = [
  'Indiranagar',
  'Koramangala',
  'Malleswaram',
  'Jayanagar',
  'Frazer Town',
  'Basavanagudi',
  'HSR Layout',
  'Whitefield',
  'MG Road Bengaluru',
  'Lavelle Road Bengaluru',
];

interface PlaceHours {
  weekdayDescriptions?: string[];
  periods?: {
    open?: { day: number; hour: number; minute: number };
    close?: { day: number; hour: number; minute: number };
  }[];
}

interface Place {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  primaryType?: string;
  types?: string[];
  regularOpeningHours?: PlaceHours;
  nationalPhoneNumber?: string;
  websiteUri?: string;
}

const PRICE_TIER: Record<string, 1 | 2 | 3 | 4> = {
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

/**
 * Google's `types` are a different vocabulary from ours and a coarser one:
 * `indian_restaurant` covers everything from a tiffin room to a Mughlai grill,
 * which is exactly the distinction the app's taxonomy exists to make. So this
 * maps what maps and leaves the rest as `indian` rather than inventing a
 * regional claim about a real business.
 */
const CUISINE_BY_TYPE: Record<string, Cuisine> = {
  south_indian_restaurant: 'south-indian',
  north_indian_restaurant: 'north-indian',
  indian_restaurant: 'indian',
  chinese_restaurant: 'chinese',
  italian_restaurant: 'italian',
  japanese_restaurant: 'japanese',
  seafood_restaurant: 'seafood',
  vegetarian_restaurant: 'vegetarian',
  american_restaurant: 'american',
  cafe: 'cafe',
  coffee_shop: 'cafe',
  bakery: 'bakery',
};

const KIND_BY_TYPE: Record<string, VenueKind> = {
  cafe: 'cafe',
  coffee_shop: 'cafe',
  bakery: 'cafe',
  bar: 'bar',
  fine_dining_restaurant: 'fine-dining',
};

function kindOf(place: Place): VenueKind {
  for (const type of place.types ?? []) {
    if (KIND_BY_TYPE[type]) return KIND_BY_TYPE[type];
  }
  return 'casual-dining';
}

function cuisinesOf(place: Place): Cuisine[] {
  const found = new Set<Cuisine>();
  for (const type of place.types ?? []) {
    if (CUISINE_BY_TYPE[type]) found.add(CUISINE_BY_TYPE[type]);
  }
  return found.size ? [...found] : ['indian'];
}

/**
 * Google gives opening hours as periods in local time; the app wants minutes
 * from midnight per weekday, and treats a span that ends before it starts as
 * running past midnight. A venue Google reports as open 24 hours has no
 * periods at all, which is why the fallback is a full day rather than a closed
 * one.
 */
function hoursOf(place: Place): Restaurant['hours'] {
  const week: Restaurant['hours'] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day: day as Restaurant['hours'][number]['day'],
    opensAt: null,
    closesAt: null,
  }));

  const periods = place.regularOpeningHours?.periods ?? [];
  if (!periods.length && place.regularOpeningHours) {
    return week.map((day) => ({ ...day, opensAt: 0, closesAt: 24 * 60 }));
  }

  for (const period of periods) {
    if (!period.open) continue;
    const day = period.open.day;
    const opensAt = period.open.hour * 60 + period.open.minute;
    const rawClose = period.close ? period.close.hour * 60 + period.close.minute : 24 * 60;
    // A close before the open is the next morning, which the app models as
    // minutes past 24:00 rather than as a second row.
    const closesAt = rawClose <= opensAt ? rawClose + 24 * 60 : rawClose;
    week[day] = { day: day as Restaurant['hours'][number]['day'], opensAt, closesAt };
  }
  return week;
}

function neighbourhoodOf(place: Place, queried: string): string {
  const short = place.shortFormattedAddress ?? '';
  const parts = short.split(',').map((part) => part.trim());
  // The second-to-last part of a short address is usually the locality.
  return parts.length >= 2 ? parts[parts.length - 2] : queried.replace(' Bengaluru', '');
}

function toRestaurant(place: Place, queried: string): Restaurant | null {
  if (!place.displayName?.text || !place.location) return null;

  const name = place.displayName.text;
  const id = `rst_g_${place.id.slice(0, 12).toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  return {
    id,
    name,
    tagline: '',
    about: '',
    cuisines: cuisinesOf(place),
    kind: kindOf(place),
    priceTier: PRICE_TIER[place.priceLevel ?? ''] ?? 2,
    currency: 'INR',
    rating: place.rating ?? 0,
    reviewCount: place.userRatingCount ?? 0,
    images: [],
    neighbourhood: neighbourhoodOf(place, queried),
    city: 'Bengaluru',
    address: place.formattedAddress ?? '',
    coordinates: place.location,
    phone: place.nationalPhoneNumber ?? '',
    website: place.websiteUri,
    hours: hoursOf(place),
    amenities: [],
    // Google does not know when a place opened, and guessing would be inventing
    // a fact about a real business. The "just opened" rail simply has nothing
    // to show while the imported dataset is in use.
    openedAt: '',
    popularityScore: Math.round(Math.min(100, (place.userRatingCount ?? 0) / 40)),
    goodFor: [],
    maxPartySize: 8,
    acceptsWaitlist: true,
  };
}

async function search(query: string, limit: number): Promise<Place[]> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY as string,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      includedType: 'restaurant',
      maxResultCount: limit,
      languageCode: 'en',
      regionCode: 'IN',
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Places API ${response.status}: ${detail.slice(0, 300)}`);
  }
  const body = (await response.json()) as { places?: Place[] };
  return body.places ?? [];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.indexOf('--limit');
  const perArea = limitArg === -1 ? 10 : Number(args[limitArg + 1]);

  if (!KEY) {
    console.error(
      'GOOGLE_PLACES_API_KEY is not set.\n\n' +
        'Create a key in the Google Cloud console with the Places API (New) enabled,\n' +
        'then run:\n\n' +
        '  GOOGLE_PLACES_API_KEY=... npx tsx scripts/import-places.ts\n\n' +
        'The key is only ever read here, at build time. It must not go into\n' +
        'EXPO_PUBLIC_* — that would ship it inside the app bundle.',
    );
    process.exit(1);
  }

  const seen = new Set<string>();
  const venues: Restaurant[] = [];

  for (const area of NEIGHBOURHOODS) {
    const places = await search(`restaurants in ${area}, Bengaluru`, perArea);
    let kept = 0;
    for (const place of places) {
      if (seen.has(place.id)) continue;
      seen.add(place.id);
      const venue = toRestaurant(place, area);
      if (!venue) continue;
      venues.push(venue);
      kept += 1;
    }
    console.log(`  ${area.padEnd(24)} ${kept} venues`);
  }

  console.log(`\n${venues.length} venues from ${NEIGHBOURHOODS.length} searches`);
  if (dryRun) {
    console.log('--dry-run: nothing written');
    return;
  }

  const target = resolve(import.meta.dirname, '..', 'src', 'mock', 'places.generated.ts');
  const header = `/**
 * GENERATED by \`scripts/import-places.ts\` — do not edit, and do not commit
 * this file with venues in it.
 *
 * This is Google Places content. Google's terms permit caching it for thirty
 * days; a copy in version control is a cache that never expires. The check
 * "imported venue data is inside Google's caching window" in
 * \`scripts/verify-domain.ts\` fails once \`importedAt\` is older than that, so a
 * stale import breaks the build rather than quietly going out of date.
 *
 * Regenerate:  GOOGLE_PLACES_API_KEY=... npx tsx scripts/import-places.ts
 * Revert:      git checkout src/mock/places.generated.ts
 */
import type { Restaurant } from '@/types';

export const importedAt: string | null = ${JSON.stringify(new Date().toISOString())};

export const importedVenues: Restaurant[] = ${JSON.stringify(venues, null, 2)};
`;
  writeFileSync(target, header, 'utf8');
  console.log(`wrote ${target}`);
  console.log(
    '\nRemember: this file is Google content. Do not commit it, and re-run the\n' +
      'import if you are still using it in thirty days.',
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
