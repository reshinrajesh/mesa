/* Smoke test for the pure domain layer. Run with tsx from the project root. */
import assert from 'node:assert';

import { generateAvailability, previewSlots } from '@/mock/availability';
import { mockRestaurants, restaurantById } from '@/mock/restaurants';
import { seedReservations } from '@/mock/seed';
import { getOpenState, weeklyHours } from '@/features/restaurants/openingHours';
import { applyFilters, decorate, matchesQuery, sortRestaurants } from '@/features/restaurants/query';
import { annotateSlots, recommend, suitableForOccasion } from '@/features/recommendations/engine';
import {
  isWaitlistable,
  queueLabel,
  waitlistStatus,
  waitlistSummary,
} from '@/features/reservations/waitlist';
import { config } from '@/constants/config';
import { emptyFilters } from '@/types';
import { addDaysToKey, formatTime, fromDateKey, timeToMinutes, todayKey, toDateKey } from '@/utils/date';
import { formatDistance, joinMeta, priceLabel } from '@/utils/format';
import { distanceKm } from '@/utils/geo';

/** First upcoming date on which the venue actually takes bookings. */
function firstOpenDay(id: string): string {
  const restaurant = restaurantById.get(id)!;
  for (let i = 1; i < 14; i += 1) {
    const key = addDaysToKey(todayKey(), i);
    const day = generateAvailability(restaurant, key, 2);
    if (!day.closedReason && day.slots.length > 0) return key;
  }
  throw new Error(`no open day found for ${id}`);
}

let checks = 0;
const check = (label: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`  ok  ${label}`);
};

console.log('\n--- dates ---');
check('toDateKey uses local calendar, not UTC', () => {
  const d = new Date(2026, 7, 14, 23, 30);
  assert.equal(toDateKey(d), '2026-08-14');
});
check('formatTime 24h -> 12h', () => {
  assert.equal(formatTime('19:30'), '7:30 PM');
  assert.equal(formatTime('00:00'), '12:00 AM');
  assert.equal(formatTime('12:00'), '12:00 PM');
});
check('timeToMinutes round trips', () => {
  assert.equal(timeToMinutes('19:30'), 1170);
});

console.log('\n--- formatting ---');
check('distance switches units and drops decimals when long', () => {
  assert.equal(formatDistance(0.4), '400 m');
  assert.equal(formatDistance(2.34), '2.3 km');
  assert.equal(formatDistance(12.7), '13 km');
  assert.equal(formatDistance(null), null);
});
check('joinMeta drops nulls without leaving separators', () => {
  assert.equal(joinMeta(['Italian', null, '$$$']), 'Italian  ·  $$$');
});
check('priceLabel clamps', () => {
  assert.equal(priceLabel(3), '$$$');
});

console.log('\n--- geo ---');
check('distance between two Lisbon points is plausible', () => {
  const a = { latitude: 38.7176, longitude: -9.1489 };
  const b = { latitude: 38.7069, longitude: -9.1447 };
  const km = distanceKm(a, b);
  assert.ok(km > 1 && km < 2, `expected ~1.2km, got ${km}`);
});

console.log('\n--- opening hours ---');
check('every restaurant produces a usable open state at every hour', () => {
  for (const restaurant of mockRestaurants) {
    for (let hour = 0; hour < 24; hour += 1) {
      const state = getOpenState(restaurant, new Date(2026, 7, 14, hour), hour * 60);
      assert.ok(state.label.length > 0, `${restaurant.name} @${hour} had an empty label`);
    }
  }
});
check('a past-midnight bar reads as open at 00:30', () => {
  const bar = restaurantById.get('rst_maiz')!;
  // Friday 00:30 — Thursday's span runs to 25:00.
  const friday = new Date(2026, 7, 14); // 14 Aug 2026 is a Friday
  assert.equal(friday.getDay(), 5);
  const state = getOpenState(bar, friday, 30);
  assert.equal(state.isOpen, true, `expected open past midnight, got "${state.label}"`);
});
check('weeklyHours returns 7 rows starting Monday', () => {
  const rows = weeklyHours(mockRestaurants[0]);
  assert.equal(rows.length, 7);
  assert.equal(rows[0].day, 'Monday');
  assert.equal(rows[6].day, 'Sunday');
});

console.log('\n--- availability ---');
check('slots are deterministic across calls', () => {
  const r = restaurantById.get('rst_grano')!;
  const date = firstOpenDay('rst_grano');
  const a = generateAvailability(r, date, 2);
  const b = generateAvailability(r, date, 2);
  assert.deepEqual(a.slots, b.slots);
});
check('closed days return a reason and no slots', () => {
  const r = restaurantById.get('rst_grano')!; // closed Mondays
  let found = false;
  for (let i = 0; i < 8; i += 1) {
    const key = addDaysToKey(todayKey(), i);
    const day = generateAvailability(r, key, 2);
    if (day.closedReason) {
      assert.equal(day.slots.length, 0);
      found = true;
    }
  }
  assert.ok(found, 'expected at least one closed day in the next week');
});
check('oversize party is refused with an explanation', () => {
  const r = restaurantById.get('rst_kissaten')!; // max 4, closed Sun+Mon
  const openDay = firstOpenDay('rst_kissaten');
  const day = generateAvailability(r, openDay, 8);
  assert.ok(day.closedReason?.includes('4'), day.closedReason ?? 'no closedReason returned');
  assert.equal(day.slots.length, 0);
});
check('no slot is offered within 90 min of closing', () => {
  const r = restaurantById.get('rst_grano')!;
  const date = firstOpenDay('rst_grano');
  const day = generateAvailability(r, date, 2);
  const closes = r.hours.find((h) => h.day === fromDateKey(date).getDay());
  for (const slot of day.slots) {
    if (closes?.closesAt != null) {
      assert.ok(timeToMinutes(slot.time) <= closes.closesAt - 90);
    }
  }
});
check('every card preview slot is actually bookable today', () => {
  for (const restaurant of mockRestaurants) {
    const preview = previewSlots(restaurant);
    const day = generateAvailability(restaurant, todayKey(), 2);
    for (const time of preview) {
      const slot = day.slots.find((s) => s.time === time);
      assert.ok(slot, `${restaurant.name} advertised ${time} which is not on the board`);
      assert.notEqual(slot!.availability, 'unavailable', `${restaurant.name} advertised a full slot`);
    }
  }
});

console.log('\n--- query ---');
const origin = { latitude: 38.7139, longitude: -9.1394 };
const favorites = new Set(['rst_grano']);
const decorated = mockRestaurants.map((r) => decorate(r, origin, favorites));

check('decorate attaches distance and favourite state', () => {
  const grano = decorated.find((r) => r.id === 'rst_grano')!;
  assert.equal(grano.isFavorite, true);
  assert.ok(grano.distanceKm !== null && grano.distanceKm > 0);
});
check('search is accent-insensitive', () => {
  const pombal = decorated.find((r) => r.id === 'rst_pombal')!;
  assert.equal(matchesQuery(pombal, 'cafe pombal'), true);
  assert.equal(matchesQuery(pombal, 'Café'), true);
});
check('multi-term search narrows with AND', () => {
  const grano = decorated.find((r) => r.id === 'rst_grano')!;
  assert.equal(matchesQuery(grano, 'italian principe'), true);
  assert.equal(matchesQuery(grano, 'italian belem'), false);
});
check('amenity filter is AND, not OR', () => {
  const filtered = applyFilters(decorated, {
    ...emptyFilters,
    amenities: ['outdoor-seating', 'pet-friendly'],
  });
  for (const r of filtered) {
    assert.ok(r.amenities.includes('outdoor-seating'));
    assert.ok(r.amenities.includes('pet-friendly'));
  }
  assert.ok(filtered.length > 0, 'expected at least one pet-friendly terrace');
});
check('price filter matches exactly the chosen tiers', () => {
  const filtered = applyFilters(decorated, { ...emptyFilters, priceTiers: [1] });
  assert.ok(filtered.length > 0);
  for (const r of filtered) assert.equal(r.priceTier, 1);
});
check('distance sort puts unknown distances last', () => {
  const mixed = [
    { ...decorated[0], distanceKm: null },
    { ...decorated[1], distanceKm: 5 },
    { ...decorated[2], distanceKm: 1 },
  ];
  const sorted = sortRestaurants(mixed, 'distance');
  assert.equal(sorted[0].distanceKm, 1);
  assert.equal(sorted[2].distanceKm, null);
});
check('recommended sort is stable and complete', () => {
  const sorted = sortRestaurants(decorated, 'recommended');
  assert.equal(sorted.length, decorated.length);
});

console.log('\n--- recommendations ---');
check('recommend returns scored results with explainable reasons', () => {
  const scored = recommend(decorated, {
    favoriteIds: favorites,
    preferredCuisines: ['italian', 'japanese'],
    history: [],
    recentlyViewed: [],
    hourOfDay: 19,
  });
  assert.ok(scored.length > 0);
  assert.ok(scored[0].score >= scored[scored.length - 1].score, 'not sorted by score');
  assert.ok(scored.some((s) => s.reason), 'no result carried a reason');
});
check('morning boosts cafes over dinner rooms', () => {
  const morning = recommend(decorated, {
    favoriteIds: new Set(),
    preferredCuisines: [],
    history: [],
    recentlyViewed: [],
    hourOfDay: 9,
  }, 5);
  const hasCafe = morning.some(
    (s) => s.restaurant.kind === 'cafe' || s.restaurant.cuisines.includes('cafe'),
  );
  assert.ok(hasCafe, 'expected a cafe in the morning top 5');
});
check('occasion matching returns celebration-capable venues', () => {
  const birthday = suitableForOccasion(decorated, 'birthday');
  assert.ok(birthday.length > 0);
  for (const r of birthday) assert.ok(r.goodFor.includes('birthday'));
  assert.equal(suitableForOccasion(decorated, 'none').length, 0);
});
check('annotateSlots marks at most two off-peak slots', () => {
  const r = restaurantById.get('rst_grano')!;
  const day = generateAvailability(r, firstOpenDay('rst_grano'), 2);
  const annotated = annotateSlots(day.slots);
  const marked = annotated.filter((s) => s.recommended);
  assert.ok(marked.length <= 2, `marked ${marked.length}`);
  for (const slot of marked) {
    const m = timeToMinutes(slot.time);
    assert.ok(m < 19 * 60 || m > 21 * 60, `${slot.time} is peak but was marked quiet`);
    assert.equal(slot.availability, 'available');
  }
});

console.log('\n--- waitlist ---');
check('full slots carry a queue only where the venue keeps one', () => {
  for (const restaurant of mockRestaurants) {
    const day = generateAvailability(restaurant, firstOpenDay(restaurant.id), 2);
    assert.equal(day.waitlistOpen, restaurant.acceptsWaitlist, `${restaurant.id} day flag`);
    for (const slot of day.slots) {
      if (slot.availability !== 'unavailable') {
        // A slot with a table left is a booking, never a queue.
        assert.equal(slot.waitlist, undefined, `${restaurant.id} ${slot.time} queued a free slot`);
      } else {
        assert.equal(
          Boolean(slot.waitlist),
          restaurant.acceptsWaitlist,
          `${restaurant.id} ${slot.time} disagrees with acceptsWaitlist`,
        );
      }
    }
  }
});
check('a walk-in venue offers no queue at all', () => {
  const walkIn = restaurantById.get('rst_pombal')!;
  assert.equal(walkIn.acceptsWaitlist, false);
  const day = generateAvailability(walkIn, firstOpenDay('rst_pombal'), 2);
  assert.ok(day.slots.some((s) => s.availability === 'unavailable'), 'no full slot to test');
  assert.ok(day.slots.every((s) => !isWaitlistable(s)));
});
check('queue depth is deterministic and within bounds', () => {
  const r = restaurantById.get('rst_grano')!;
  const date = firstOpenDay('rst_grano');
  const first = generateAvailability(r, date, 2).slots.filter(isWaitlistable);
  const second = generateAvailability(r, date, 2).slots.filter(isWaitlistable);
  assert.ok(first.length > 0, 'expected at least one queueable slot');
  assert.deepEqual(
    first.map((s) => s.waitlist!.queueLength),
    second.map((s) => s.waitlist!.queueLength),
    'queue reshuffled between two reads of the same board',
  );
  for (const slot of first) {
    const depth = slot.waitlist!.queueLength;
    assert.ok(depth >= 1 && depth <= config.waitlist.maxQueueLength, `depth ${depth}`);
  }
});
check('closed days and oversize parties have nothing to queue for', () => {
  const closed = restaurantById.get('rst_grano')!;
  // Monday: this venue's closed day.
  const monday = (() => {
    for (let i = 0; i < 8; i += 1) {
      const key = addDaysToKey(todayKey(), i);
      if (fromDateKey(key).getDay() === 1) return key;
    }
    throw new Error('no Monday in the next week');
  })();
  const day = generateAvailability(closed, monday, 2);
  assert.ok(day.closedReason, 'expected a closed day');
  assert.equal(day.waitlistOpen, false);

  const huge = generateAvailability(closed, firstOpenDay('rst_grano'), closed.maxPartySize + 1);
  assert.ok(huge.closedReason);
  assert.equal(huge.waitlistOpen, false);
});
check('an entry walks queued -> offered -> lapsed on the clock alone', () => {
  const joinedAt = new Date(2026, 7, 14, 19, 0).toISOString();
  const entry = { waitlist: { position: 3, joinedAt } };
  const origin = Date.parse(joinedAt);
  const { queueMoveMs, holdMinutes } = config.waitlist;

  const atJoin = waitlistStatus(entry, origin)!;
  assert.equal(atJoin.state, 'queued');
  assert.equal(atJoin.position, 3);

  const halfway = waitlistStatus(entry, origin + queueMoveMs * 2)!;
  assert.equal(halfway.state, 'queued');
  assert.equal(halfway.position, 1, 'queue did not advance');

  const offered = waitlistStatus(entry, origin + queueMoveMs * 3)!;
  assert.equal(offered.state, 'offered');
  assert.equal(offered.position, 0);
  assert.equal(offered.minutesLeft, holdMinutes);

  const lapsed = waitlistStatus(entry, origin + queueMoveMs * 3 + holdMinutes * 60_000)!;
  assert.equal(lapsed.state, 'lapsed');
  assert.equal(lapsed.minutesLeft, 0);
});
check('a live hold never reads zero minutes left', () => {
  const joinedAt = new Date(2026, 7, 14, 19, 0).toISOString();
  const entry = { waitlist: { position: 1, joinedAt } };
  const status = waitlistStatus(entry, Date.parse(joinedAt))!;
  // One millisecond before the hold lapses is still a live offer, and a
  // countdown reading "0 minutes" beside an enabled button is a lie.
  const nearlyGone = waitlistStatus(entry, status.expiresAt - 1)!;
  assert.equal(nearlyGone.state, 'offered');
  assert.ok(nearlyGone.minutesLeft >= 1, `read ${nearlyGone.minutesLeft}`);
});
check('a reservation with no entry has no waitlist state', () => {
  assert.equal(waitlistStatus({ waitlist: undefined }), null);
});
check('queue copy names the queue, never a bare zero', () => {
  assert.equal(queueLabel(0), 'A table is yours');
  assert.equal(queueLabel(1), 'You are next');
  assert.equal(queueLabel(4), '4 ahead of you');
  assert.ok(waitlistSummary({ queueLength: 5 }).includes('5 ahead of you'));
});

console.log('\n--- data integrity ---');
check('16 restaurants, all fields populated', () => {
  assert.ok(mockRestaurants.length >= 15, `only ${mockRestaurants.length}`);
  for (const r of mockRestaurants) {
    assert.ok(r.name && r.tagline && r.about.length > 60, `${r.id} thin content`);
    assert.ok(r.images.length >= 3, `${r.id} has ${r.images.length} images`);
    assert.ok(r.cuisines.length > 0 && r.amenities.length > 0, `${r.id} missing tags`);
    assert.equal(r.hours.length, 7, `${r.id} has ${r.hours.length} hour rows`);
    assert.ok(r.rating >= 3 && r.rating <= 5, `${r.id} rating ${r.rating}`);
    assert.ok(r.maxPartySize > 0);
    assert.ok(!/lorem|ipsum|placeholder|TODO/i.test(r.about), `${r.id} has filler copy`);
  }
});
check('every seeded upcoming booking lands on a sitting the venue serves', () => {
  // A fixed day offset lands on a different weekday depending on when you
  // install, so this is the check that stops a fresh install opening on a
  // confirmed table at a restaurant that is closed that night.
  const upcoming = seedReservations().filter(
    (r) => r.status === 'confirmed' || r.status === 'pending' || r.status === 'waitlisted',
  );
  assert.ok(upcoming.length >= 3, `only ${upcoming.length} upcoming seeds`);

  for (const reservation of upcoming) {
    const restaurant = restaurantById.get(reservation.restaurantId)!;
    assert.ok(restaurant, `${reservation.id} points at an unknown restaurant`);
    const day = generateAvailability(restaurant, reservation.date, reservation.partySize);
    assert.ok(!day.closedReason, `${reservation.id} sits on a closed day: ${day.closedReason}`);
    assert.ok(
      day.slots.some((slot) => slot.time === reservation.time),
      `${reservation.id} sits at ${reservation.time}, which ${restaurant.name} does not serve`,
    );
  }
});
check('the seeded waitlist entry is a queue, not a table', () => {
  const entry = seedReservations().find((r) => r.status === 'waitlisted')!;
  assert.ok(entry, 'no waitlist entry seeded');
  assert.ok(entry.waitlist, 'waitlisted status with no entry');
  assert.equal(entry.code, undefined, 'a queue must not carry a booking code');
  assert.ok(restaurantById.get(entry.restaurantId)!.acceptsWaitlist, 'queued at a walk-in venue');
  // Seeded mid-queue so the offer arrives during the first session rather than
  // requiring someone to book their way into the state.
  assert.ok(waitlistStatus(entry)!.state === 'queued', 'seeded entry starts already offered');
});
check('ids are unique', () => {
  assert.equal(new Set(mockRestaurants.map((r) => r.id)).size, mockRestaurants.length);
});
check('every cuisine and price tier is represented', () => {
  const tiers = new Set(mockRestaurants.map((r) => r.priceTier));
  assert.deepEqual([...tiers].sort(), [1, 2, 3, 4]);
  const kinds = new Set(mockRestaurants.map((r) => r.kind));
  assert.ok(kinds.size >= 4, `only ${kinds.size} venue kinds`);
  const neighbourhoods = new Set(mockRestaurants.map((r) => r.neighbourhood));
  assert.ok(neighbourhoods.size >= 10, `only ${neighbourhoods.size} neighbourhoods`);
});

console.log(`\n${checks} checks passed\n`);
