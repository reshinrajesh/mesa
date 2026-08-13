import type { AvailabilityDay, Restaurant, SlotAvailability, TimeSlot, Weekday } from '@/types';

import { queueLengthFor } from '@/features/reservations/waitlist';
import { minutesToTime, nowMinutes, timeToMinutes, todayKey, weekdayOf } from '@/utils/date';
import { seededUnit } from '@/utils/id';

/**
 * Availability generator.
 *
 * Deterministic on (restaurant, date, party size, slot): the same query always
 * returns the same board. A mock that reshuffles on every refetch teaches users
 * that the app is lying, and makes the "that time just went" error impossible
 * to test.
 *
 * Replacing this with a real endpoint means deleting this file and pointing
 * `restaurantService.getAvailability` at the API. Nothing else changes.
 */

/** Bookings are taken on the half hour. */
const SLOT_STEP_MINUTES = 30;

/** No slot within this many minutes of closing time. */
const LAST_SEATING_BEFORE_CLOSE = 90;

/** How far ahead of now today's first bookable slot sits. */
const MIN_LEAD_MINUTES = 60;

/**
 * How hard this particular evening is to get into, 0 (quiet) to 1 (slammed).
 *
 * Without this, every slot rolled independently and a restaurant could never
 * actually sell out: a ten-slot evening went fully booked roughly once in ten
 * thousand. Real venues have nights that are simply gone, and a mock that never
 * produces one leaves the waitlist, the "nothing free that day" empty state and
 * the card's no-slots branch all unreachable — code that ships without ever
 * having been seen.
 *
 * Demand is per (restaurant, date) rather than per slot, which is what makes a
 * *night* busy instead of scattering full slots at random through a quiet one.
 * Famous rooms and weekends carry most of it, because that is where it really
 * falls.
 */
function demandFor(restaurant: Restaurant, date: string): number {
  const weekday = weekdayOf(date);
  const isWeekend = weekday === 5 || weekday === 6;
  const fame = restaurant.popularityScore / 100;
  const luck = seededUnit(`${restaurant.id}|${date}|demand`);

  return Math.min(1, luck * 0.55 + fame * 0.3 + (isWeekend ? 0.2 : 0));
}

function availabilityFor(
  seed: string,
  partySize: number,
  isPeak: boolean,
  demand: number,
): SlotAvailability {
  const roll = seededUnit(seed);

  // Bigger parties genuinely are harder to seat, peak slots go first, and a
  // night in demand takes the rest.
  const pressure =
    (partySize >= 7 ? 0.3 : partySize >= 5 ? 0.16 : 0) + (isPeak ? 0.22 : 0) + demand * 0.45;

  if (roll < 0.1 + pressure) return 'unavailable';
  if (roll < 0.3 + pressure) return 'limited';
  return 'available';
}

/** 19:00–21:00 is when everybody wants a table. */
function isPeakSlot(minutes: number): boolean {
  return minutes >= 19 * 60 && minutes <= 21 * 60;
}

function hintFor(minutes: number, availability: SlotAvailability): string | undefined {
  if (availability === 'unavailable') return undefined;
  if (minutes <= 18 * 60 + 30) return 'Usually quieter';
  if (minutes >= 21 * 60 + 30) return 'Relaxed late sitting';
  return undefined;
}

export function generateAvailability(
  restaurant: Restaurant,
  date: string,
  partySize: number,
): AvailabilityDay {
  const day = weekdayOf(date) as Weekday;
  const hours = restaurant.hours.find((entry) => entry.day === day);

  // A closed day and an oversized party have nothing to queue for: there is no
  // sitting to be next in line for, and no table the venue could offer.
  if (!hours || hours.opensAt === null || hours.closesAt === null) {
    return {
      restaurantId: restaurant.id,
      date,
      partySize,
      slots: [],
      waitlistOpen: false,
      closedReason: `${restaurant.name} is closed on this day.`,
    };
  }

  if (partySize > restaurant.maxPartySize) {
    return {
      restaurantId: restaurant.id,
      date,
      partySize,
      slots: [],
      waitlistOpen: false,
      closedReason: `${restaurant.name} takes online bookings up to ${restaurant.maxPartySize} guests. Call them for a larger party.`,
    };
  }

  const isToday = date === todayKey();
  const earliest = isToday
    ? Math.max(hours.opensAt, Math.ceil((nowMinutes() + MIN_LEAD_MINUTES) / 30) * 30)
    : hours.opensAt;
  const latest = hours.closesAt - LAST_SEATING_BEFORE_CLOSE;

  const demand = demandFor(restaurant, date);

  const slots: TimeSlot[] = [];
  for (let minutes = earliest; minutes <= latest; minutes += SLOT_STEP_MINUTES) {
    const time = minutesToTime(minutes);
    const seed = `${restaurant.id}|${date}|${partySize}|${time}`;
    const peak = isPeakSlot(minutes);
    const availability = availabilityFor(seed, partySize, peak, demand);

    slots.push({
      time,
      availability,
      tablesLeft:
        availability === 'unavailable' ? 0 : availability === 'limited' ? 1 + (seededUnit(`${seed}|t`) > 0.5 ? 1 : 0) : 6,
      hint: hintFor(minutes, availability),
      // Only full slots carry a queue, and only where the venue keeps one.
      waitlist:
        availability === 'unavailable' && restaurant.acceptsWaitlist
          ? { queueLength: queueLengthFor(seed, peak) }
          : undefined,
    });
  }

  return {
    restaurantId: restaurant.id,
    date,
    partySize,
    slots,
    waitlistOpen: restaurant.acceptsWaitlist,
  };
}

/** What a card can say about tonight. */
export interface PreviewBoard {
  /** The two or three times the card advertises. Empty when nothing is bookable. */
  slots: string[];
  /**
   * Set when there is nothing left to book tonight but the venue will take a
   * queue. It is deliberately *only* true when `slots` is empty: a card has one
   * line for this, and a free table always outranks a place in a line.
   */
  waitlistTonight: boolean;
}

/**
 * What a card advertises. Cards must never promise a time that the booking
 * screen then refuses, so this reads the same generator.
 */
export function previewBoard(
  restaurant: Restaurant,
  partySize = 2,
  limit = 3,
  /** Defaults to tonight. Injectable so the card's states can be checked on a chosen night. */
  date: string = todayKey(),
): PreviewBoard {
  const day = generateAvailability(restaurant, date, partySize);
  const bookable = day.slots.filter((slot) => slot.availability !== 'unavailable');
  // Prefer the evening; fall back to whatever is left of the day.
  const preferred = bookable.filter((slot) => timeToMinutes(slot.time) >= 18 * 60);
  const source = preferred.length > 0 ? preferred : bookable;

  return {
    slots: source.slice(0, limit).map((slot) => slot.time),
    waitlistTonight: bookable.length === 0 && day.slots.some((slot) => Boolean(slot.waitlist)),
  };
}

export function previewSlots(restaurant: Restaurant, partySize = 2, limit = 3): string[] {
  return previewBoard(restaurant, partySize, limit).slots;
}
