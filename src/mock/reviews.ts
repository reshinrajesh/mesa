import type { Review } from '@/types';

import { avatarPhoto } from './images';
import { mockRestaurants } from './restaurants';
import { seededUnit } from '@/utils/id';

/**
 * Handwritten reviews for the venues a user is most likely to open, plus a
 * deterministic generator so every restaurant has a populated review section.
 * Generated reviews are seeded from the restaurant id, so they never reshuffle
 * between launches.
 */

const authored: Omit<Review, 'id'>[] = [
  {
    restaurantId: 'rst_grano',
    authorName: 'Marta Coelho',
    authorInitials: 'MC',
    authorAvatarUrl: avatarPhoto[0],
    rating: 5,
    createdAt: '2026-07-28',
    body: 'The tagliatelle is the best I have had outside Bologna, and I say that having eaten in Bologna twice this year. Booked the 7pm slot on a Tuesday and had the room half to ourselves. They let us move to the window without being asked.',
    highlights: ['Fresh pasta', 'Quiet early', 'Attentive floor'],
    verified: true,
  },
  {
    restaurantId: 'rst_grano',
    authorName: 'Daniel Okafor',
    authorInitials: 'DO',
    rating: 4,
    createdAt: '2026-07-11',
    body: 'Excellent food, genuinely tight room. Twelve tables means twelve tables — if you are tall, ask for the end of the banquette. The vitello tonnato is the sleeper order.',
    highlights: ['Vitello tonnato', 'Small room'],
    verified: true,
  },
  {
    restaurantId: 'rst_grano',
    authorName: 'Sofia Reis',
    authorInitials: 'SR',
    authorAvatarUrl: avatarPhoto[2],
    rating: 5,
    createdAt: '2026-06-02',
    body: 'Told them it was my mother’s birthday in the booking notes and they brought out an affogato with a candle without making a scene about it. Exactly the right amount of fuss.',
    highlights: ['Good with occasions', 'Wine by the glass'],
    verified: true,
  },
  {
    restaurantId: 'rst_kissaten',
    authorName: 'Henrique Barros',
    authorInitials: 'HB',
    authorAvatarUrl: avatarPhoto[3],
    rating: 5,
    createdAt: '2026-08-01',
    body: 'Twenty courses over two and a half hours and not one of them felt like filler. The chef works in near silence and explains each piece in about eight words. Worth the three-week wait and worth the price.',
    highlights: ['Omakase', 'Counter seats', 'Sake pairing'],
    verified: true,
  },
  {
    restaurantId: 'rst_kissaten',
    authorName: 'Ana Lindqvist',
    authorInitials: 'AL',
    rating: 4,
    createdAt: '2026-05-19',
    body: 'Extraordinary fish. One warning: it really is one sitting, so arriving ten minutes late means you eat the first three courses in a hurry. Get there early and have a drink next door.',
    highlights: ['Be punctual', 'Fish quality'],
    verified: true,
  },
  {
    restaurantId: 'rst_pombal',
    authorName: 'Tiago Ferreira',
    authorInitials: 'TF',
    authorAvatarUrl: avatarPhoto[1],
    rating: 5,
    createdAt: '2026-08-04',
    body: 'I have worked from here two mornings a week for a year. Coffee is consistently excellent, the tiles are worth the trip on their own, and they are honest that they would rather you closed the laptop after twelve. Fair enough.',
    highlights: ['Filter coffee', 'Morning work', 'Original tiles'],
    verified: false,
  },
  {
    restaurantId: 'rst_pombal',
    authorName: 'Béatrice Morel',
    authorInitials: 'BM',
    rating: 4,
    createdAt: '2026-06-22',
    body: 'The natas are out at nine and worth setting an alarm for. Gets very busy between eleven and one — go early or go at three.',
    highlights: ['Pastel de nata', 'Busy midday'],
    verified: true,
  },
  {
    restaurantId: 'rst_bluefig',
    authorName: 'Yusuf Demir',
    authorInitials: 'YD',
    authorAvatarUrl: avatarPhoto[4],
    rating: 5,
    createdAt: '2026-07-15',
    body: 'Ordered the lamb shoulder first as instructed and it arrived exactly when they said it would. Four plates between two was too much food and I regret nothing. Cauliflower holds its own against the lamb.',
    highlights: ['Lamb shoulder', 'Charcoal grill', 'Good for sharing'],
    verified: true,
  },
  {
    restaurantId: 'rst_lumen',
    authorName: 'Clara Nogueira',
    authorInitials: 'CN',
    authorAvatarUrl: avatarPhoto[5],
    rating: 5,
    createdAt: '2026-07-02',
    body: 'The non-alcoholic pairing is the reason I am writing this. I was driving and expected to be handed sparkling water for three hours; instead I got six drinks that were genuinely built for the courses. Whoever designed it should be paid more.',
    highlights: ['Non-alcoholic pairing', 'River view', 'Service'],
    verified: true,
  },
  {
    restaurantId: 'rst_maiz',
    authorName: 'Rita Salgado',
    authorInitials: 'RS',
    rating: 5,
    createdAt: '2026-08-06',
    body: 'You can taste the difference the fresh masa makes the second you pick up the first taco. Bartender talked me out of the €18 mezcal and into the €9 one because it suited what I said I liked. That is how you get repeat customers.',
    highlights: ['Fresh tortillas', 'Mezcal advice', 'Late kitchen'],
    verified: true,
  },
  {
    restaurantId: 'rst_forno',
    authorName: 'Miguel Antunes',
    authorInitials: 'MA',
    rating: 5,
    createdAt: '2026-07-24',
    body: 'The queue looks alarming and moves in about six minutes. Sourdough is genuinely 48 hours and genuinely gone by one. Canelés at three are the move if you are not a morning person.',
    highlights: ['Sourdough', 'Canelés', 'Queue moves fast'],
    verified: false,
  },
  {
    restaurantId: 'rst_sompong',
    authorName: 'Priya Menon',
    authorInitials: 'PM',
    rating: 4,
    createdAt: '2026-06-30',
    body: 'Asked for Thai spicy and got Thai spicy, which was my own fault and entirely the correct outcome. Khao soi is the best in the city. The room is plain and the food is not.',
    highlights: ['Khao soi', 'Actually spicy'],
    verified: true,
  },
  {
    restaurantId: 'rst_hortelao',
    authorName: 'Jonas Weber',
    authorInitials: 'JW',
    rating: 5,
    createdAt: '2026-08-08',
    body: 'A vegetable restaurant that does not spend the whole menu apologising for the absence of meat. The charred hispi with the fermented chilli butter would be the best dish on most menus in this city.',
    highlights: ['Charred vegetables', 'No imitation meat', 'Terrace'],
    verified: true,
  },
];

const GENERIC_BODIES = [
  'Booked the early slot on a weeknight and it was the right call — relaxed room, unhurried service, and we were out by nine.',
  'Consistently good rather than showy. We have been three times now and it has been the same standard each visit.',
  'The staff were straight with us about what was and was not good that evening, which I always appreciate more than a hard sell.',
  'Portions are generous and the pricing is honest for the neighbourhood. It filled up completely by half eight.',
  'Went for a birthday and they handled it well without turning it into a performance. Would book again.',
  'Food arrived quickly and hot. The room gets loud once it fills, so book early if you want a conversation.',
];

const GENERIC_HIGHLIGHTS = [
  ['Good value', 'Quick service'],
  ['Neighbourhood spot', 'Friendly staff'],
  ['Book early', 'Lively room'],
  ['Consistent', 'Fair pricing'],
];

const GENERIC_AUTHORS = [
  ['Inês Cardoso', 'IC'],
  ['Peter Lindgren', 'PL'],
  ['Nuno Batista', 'NB'],
  ['Amelia Grant', 'AG'],
  ['Rui Moreira', 'RM'],
  ['Hana Suzuki', 'HS'],
];

function generateFor(restaurantId: string, rating: number): Review[] {
  const base = seededUnit(restaurantId);
  return Array.from({ length: 3 }, (_, index) => {
    const pick = Math.floor((base * 1000 + index * 137) % GENERIC_BODIES.length);
    const author = GENERIC_AUTHORS[(pick + index) % GENERIC_AUTHORS.length];
    const drift = index === 0 ? 0 : index === 1 ? -1 : 0;
    return {
      id: `${restaurantId}_rev_gen_${index}`,
      restaurantId,
      authorName: author[0],
      authorInitials: author[1],
      rating: Math.max(3, Math.min(5, Math.round(rating) + drift)),
      createdAt: `2026-0${(index % 6) + 1}-1${index + 2}`,
      body: GENERIC_BODIES[pick],
      highlights: GENERIC_HIGHLIGHTS[pick % GENERIC_HIGHLIGHTS.length],
      verified: index % 2 === 0,
    };
  });
}

export const mockReviews: Review[] = [
  ...authored.map((review, index) => ({ ...review, id: `rev_authored_${index}` })),
  ...mockRestaurants.flatMap((restaurant) => generateFor(restaurant.id, restaurant.rating)),
];
