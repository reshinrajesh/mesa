import type {
  Cuisine,
  Occasion,
  Reservation,
  RestaurantWithContext,
  TimeSlot,
} from '@/types';

import { timeToMinutes } from '@/utils/date';

/**
 * The recommendation layer.
 *
 * This is a transparent heuristic, not machine learning, and it is written that
 * way deliberately: every score is explainable in one sentence, which is what
 * lets the UI show a *reason* next to a suggestion instead of an unfalsifiable
 * "recommended for you".
 *
 * When a real model lands it replaces `scoreRestaurant` and keeps `reason`, so
 * the UI contract survives.
 */

export interface UserSignals {
  favoriteIds: ReadonlySet<string>;
  /** Cuisines the user selected in their profile. */
  preferredCuisines: Cuisine[];
  /** Every past booking, newest first. */
  history: Reservation[];
  /** Restaurant ids opened recently, newest first. */
  recentlyViewed: string[];
  /** Local hour, 0-23. Drives "you usually book late" style weighting. */
  hourOfDay: number;
}

export interface ScoredRestaurant {
  restaurant: RestaurantWithContext;
  score: number;
  /** One short sentence the card renders. Never a generic label. */
  reason: string | null;
}

/** Cuisines the user actually booked, weighted by how recent the booking was. */
function cuisineAffinity(
  signals: UserSignals,
  byId: Map<string, RestaurantWithContext>,
): Map<string, number> {
  const affinity = new Map<string, number>();

  signals.preferredCuisines.forEach((cuisine) => {
    affinity.set(cuisine, (affinity.get(cuisine) ?? 0) + 0.6);
  });

  signals.history.slice(0, 10).forEach((reservation, index) => {
    const restaurant = byId.get(reservation.restaurantId);
    if (!restaurant) return;
    // Recency decay: the last booking counts roughly twice the tenth.
    const weight = 1 - index * 0.07;
    restaurant.cuisines.forEach((cuisine) => {
      affinity.set(cuisine, (affinity.get(cuisine) ?? 0) + weight);
    });
  });

  return affinity;
}

/** Average price tier the user actually books at. Null when there is no history. */
function preferredPriceTier(
  signals: UserSignals,
  byId: Map<string, RestaurantWithContext>,
): number | null {
  const tiers: number[] = [];
  for (const reservation of signals.history) {
    const tier = byId.get(reservation.restaurantId)?.priceTier;
    if (typeof tier === 'number') tiers.push(tier);
  }
  if (tiers.length === 0) return null;
  return tiers.reduce((sum, t) => sum + t, 0) / tiers.length;
}

export function recommend(
  restaurants: RestaurantWithContext[],
  signals: UserSignals,
  limit = 8,
): ScoredRestaurant[] {
  const byId = new Map(restaurants.map((r) => [r.id, r]));
  const affinity = cuisineAffinity(signals, byId);
  const priceTarget = preferredPriceTier(signals, byId);
  const bookedIds = new Set(signals.history.map((r) => r.restaurantId));

  const scored = restaurants.map((restaurant) => {
    let score = 0;
    let reason: string | null = null;

    // 1. Cuisine match — the strongest signal, and the most explainable.
    const cuisineScore = restaurant.cuisines.reduce((sum, c) => sum + (affinity.get(c) ?? 0), 0);
    if (cuisineScore > 0) {
      score += Math.min(3, cuisineScore) * 0.9;
      const matched = restaurant.cuisines.find((c) => (affinity.get(c) ?? 0) > 0);
      if (matched) reason = `You book a lot of ${matched.replace('-', ' ')}`;
    }

    // 2. Adjacent to a favourite: same neighbourhood as somewhere already saved.
    const favouriteNeighbourhoods = new Set(
      restaurants.filter((r) => signals.favoriteIds.has(r.id)).map((r) => r.neighbourhood),
    );
    if (!signals.favoriteIds.has(restaurant.id) && favouriteNeighbourhoods.has(restaurant.neighbourhood)) {
      score += 0.7;
      reason ??= `Near your saved places in ${restaurant.neighbourhood}`;
    }

    // 3. Price band. Being two tiers off what someone books is a real mismatch.
    if (priceTarget !== null) {
      const gap = Math.abs(restaurant.priceTier - priceTarget);
      score += Math.max(0, 1 - gap / 2) * 0.6;
    }

    // 4. Distance.
    if (restaurant.distanceKm !== null) {
      const proximity = Math.max(0, 1 - restaurant.distanceKm / 6);
      score += proximity * 0.8;
      if (!reason && restaurant.distanceKm < 1.2) {
        reason = 'A short walk from you';
      }
    }

    // 5. Time of day. Cafés in the morning, dinner rooms at night.
    const isCafe = restaurant.kind === 'cafe' || restaurant.cuisines.includes('cafe');
    if (signals.hourOfDay < 12 && isCafe) {
      score += 0.9;
      reason ??= 'Open now for breakfast';
    }
    if (signals.hourOfDay >= 17 && !isCafe && restaurant.isOpenNow) {
      score += 0.5;
    }

    // 6. Quality, weighted by how many people voted.
    score += (restaurant.rating - 4) * Math.min(1, restaurant.reviewCount / 800);

    // 7. Push down places already booked — the point is discovery, and the
    //    "book again" path already exists on the Reservations tab.
    if (bookedIds.has(restaurant.id)) score -= 1.2;
    if (signals.recentlyViewed.includes(restaurant.id)) score -= 0.3;

    return { restaurant, score, reason };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Smart time suggestions.
 *
 * Marks the quiet slots on a day's board so the picker can say *why* it is
 * pointing somewhere rather than just highlighting a pill. Only genuinely
 * off-peak slots earn a hint: labelling everything "recommended" would make the
 * label mean nothing.
 */
export function annotateSlots(slots: TimeSlot[]): TimeSlot[] {
  const bookable = slots.filter((s) => s.availability !== 'unavailable');
  if (bookable.length === 0) return slots;

  const quietest = bookable
    .filter((slot) => {
      const minutes = timeToMinutes(slot.time);
      const offPeak = minutes < 19 * 60 || minutes > 21 * 60;
      return offPeak && slot.availability === 'available';
    })
    .slice(0, 2)
    .map((s) => s.time);

  return slots.map((slot) => {
    if (!quietest.includes(slot.time)) return slot;
    const minutes = timeToMinutes(slot.time);
    return {
      ...slot,
      recommended: true,
      hint: minutes < 19 * 60 ? 'Usually quieter' : 'Relaxed late sitting',
    };
  });
}

/**
 * Occasion matching. Someone booking a birthday gets venues that handle one:
 * room for a group, a private option, and staff who will not be thrown by a
 * candle.
 */
export function suitableForOccasion(
  restaurants: RestaurantWithContext[],
  occasion: Occasion,
  limit = 6,
): RestaurantWithContext[] {
  if (occasion === 'none') return [];

  const wanted: Record<Exclude<Occasion, 'none'>, RestaurantWithContext['goodFor'][number]> = {
    birthday: 'birthday',
    anniversary: 'date-night',
    'date-night': 'date-night',
    business: 'business',
    celebration: 'birthday',
  };

  const tag = wanted[occasion];
  return restaurants
    .filter((r) => r.goodFor.includes(tag))
    .sort((a, b) => {
      const groupBonus = (r: RestaurantWithContext) =>
        (r.amenities.includes('private-dining') ? 1 : 0) +
        (r.amenities.includes('accepts-groups') ? 1 : 0);
      return groupBonus(b) - groupBonus(a) || b.rating - a.rating;
    })
    .slice(0, limit);
}

/**
 * Rebook. Takes a past reservation and produces the draft for the same booking
 * on the next occurrence of that weekday, so "book again" is one tap plus a
 * confirmation rather than five screens.
 */
export function rebookDraft(previous: Reservation, nextDate: string) {
  return {
    restaurantId: previous.restaurantId,
    date: nextDate,
    partySize: previous.partySize,
    time: previous.time,
    seating: previous.seating,
    occasion: 'none' as const,
    // Notes are dropped: last time's "birthday" is almost never still true, and
    // silently re-sending it to the venue is worse than asking again.
    notes: '',
  };
}
