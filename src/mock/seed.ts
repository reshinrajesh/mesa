import type { AppNotification, Reservation, User } from '@/types';

import { generateAvailability } from './availability';
import { avatarPhoto } from './images';
import { restaurantById } from './restaurants';
import { addDaysToKey, todayKey } from '@/utils/date';

/**
 * The starting state a fresh install boots into.
 *
 * Deliberately not empty: an app whose Reservations tab is blank on first run
 * cannot show what it is for. Two upcoming bookings, a live waitlist entry and
 * three past ones give every state on that screen something real to render, and
 * the dates are computed relative to today so they never go stale.
 */

export const mockUser: User = {
  id: 'usr_demo',
  name: 'Alexandra Marques',
  email: 'alex.marques@example.com',
  phone: '+351 912 555 048',
  avatarUrl: avatarPhoto[0],
  favoriteCuisines: ['italian', 'japanese', 'cafe'],
  dietary: ['pescatarian'],
  savedPlaces: [
    {
      id: 'place_home',
      label: 'Home',
      address: 'Rua da Rosa 44, Bairro Alto',
      latitude: 38.7128,
      longitude: -9.1456,
    },
    {
      id: 'place_work',
      label: 'Work',
      address: 'Avenida da Liberdade 110, Avenidas Novas',
      latitude: 38.7223,
      longitude: -9.1443,
    },
  ],
  createdAt: '2024-11-02T10:12:00.000Z',
};

/**
 * The first date from `offsetDays` onwards on which the venue actually serves
 * this time.
 *
 * A fixed offset lands on a different weekday depending on the day you install,
 * so "two days from now at 7:30" quietly becomes a confirmed booking on the
 * night the restaurant is closed — a seeded demo contradicting its own
 * restaurant page. Past bookings are left on their fixed offsets: hours change,
 * and a completed dinner on a night the venue no longer opens is history rather
 * than a contradiction.
 */
function sittingOn(restaurantId: string, offsetDays: number, time: string): string {
  const restaurant = restaurantById.get(restaurantId);
  const fallback = addDaysToKey(todayKey(), offsetDays);
  if (!restaurant) return fallback;

  for (let i = 0; i < 14; i += 1) {
    const key = addDaysToKey(todayKey(), offsetDays + i);
    const day = generateAvailability(restaurant, key, 2);
    if (!day.closedReason && day.slots.some((slot) => slot.time === time)) return key;
  }
  return fallback;
}

export function seedReservations(): Reservation[] {
  const today = todayKey();
  const iso = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 86_400_000).toISOString();

  return [
    {
      id: 'rsv_grano_upcoming',
      code: 'K7RD24',
      restaurantId: 'rst_grano',
      date: sittingOn('rst_grano', 2, '19:30'),
      time: '19:30',
      partySize: 2,
      seating: 'window',
      occasion: 'anniversary',
      notes: 'Anniversary dinner — a quiet table would be lovely.',
      status: 'confirmed',
      createdAt: iso(-6),
      updatedAt: iso(-6),
      venueMessage: 'We have you at table 4 by the window. See you Thursday.',
    },
    {
      id: 'rsv_pombal_upcoming',
      code: 'M2XQ81',
      restaurantId: 'rst_pombal',
      date: sittingOn('rst_pombal', 6, '10:00'),
      time: '10:00',
      partySize: 3,
      seating: 'outdoor',
      occasion: 'none',
      notes: '',
      status: 'pending',
      createdAt: iso(-1),
      updatedAt: iso(-1),
    },
    {
      // Seeded mid-queue rather than at the back, so the join → offer → accept
      // loop plays out within a minute of first launch instead of being a state
      // you have to book your way into to ever see. `joinedAt` is stamped at
      // seed time, which is the first read of a fresh install.
      id: 'rsv_tamarind_waitlist',
      restaurantId: 'rst_tamarind',
      date: sittingOn('rst_tamarind', 3, '20:30'),
      time: '20:30',
      partySize: 2,
      seating: 'any',
      occasion: 'date-night',
      notes: '',
      status: 'waitlisted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      waitlist: { position: 2, joinedAt: new Date().toISOString() },
    },
    {
      id: 'rsv_bluefig_past',
      code: 'H9TB53',
      restaurantId: 'rst_bluefig',
      date: addDaysToKey(today, -12),
      time: '20:00',
      partySize: 4,
      seating: 'indoor',
      occasion: 'birthday',
      notes: 'Birthday for four — happy for the lamb to be a surprise.',
      status: 'completed',
      createdAt: iso(-20),
      updatedAt: iso(-12),
    },
    {
      id: 'rsv_kissaten_past',
      code: 'P4LW76',
      restaurantId: 'rst_kissaten',
      date: addDaysToKey(today, -34),
      time: '19:30',
      partySize: 2,
      seating: 'bar',
      occasion: 'date-night',
      notes: 'Shellfish allergy at the table.',
      status: 'completed',
      createdAt: iso(-60),
      updatedAt: iso(-34),
      reviewId: 'rev_authored_3',
    },
    {
      // The only way `no-show` can exist. It is a venue's judgement, and the
      // client has no business inventing one — so without this seed the status
      // has a badge, a tone, an icon and copy that nothing could ever render.
      id: 'rsv_yuan_noshow',
      code: 'T8FK40',
      restaurantId: 'rst_yuan',
      date: addDaysToKey(today, -21),
      time: '20:00',
      partySize: 2,
      seating: 'any',
      occasion: 'none',
      notes: '',
      status: 'no-show',
      createdAt: iso(-28),
      updatedAt: iso(-21),
      venueMessage: 'The table was held for 20 minutes. Please call us if something came up.',
    },
    {
      id: 'rsv_ember_cancelled',
      code: 'C3VN19',
      restaurantId: 'rst_ember',
      date: addDaysToKey(today, -5),
      time: '21:00',
      partySize: 6,
      seating: 'any',
      occasion: 'celebration',
      notes: '',
      status: 'cancelled',
      createdAt: iso(-15),
      updatedAt: iso(-7),
    },
  ];
}

export function seedNotifications(): AppNotification[] {
  const iso = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3_600_000).toISOString();

  return [
    {
      id: 'ntf_1',
      kind: 'upcoming-reservation',
      title: 'Osteria Grano in two days',
      body: 'Thursday at 7:30 PM for 2, window table. Tap to see your booking code.',
      createdAt: iso(3),
      readAt: null,
      href: '/reservation/rsv_grano_upcoming',
      restaurantId: 'rst_grano',
      reservationId: 'rsv_grano_upcoming',
    },
    {
      id: 'ntf_2',
      kind: 'reservation-confirmed',
      title: 'Café Pombal is holding your table',
      body: 'Your request for 3 at 10:00 AM is with the restaurant. They usually reply within an hour.',
      createdAt: iso(19),
      readAt: null,
      href: '/reservation/rsv_pombal_upcoming',
      restaurantId: 'rst_pombal',
      reservationId: 'rsv_pombal_upcoming',
    },
    {
      id: 'ntf_3',
      kind: 'restaurant-offer',
      title: 'Maíz is pouring a new mezcal flight',
      body: 'Three producers from Santiago Matatlán, on the list until the end of the month.',
      createdAt: iso(30),
      readAt: iso(28),
      href: '/restaurant/rst_maiz',
      restaurantId: 'rst_maiz',
    },
    {
      id: 'ntf_4',
      kind: 'rating-request',
      title: 'How was Blue Fig?',
      body: 'You dined there last week. A rating helps the next person decide.',
      createdAt: iso(72),
      readAt: iso(70),
      href: '/reservation/rsv_bluefig_past',
      restaurantId: 'rst_bluefig',
      reservationId: 'rsv_bluefig_past',
    },
    {
      id: 'ntf_5',
      kind: 'reservation-cancelled',
      title: 'Ember & Rye booking cancelled',
      body: 'Your table for 6 on the 8th was cancelled. Nothing was charged.',
      createdAt: iso(168),
      readAt: iso(160),
      href: '/reservation/rsv_ember_cancelled',
      restaurantId: 'rst_ember',
      reservationId: 'rsv_ember_cancelled',
    },
  ];
}

/** Restaurants a fresh install starts with saved, so Favourites is never empty. */
export const seedFavoriteIds = ['rst_grano', 'rst_pombal', 'rst_maiz'];
