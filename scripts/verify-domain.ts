/* Smoke test for the pure domain layer. Run with tsx from the project root. */
import assert from 'node:assert';

import { generateAvailability, previewBoard, previewSlots } from '@/mock/availability';
import { mockRestaurants, restaurantById } from '@/mock/restaurants';
import { seedNotifications, seedReservations } from '@/mock/seed';
import { settleElapsed, SETTLE_AFTER_MS } from '@/features/reservations/lifecycle';
import { getOpenState, weeklyHours } from '@/features/restaurants/openingHours';
import { applyFilters, decorate, matchesQuery, sortRestaurants } from '@/features/restaurants/query';
import { annotateSlots, recommend, suitableForOccasion } from '@/features/recommendations/engine';
import {
  isWaitlistable,
  queueLabel,
  waitlistStatus,
  waitlistSummary,
} from '@/features/reservations/waitlist';
import {
  assertBookable,
  assertCancellable,
  assertJoinable,
  assertModifiable,
  assertOfferAcceptable,
  requireRestaurant,
  LOCK_WINDOW_MS,
} from '@/features/reservations/rules';
import {
  notificationEvents,
  waitlistJoined,
  waitlistOffered,
  SERVER_ONLY_KINDS,
} from '@/features/notifications/events';
import { missingEntries, nextDueAt } from '@/features/notifications/reconcile';
import { routeFor } from '@/features/notifications/routing';
import {
  clearRead as clearReadNotifications,
  dismiss as dismissNotification,
  expire,
  readCount,
  restore as restoreNotification,
} from '@/features/notifications/inbox';
import { contrastRatio, flatten } from '@/theme/contrast';
import { palettes } from '@/theme/palette';
import { config } from '@/constants/config';
import {
  emptyFilters,
  type AppNotification,
  type NotificationKind,
  type Reservation,
  type ReservationStatus,
} from '@/types';
import { isAppError, type ErrorCode } from '@/utils/errors';
import {
  addDaysToKey,
  combine,
  formatTime,
  fromDateKey,
  timeToMinutes,
  todayKey,
  toDateKey,
} from '@/utils/date';
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

check('some nights sell out, but not so many that the app is unusable', () => {
  // Both bounds matter. With no sold-out nights the waitlist, the "nothing free
  // that day" empty state and the card's no-slots branch are all unreachable —
  // that was true until demand became a property of the evening rather than of
  // each slot independently. With too many, the app is a wall of dashed pills.
  let nights = 0;
  let soldOut = 0;

  for (const restaurant of mockRestaurants) {
    for (let i = 1; i <= 28; i += 1) {
      const day = generateAvailability(restaurant, addDaysToKey(todayKey(), i), 2);
      if (day.slots.length === 0) continue;
      nights += 1;
      if (day.slots.every((slot) => slot.availability === 'unavailable')) soldOut += 1;
    }
  }

  const rate = soldOut / nights;
  assert.ok(soldOut > 0, 'no venue sells out on any of the next 28 nights');
  assert.ok(rate < 0.15, `${(rate * 100).toFixed(1)}% of nights are sold out`);
});
check('demand belongs to the evening, not to each slot', () => {
  // A busy night is a run of full slots, not full ones scattered through a
  // quiet evening. Measured as: the busiest night is meaningfully fuller than
  // the quietest one at the same venue.
  const restaurant = restaurantById.get('rst_lumen')!;
  const rates: number[] = [];
  for (let i = 1; i <= 28; i += 1) {
    const day = generateAvailability(restaurant, addDaysToKey(todayKey(), i), 2);
    if (day.slots.length === 0) continue;
    rates.push(day.slots.filter((s) => s.availability === 'unavailable').length / day.slots.length);
  }
  const spread = Math.max(...rates) - Math.min(...rates);
  assert.ok(spread > 0.4, `nights are all alike; spread was only ${spread.toFixed(2)}`);
});
check('a card offers times or a queue, never both', () => {
  for (const restaurant of mockRestaurants) {
    const board = previewBoard(restaurant);
    assert.ok(
      !(board.slots.length > 0 && board.waitlistTonight),
      `${restaurant.id} advertised a table and a queue at once`,
    );

    if (!board.waitlistTonight) continue;
    // The claim has to be backed by tonight's actual board, not by the venue
    // merely being the sort of place that keeps a list.
    assert.ok(restaurant.acceptsWaitlist, `${restaurant.id} offered a queue it does not keep`);
    const today = generateAvailability(restaurant, todayKey(), 2);
    assert.ok(today.slots.some(isWaitlistable), `${restaurant.id} has no queueable slot tonight`);
  }
});
check('a sold-out night at a waitlist venue does show the queue', () => {
  // The card signal is worth nothing if it cannot fire. Find a night that is
  // genuinely sold out and assert the card offers the queue rather than an
  // empty space that reads as "no availability, move on".
  for (const restaurant of mockRestaurants.filter((r) => r.acceptsWaitlist)) {
    for (let i = 1; i <= 28; i += 1) {
      const date = addDaysToKey(todayKey(), i);
      const day = generateAvailability(restaurant, date, 2);
      if (day.slots.length === 0) continue;
      if (!day.slots.every((slot) => slot.availability === 'unavailable')) continue;

      const board = previewBoard(restaurant, 2, 3, date);
      assert.equal(board.slots.length, 0, 'a sold-out night still advertised times');
      assert.equal(board.waitlistTonight, true, `${restaurant.id} hid its queue on ${date}`);
      return;
    }
  }
  assert.fail('no sold-out night at a waitlist venue in the next 28 days');
});
check('a venue closed tonight offers no queue for tonight', () => {
  // Closed, or past the last seating: either way there is no sitting left to be
  // next in line for, and the card must not imply otherwise.
  for (const restaurant of mockRestaurants) {
    const today = generateAvailability(restaurant, todayKey(), 2);
    if (today.slots.length > 0) continue;
    assert.equal(
      previewBoard(restaurant).waitlistTonight,
      false,
      `${restaurant.id} offered a queue with no sittings left`,
    );
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

console.log('\n--- reservation rules ---');

/** A board from the next three weeks that actually contains the slot we want to test. */
function boardWith(restaurantId: string, want: 'free' | 'full') {
  const restaurant = restaurantById.get(restaurantId)!;
  for (let i = 1; i < 21; i += 1) {
    const date = addDaysToKey(todayKey(), i);
    const day = generateAvailability(restaurant, date, 2);
    const slot = day.slots.find((s) =>
      want === 'free' ? s.availability !== 'unavailable' : s.availability === 'unavailable',
    );
    if (slot) return { restaurant, day, slot, request: { date, time: slot.time, partySize: 2 } };
  }
  throw new Error(`no ${want} slot for ${restaurantId} within three weeks`);
}

function bookingAt(over: Partial<Reservation> = {}): Reservation {
  return {
    id: 'rsv_test',
    code: 'ABC234',
    restaurantId: 'rst_grano',
    date: '2026-08-14',
    time: '20:00',
    partySize: 2,
    seating: 'any',
    occasion: 'none',
    notes: '',
    status: 'confirmed',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...over,
  };
}

/** Asserts the rule refused, and refused with the code whose copy the UI renders. */
function refuses(code: ErrorCode, fn: () => void) {
  assert.throws(fn, (error: unknown) => {
    assert.ok(isAppError(error), `threw ${error} instead of an AppError`);
    assert.equal(error.code, code, `refused as '${error.code}', expected '${code}'`);
    return true;
  });
}

check('a free slot books and a full one does not', () => {
  const free = boardWith('rst_grano', 'free');
  assert.doesNotThrow(() => assertBookable({ ...free, now: Date.now() }));

  const full = boardWith('rst_grano', 'full');
  refuses('slot-taken', () => assertBookable({ ...full, now: Date.now() }));
});
check('a time the venue never offered is refused, not silently accepted', () => {
  const board = boardWith('rst_grano', 'free');
  refuses('slot-taken', () =>
    assertBookable({ ...board, request: { ...board.request, time: '03:00' }, now: Date.now() }),
  );
});
check('a booking in the past is refused with a field message', () => {
  const board = boardWith('rst_grano', 'free');
  const yesterday = addDaysToKey(todayKey(), -1);
  refuses('validation', () =>
    assertBookable({ ...board, request: { ...board.request, date: yesterday }, now: Date.now() }),
  );
});
check('a closed day is refused in the venue own words', () => {
  const restaurant = restaurantById.get('rst_grano')!;
  const oversize = generateAvailability(restaurant, firstOpenDay('rst_grano'), 40);
  try {
    assertBookable({
      restaurant,
      day: oversize,
      request: { date: oversize.date, time: '20:00', partySize: 40 },
      now: Date.now(),
    });
    assert.fail('an oversize party was accepted');
  } catch (error) {
    assert.ok(isAppError(error) && error.code === 'no-availability');
    // The generator's explanation reaches the user rather than generic copy.
    assert.ok(error.message.includes(restaurant.name), `lost the venue reason: ${error.message}`);
  }
});
check('an unknown restaurant is refused once, at the edge', () => {
  refuses('restaurant-unavailable', () => requireRestaurant(undefined, 'rst_nope'));
  assert.equal(requireRestaurant(restaurantById.get('rst_grano'), 'rst_grano').id, 'rst_grano');
});

check('a walk-in venue refuses a queue', () => {
  const board = boardWith('rst_pombal', 'full');
  refuses('waitlist-closed', () =>
    assertJoinable({ ...board, existing: [], now: Date.now() }),
  );
});
check('a slot with a table free refuses a queue and says to book it', () => {
  const board = boardWith('rst_grano', 'free');
  try {
    assertJoinable({ ...board, existing: [], now: Date.now() });
    assert.fail('queued for a bookable slot');
  } catch (error) {
    assert.ok(isAppError(error) && error.code === 'waitlist-closed');
    assert.ok(error.message.includes('book it outright'), `unhelpful copy: ${error.message}`);
  }
});
check('joining a full slot returns that slot own queue', () => {
  const board = boardWith('rst_grano', 'full');
  const queue = assertJoinable({ ...board, existing: [], now: Date.now() });
  assert.equal(queue.queueLength, board.slot.waitlist!.queueLength);
  assert.ok(queue.queueLength >= 1);
});
check('one place per sitting', () => {
  const board = boardWith('rst_grano', 'full');
  const already = bookingAt({
    id: 'wlt_existing',
    status: 'waitlisted',
    restaurantId: board.restaurant.id,
    date: board.request.date,
    time: board.request.time,
    code: undefined,
    waitlist: { position: 2, joinedAt: new Date().toISOString() },
  });

  refuses('waitlist-duplicate', () =>
    assertJoinable({ ...board, existing: [already], now: Date.now() }),
  );
  // A cancelled entry is not a place in the queue, so it must not block a rejoin.
  assert.doesNotThrow(() =>
    assertJoinable({
      ...board,
      existing: [{ ...already, status: 'cancelled' }],
      now: Date.now(),
    }),
  );
});

check('changes close two hours before the sitting and not a moment earlier', () => {
  const booking = bookingAt();
  const sitting = combine(booking.date, booking.time).getTime();

  assert.doesNotThrow(() => assertModifiable(booking, sitting - LOCK_WINDOW_MS - 1000));
  refuses('reservation-locked', () => assertModifiable(booking, sitting - LOCK_WINDOW_MS + 1000));
  refuses('reservation-locked', () => assertModifiable(booking, sitting));
});
check('a settled booking cannot be changed whatever the clock says', () => {
  const sitting = combine('2026-08-14', '20:00').getTime();
  const wellBefore = sitting - 5 * 3_600_000;
  for (const status of ['cancelled', 'completed', 'no-show'] as const) {
    refuses('reservation-locked', () => assertModifiable(bookingAt({ status }), wellBefore));
  }
});
check('a waitlist entry cannot be edited but can always be left', () => {
  const entry = bookingAt({
    status: 'waitlisted',
    code: undefined,
    waitlist: { position: 3, joinedAt: new Date().toISOString() },
  });
  const sitting = combine(entry.date, entry.time).getTime();

  refuses('reservation-locked', () => assertModifiable(entry, sitting - 5 * 3_600_000));
  // Inside the lock window, past it, and after the sitting: leaving is never
  // refused, because there is no table to give back late.
  assert.doesNotThrow(() => assertCancellable(entry, sitting - 60_000));
  assert.doesNotThrow(() => assertCancellable(entry, sitting + 3_600_000));
  // A real booking keeps the lock.
  refuses('reservation-locked', () => assertCancellable(bookingAt(), sitting - 60_000));
});
check('an offer is acceptable only while the hold is live', () => {
  const joinedAt = new Date(2026, 7, 14, 18, 0).toISOString();
  const origin = Date.parse(joinedAt);
  const entry = bookingAt({
    status: 'waitlisted',
    code: undefined,
    waitlist: { position: 2, joinedAt },
  });
  const offerAt = origin + 2 * config.waitlist.queueMoveMs;

  refuses('waitlist-offer-expired', () => assertOfferAcceptable(entry, offerAt - 1000));
  assert.equal(assertOfferAcceptable(entry, offerAt).state, 'offered');
  refuses('waitlist-offer-expired', () =>
    assertOfferAcceptable(entry, offerAt + config.waitlist.holdMinutes * 60_000),
  );
  // And a booking that already took its table cannot take it twice.
  refuses('waitlist-offer-expired', () => assertOfferAcceptable(bookingAt(), offerAt));
});

console.log('\n--- lifecycle ---');
check('a booking settles four hours after the sitting, not during it', () => {
  const booking = bookingAt();
  const sitting = combine(booking.date, booking.time).getTime();

  const midMeal = settleElapsed([booking], sitting + 3_600_000);
  assert.equal(midMeal.changed, false, 'settled while the mains were still coming');
  assert.equal(midMeal.reservations[0].status, 'confirmed');

  const after = settleElapsed([booking], sitting + SETTLE_AFTER_MS);
  assert.equal(after.changed, true);
  assert.equal(after.reservations[0].status, 'completed');
});
check('an unanswered request lapses rather than completing', () => {
  const request = bookingAt({ status: 'pending' });
  const sitting = combine(request.date, request.time).getTime();

  assert.equal(settleElapsed([request], sitting - 1000).changed, false);
  const settled = settleElapsed([request], sitting).reservations[0];
  // It was never a table, so it cannot have been a dinner.
  assert.equal(settled.status, 'cancelled');
  assert.ok(settled.venueMessage?.includes('did not confirm'));
});
check('a queue closes with its sitting and drops its entry', () => {
  const entry = bookingAt({
    status: 'waitlisted',
    code: undefined,
    waitlist: { position: 2, joinedAt: new Date().toISOString() },
  });
  const sitting = combine(entry.date, entry.time).getTime();

  const settled = settleElapsed([entry], sitting).reservations[0];
  assert.equal(settled.status, 'cancelled');
  assert.equal(settled.waitlist, undefined, 'kept a place in a queue that no longer exists');
});
check('settling is idempotent and leaves settled records alone', () => {
  const sitting = combine('2026-08-14', '20:00').getTime();
  const wellAfter = sitting + 40 * 3_600_000;
  const records = [
    bookingAt({ id: 'a', status: 'confirmed' }),
    bookingAt({ id: 'b', status: 'cancelled' }),
    bookingAt({ id: 'c', status: 'completed' }),
    bookingAt({ id: 'd', status: 'no-show' }),
  ];

  const once = settleElapsed(records, wellAfter);
  assert.equal(once.changed, true);
  const twice = settleElapsed(once.reservations, wellAfter);
  assert.equal(twice.changed, false, 'a second pass moved something');
  // Only the confirmed one was the clock's business.
  assert.deepEqual(
    once.reservations.map((r) => r.status),
    ['completed', 'cancelled', 'completed', 'no-show'],
  );
});
check('a booking you made yourself becomes rateable', () => {
  // The Rate action is gated on `completed`, which nothing but the seed used to
  // produce — so the entire review-writing flow was unreachable for any booking
  // a real user made.
  const mine = bookingAt({ id: 'rsv_mine', status: 'confirmed' });
  const sitting = combine(mine.date, mine.time).getTime();
  const settled = settleElapsed([mine], sitting + SETTLE_AFTER_MS).reservations[0];
  assert.equal(settled.status, 'completed');
  assert.equal(settled.reviewId, undefined, 'a fresh booking cannot already have a review');
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
check('every reservation status something can render is a status something produces', () => {
  // The audit this whole section came out of: `no-show` had a badge, a tone, an
  // icon, copy and a rule, and nothing in the app could put a booking into it.
  // A status the UI can draw but the system cannot reach is dead code that
  // looks alive.
  const producible = new Set<ReservationStatus>(seedReservations().map((r) => r.status));
  // Everything the lifecycle and the services can additionally reach.
  producible.add('completed');
  producible.add('cancelled');
  producible.add('waitlisted');

  const renderable: ReservationStatus[] = [
    'pending',
    'confirmed',
    'waitlisted',
    'completed',
    'cancelled',
    'no-show',
  ];
  for (const status of renderable) {
    assert.ok(producible.has(status), `nothing can produce '${status}', but the UI draws it`);
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

console.log('\n--- inbox ---');

/** Minimal entry: only the fields the retention policy actually reads. */
function entry(id: string, createdAt: string, readAt: string | null): AppNotification {
  return {
    id,
    kind: 'reservation-reminder',
    title: id,
    body: '',
    createdAt,
    readAt,
  };
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-08-17T12:00:00.000Z');
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

check('retention drops read entries past the window and keeps the rest', () => {
  const items = [
    entry('fresh-read', ago(2), ago(1)),
    entry('stale-read', ago(400), ago(90)),
    entry('boundary', ago(400), ago(30)),
  ];
  const kept = expire(items, NOW).map((n) => n.id);
  assert.deepEqual(kept, ['fresh-read']);
  // The boundary goes: at exactly the window it has had its full thirty days.
  assert.equal(expire(items, NOW, 31 * DAY).length, 2);
});

check('an unread entry never expires, however old', () => {
  const ancient = [entry('unread', ago(3650), null)];
  assert.equal(expire(ancient, NOW).length, 1, 'age removed something nobody had seen');
});

check('retention counts from when it was read, not when it arrived', () => {
  // A year-old notification opened yesterday is one you have dealt with
  // recently; the policy has to say the same thing.
  const items = [entry('old-but-just-read', ago(365), ago(1))];
  assert.equal(expire(items, NOW).length, 1);
});

check('dismiss removes exactly one entry, read or not', () => {
  const items = [entry('a', ago(1), null), entry('b', ago(2), ago(1)), entry('c', ago(3), null)];
  assert.deepEqual(
    dismissNotification(items, 'a').map((n) => n.id),
    ['b', 'c'],
  );
  assert.deepEqual(dismissNotification(items, 'absent').length, 3);
});

check('clearing read entries cannot take an unread one', () => {
  const items = [entry('read', ago(1), ago(1)), entry('unread', ago(2), null)];
  assert.deepEqual(
    clearReadNotifications(items).map((n) => n.id),
    ['unread'],
  );
  assert.equal(readCount(items), 1);
});

check('undo puts an entry back where it was, not at the top', () => {
  const older = entry('older', ago(5), null);
  const newest = entry('newest', ago(1), null);
  const middle = entry('middle', ago(3), null);
  const after = restoreNotification([newest, older], middle);
  assert.deepEqual(
    after.map((n) => n.id),
    ['newest', 'middle', 'older'],
    'a restored entry reappearing at the top has been re-sent, not restored',
  );
  // Undo pressed twice must not duplicate the row.
  assert.equal(restoreNotification(after, middle).length, 3);
});

console.log('\n--- what the inbox can say ---');

const NOTIFICATION_FIXTURE: Reservation = {
  id: 'rsv_fix',
  code: 'ABC234',
  restaurantId: 'rst_grano',
  date: todayKey(),
  time: '19:30',
  partySize: 2,
  seating: 'any',
  occasion: 'none',
  notes: '',
  status: 'confirmed',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

check('every notification kind the inbox draws is one something can produce', () => {
  // The same audit the reservation statuses got, and it found the same thing.
  // `waitlist-offer` — a table held for twenty minutes, the most time-critical
  // row in the app — had an icon, copy and a place in the union, and nothing
  // anywhere could file one. Neither could `reservation-modified`.
  const producible = new Set<NotificationKind>();
  for (const build of Object.values(notificationEvents)) {
    producible.add(build(NOTIFICATION_FIXTURE, 'Osteria Grano').kind);
  }
  for (const seeded of seedNotifications()) producible.add(seeded.kind);
  for (const kind of SERVER_ONLY_KINDS) producible.add(kind);

  const drawn: NotificationKind[] = [
    'reservation-confirmed',
    'reservation-reminder',
    'reservation-modified',
    'reservation-cancelled',
    'upcoming-reservation',
    'rating-request',
    'restaurant-offer',
    'waitlist-joined',
    'waitlist-offer',
  ];
  for (const kind of drawn) {
    assert.ok(producible.has(kind), `nothing can produce '${kind}', but the inbox draws it`);
  }
});

check('a waitlist row never prints a booking code', () => {
  // The rule the reservation itself already follows: there is no table yet, and
  // a code in the inbox is something to present at a door that is not expecting
  // you. The offer row outlives the twenty-minute hold, so it must not read as
  // a confirmation either.
  const queued: Reservation = { ...NOTIFICATION_FIXTURE, status: 'waitlisted', code: undefined };
  for (const build of [waitlistJoined, waitlistOffered]) {
    const entry = build(queued, 'Osteria Grano');
    assert.ok(!entry.body.includes('code'), `${entry.kind} offered a code`);
    assert.ok(!/confirmed|booked/i.test(entry.body), `${entry.kind} read as a booking`);
  }
});

check('every entry the app files leads back to the thing it is about', () => {
  for (const build of Object.values(notificationEvents)) {
    const entry = build(NOTIFICATION_FIXTURE, 'Osteria Grano');
    assert.equal(entry.reservationId, NOTIFICATION_FIXTURE.id, `${entry.kind} lost its reservation`);
    assert.ok(routeFor(entry), `${entry.kind} leads nowhere`);
    assert.ok(entry.title.length > 0 && entry.body.length > 0, `${entry.kind} is blank`);
  }
});

console.log('\n--- inbox reconciliation ---');

const PREFS = {
  reservationUpdates: true,
  reminders: true,
  reminderLeadHours: 3,
};
const NAMES = new Map([['rst_grano', 'Osteria Grano']]);
const hoursFromNow = (hours: number) => {
  const at = new Date(Date.now() + hours * 3_600_000);
  return { date: toDateKey(at), time: `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}` };
};

check('a sitting is announced once as tomorrow and once as now-ish, never both', () => {
  const far = { ...NOTIFICATION_FIXTURE, ...hoursFromNow(20) };
  const near = { ...NOTIFICATION_FIXTURE, ...hoursFromNow(2) };

  const early = missingEntries([far], [], NAMES, PREFS).map((e) => e.kind);
  assert.deepEqual(early, ['upcoming-reservation'], 'the day-before nudge did not fire alone');

  const late = missingEntries([near], [], NAMES, PREFS).map((e) => e.kind);
  assert.deepEqual(late, ['reservation-reminder'], '"tomorrow" fired two hours before the table');
});

check('reconciliation files nothing twice', () => {
  const booking = { ...NOTIFICATION_FIXTURE, ...hoursFromNow(2) };
  const [entry] = missingEntries([booking], [], NAMES, PREFS);
  const already: AppNotification[] = [{ ...entry, id: 'n1', createdAt: '', readAt: null }];
  assert.deepEqual(missingEntries([booking], already, NAMES, PREFS), []);
});

/**
 * An entry whose table is being held *right now*.
 *
 * The timings are the app's own: a queue moves every 20 seconds and a hold
 * lasts 20 minutes, so five minutes after joining at position 1 the table is
 * offered and the hold is live. An hour would be lapsed — which is what the
 * first version of these checks used, and why they asserted "one row if the
 * arithmetic says offered, none otherwise". That phrasing cannot fail: it
 * re-derives the expectation from the thing under test.
 */
const heldNow = (): Reservation => ({
  ...NOTIFICATION_FIXTURE,
  ...hoursFromNow(3),
  status: 'waitlisted',
  code: undefined,
  waitlist: { position: 1, joinedAt: new Date(Date.now() - 5 * 60_000).toISOString() },
});

check('a held table is filed when the hold starts, not when the app opens', () => {
  const queued = heldNow();
  assert.equal(waitlistStatus(queued)?.state, 'offered', 'the fixture is not actually being held');
  assert.deepEqual(
    missingEntries([queued], [], NAMES, PREFS).map((e) => e.kind),
    ['waitlist-offer'],
  );

  // Lapsed is not offered: once the hold has run out there is no table to
  // announce, and a row filed then would send someone to a booking that is gone.
  const lapsed: Reservation = {
    ...queued,
    waitlist: { position: 1, joinedAt: new Date(Date.now() - 60 * 60_000).toISOString() },
  };
  assert.equal(waitlistStatus(lapsed)?.state, 'lapsed');
  assert.deepEqual(missingEntries([lapsed], [], NAMES, PREFS), []);
});

check('turning reminders off silences the inbox too, but never the held table', () => {
  const booking = { ...NOTIFICATION_FIXTURE, ...hoursFromNow(2) };
  assert.deepEqual(missingEntries([booking], [], NAMES, { ...PREFS, reminders: false }), []);

  const queued = heldNow();
  const quiet = missingEntries([queued], [], NAMES, { ...PREFS, reminders: false }).map(
    (e) => e.kind,
  );
  const silenced = missingEntries([queued], [], NAMES, { ...PREFS, reservationUpdates: false });
  assert.deepEqual(quiet, ['waitlist-offer'], 'reminders off swallowed the held table');
  assert.deepEqual(silenced, [], 'reservationUpdates off still filed a waitlist row');
});

check('every notification preference changes what the app does', () => {
  // The check this file was missing. `offers` sat in Settings as a switch the
  // user could flip, written to storage and read by nothing, because offers
  // come from a restaurant through a server and there is no server. A control
  // that controls nothing spends trust that a missing one does not, so it was
  // removed — and this is what stops the next one shipping.
  const booking = { ...NOTIFICATION_FIXTURE, ...hoursFromNow(2) };
  const both = [booking, heldNow()];
  const baseline = missingEntries(both, [], NAMES, PREFS).map((e) => e.kind);

  const flags: (keyof typeof PREFS)[] = ['reminders', 'reservationUpdates'];
  for (const flag of flags) {
    const off = missingEntries(both, [], NAMES, { ...PREFS, [flag]: false }).map((e) => e.kind);
    assert.notDeepEqual(off, baseline, `turning '${flag}' off changed nothing`);
  }

  // The one preference that is not a switch still has to be load-bearing.
  const longerLead = missingEntries(both, [], NAMES, { ...PREFS, reminderLeadHours: 1 }).map(
    (e) => e.kind,
  );
  assert.notDeepEqual(longerLead, baseline, 'the reminder lead made no difference');
});

check('a rating is asked for once, and not about last year', () => {
  const yesterday = { ...NOTIFICATION_FIXTURE, ...hoursFromNow(-20), status: 'completed' as const };
  assert.deepEqual(
    missingEntries([yesterday], [], NAMES, PREFS).map((e) => e.kind),
    ['rating-request'],
  );

  const rated = { ...yesterday, reviewId: 'rev_1' };
  assert.deepEqual(missingEntries([rated], [], NAMES, PREFS), [], 'asked for a rating twice');

  const ancient = { ...NOTIFICATION_FIXTURE, ...hoursFromNow(-24 * 30), status: 'completed' as const };
  assert.deepEqual(missingEntries([ancient], [], NAMES, PREFS), [], 'asked about a month-old dinner');
});

check('the next wake-up is the next transition, not a poll interval', () => {
  const booking = { ...NOTIFICATION_FIXTURE, ...hoursFromNow(20) };
  const due = nextDueAt([booking], PREFS);
  assert.ok(due !== null, 'nothing to wake for, with a booking 20 hours out');
  const sitting = combine(booking.date, booking.time).getTime();
  // Twenty hours out, the next thing to happen is the reminder at lead time.
  assert.equal(due, sitting - PREFS.reminderLeadHours * 3_600_000);
  assert.equal(nextDueAt([], PREFS), null, 'a guest with no bookings still set a timer');
});

console.log('\n--- notification routing ---');

check('every notification the app files leads somewhere', () => {
  // The coupling this exists to hold: the scheduler writes hrefs and the router
  // gate reads them, and neither imports the other. A notification that arrives
  // with a deadline on it and opens nothing is the bug this whole module is
  // about, so the seeds and the format the service writes are both checked.
  for (const notification of seedNotifications()) {
    if (!notification.href) continue;
    assert.ok(routeFor(notification), `seeded notification leads nowhere: ${notification.href}`);
  }
  const reservation = seedReservations()[0];
  assert.equal(
    routeFor({ href: `/reservation/${reservation.id}` }),
    `/reservation/${reservation.id}`,
    'the path notificationService schedules is not one the gate accepts',
  );
});

check('a notification cannot send the app outside itself', () => {
  for (const href of [
    'https://evil.example/reservation/rsv_1',
    '//evil.example/reservation/rsv_1',
    'mesa://reservation/rsv_1',
    'javascript:alert(1)',
    'reservation/rsv_1',
  ]) {
    assert.equal(routeFor({ href }), null, `accepted an external destination: ${href}`);
  }
});

check('only the two routes a notification is about are reachable', () => {
  // Internal, real, and still refused: the gate is a whitelist, not a check
  // that the string looks like a path.
  for (const href of ['/profile/settings', '/(tabs)/profile', '/', '/reservation/', '/restaurant']) {
    assert.equal(routeFor({ href }), null, `accepted an unlisted route: ${href}`);
  }
  assert.equal(routeFor({ href: '/restaurant/rst_maiz' }), '/restaurant/rst_maiz');
});

check('nothing rides along behind a valid id', () => {
  // The route is rebuilt from a validated id rather than echoed, so a query
  // string, a fragment or a second segment cannot survive by attaching itself
  // to something that passed.
  for (const href of [
    '/reservation/rsv_1?redirect=https://evil.example',
    '/reservation/rsv_1#/../profile',
    '/reservation/rsv_1/edit',
    '/reservation/../profile/settings',
    `/reservation/${'x'.repeat(65)}`,
  ]) {
    assert.equal(routeFor({ href }), null, `accepted a decorated id: ${href}`);
  }
});

check('a payload that is not a payload is refused rather than thrown at', () => {
  for (const data of [null, undefined, 'string', 42, [], {}, { href: 42 }, { href: null }]) {
    assert.equal(routeFor(data), null);
  }
});

console.log('\n--- contrast ---');

/**
 * WCAG AA for text below 18pt. Everything in this app that carries information
 * is below it — the display headings that are not are held to the same floor
 * anyway, because nothing was gained by exempting them.
 */
const TEXT_FLOOR = 4.5;

/** Every ground a foreground can land on. Screens stack up to `surfaceAlt`. */
const GROUNDS = ['canvas', 'canvasSunk', 'surface', 'surfaceAlt'] as const;
const SCHEMES = ['light', 'dark'] as const;

/** Reports the number when it fails, since "too low" alone fixes nothing. */
function assertReadable(label: string, fg: string, bg: string, floor = TEXT_FLOOR) {
  const ratio = contrastRatio(fg, bg);
  assert.ok(ratio >= floor, `${label}: ${ratio.toFixed(2)}:1 (${fg} on ${bg}), needs ${floor}:1`);
}

check('the contrast maths matches the WCAG reference values', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#FFFFFF')), 21);
  assert.equal(contrastRatio('#FFFFFF', '#FFFFFF'), 1);
  // Half-black over white is mid-grey at ~3.98:1. A checker that read the alpha
  // as opaque would answer 21 here, and would wave through every translucent
  // token in the palette — which is most of them.
  assert.equal(flatten('rgba(0,0,0,0.5)', '#FFFFFF'), 'rgba(127.5,127.5,127.5,1)');
  assert.ok(Math.abs(contrastRatio('rgba(0,0,0,0.5)', '#FFFFFF') - 3.98) < 0.01);
});

check('every ink tier is readable on every ground, in both schemes', () => {
  for (const scheme of SCHEMES) {
    const p = palettes[scheme];
    for (const fg of ['ink', 'inkMuted', 'inkFaint', 'star'] as const) {
      for (const bg of GROUNDS) {
        assertReadable(`${scheme} ${fg} on ${bg}`, p[fg], p[bg]);
      }
    }
  }
});

check('text on a filled surface is readable, including the muted tier', () => {
  // `ink` as a fill — the primary button, the next-booking card — inverts
  // between schemes. This is the pair a hardcoded rgba() cannot survive.
  for (const scheme of SCHEMES) {
    const p = palettes[scheme];
    assertReadable(`${scheme} inkOn on ink`, p.inkOn, p.ink);
    assertReadable(`${scheme} inkOnMuted on ink`, p.inkOnMuted, p.ink);
    assertReadable(`${scheme} accentOn on accent`, p.accentOn, p.accent);
    assertReadable(`${scheme} inkOn on accent`, p.inkOn, p.accent);
  }
});

check('the ink tiers stay a hierarchy, not just three passing values', () => {
  for (const scheme of SCHEMES) {
    const p = palettes[scheme];
    const ratio = (c: string) => contrastRatio(c, p.canvas);
    assert.ok(
      ratio(p.ink) > ratio(p.inkMuted) && ratio(p.inkMuted) > ratio(p.inkFaint),
      `${scheme}: raising a tier to clear the floor flattened the hierarchy`,
    );
  }
});

check('every semantic tone survives its own soft fill', () => {
  // A tone is drawn on a tint of itself, so the fill pulls the ground toward the
  // foreground: the badge, not the plain label, is the binding case.
  for (const scheme of SCHEMES) {
    const p = palettes[scheme];
    for (const tone of ['positive', 'warning', 'danger', 'accent'] as const) {
      for (const bg of GROUNDS) {
        assertReadable(`${scheme} ${tone} on ${bg}`, p[tone], p[bg]);
        assertReadable(
          `${scheme} ${tone} on ${tone}Soft over ${bg}`,
          p[tone],
          flatten(p[`${tone}Soft`], p[bg]),
        );
      }
    }
  }
});

check('anything drawn on a photo survives the brightest possible photo', () => {
  // A restaurant photo is not a palette value, so the only honest ground to
  // test against is the worst one: a blown-out white plate under a flash.
  const WHITE_PLATE = '#FFFFFF';
  for (const scheme of SCHEMES) {
    const p = palettes[scheme];
    const chip = flatten(p.photoChip, WHITE_PLATE);
    const badge = flatten(p.photoBadge, WHITE_PLATE);
    // A glyph is a control, not prose: WCAG asks 3:1 of it (1.4.11).
    assertReadable(`${scheme} glyph on photoChip`, p.onPhoto, chip, 3);
    assertReadable(`${scheme} text on photoBadge`, p.onPhoto, badge);
    // Inverted on purpose: this is why the saved heart is white on photography
    // rather than terracotta. If a future accent does clear the chip, this fails
    // and the decision gets revisited instead of quietly outliving its reason.
    assert.ok(
      contrastRatio(p.accent, chip) < 3,
      `${scheme}: the accent now clears a photo chip — FavoriteButton can go back to tinting the saved heart`,
    );
  }
});

console.log(`\n${checks} checks passed\n`);
