/*
 * Exports the mock dataset for the backend to seed from. Run with tsx from the
 * project root:
 *
 *     npx tsx scripts/export-seed.ts --out ../mesa-seed.json
 *
 * The Frappe app needs the same restaurants, menus and reviews the app already
 * demos with, and there are 1,258 lines of them. Retyping that in Python would
 * produce a second copy that agrees with this one on the day it is written and
 * quietly stops agreeing afterwards, so the backend reads what this emits
 * instead. Re-run it whenever the mock data changes.
 *
 * Only the static half is here. `seedReservations` and `seedNotifications` are
 * deliberately not exported: they compute their dates from the day they run, so
 * freezing them into a file would seed a demo whose "two days from now" booking
 * is three weeks in the past. The backend recomputes those at seed time.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { genericMenu, menuByRestaurantId } from '@/mock/menus';
import { mockRestaurants } from '@/mock/restaurants';
import { mockReviews } from '@/mock/reviews';
import { mockUser, seedFavoriteIds } from '@/mock/seed';

/**
 * Every restaurant gets a menu, which is the same rule `restaurantService`
 * follows: the hand-written one where there is one, a generated one otherwise.
 * A venue whose menu tab is empty against the server but full against the mock
 * would be the swap changing what the app shows.
 */
const menus = mockRestaurants.map(
  (restaurant) =>
    menuByRestaurantId.get(restaurant.id) ??
    genericMenu(restaurant.id, restaurant.name, restaurant.currency),
);

const payload = {
  generatedAt: new Date().toISOString(),
  restaurants: mockRestaurants,
  menus,
  reviews: mockReviews,
  user: mockUser,
  favoriteRestaurantIds: seedFavoriteIds,
};

const outFlag = process.argv.indexOf('--out');
const outPath = resolve(
  outFlag === -1 ? 'mesa-seed.json' : (process.argv[outFlag + 1] ?? 'mesa-seed.json'),
);

writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.log(
  `${outPath}\n` +
    `  ${payload.restaurants.length} restaurants\n` +
    `  ${payload.menus.length} menus, ${payload.menus.reduce((n, m) => n + m.sections.length, 0)} sections, ` +
    `${payload.menus.reduce((n, m) => n + m.sections.reduce((s, sec) => s + sec.items.length, 0), 0)} items\n` +
    `  ${payload.reviews.length} reviews\n` +
    `  ${payload.favoriteRestaurantIds.length} seeded favourites`,
);
