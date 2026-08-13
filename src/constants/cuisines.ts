import type {
  Amenity,
  Cuisine,
  Occasion,
  PriceTier,
  SeatingPreference,
  VenueKind,
} from '@/types';

export interface Labelled<T extends string> {
  value: T;
  label: string;
  /** Ionicons glyph name. Every filter chip carries one so the row scans fast. */
  icon?: string;
}

export const CUISINES: Labelled<Cuisine>[] = [
  { value: 'italian', label: 'Italian', icon: 'pizza-outline' },
  { value: 'japanese', label: 'Japanese', icon: 'fish-outline' },
  { value: 'cafe', label: 'Café', icon: 'cafe-outline' },
  { value: 'indian', label: 'Indian', icon: 'flame-outline' },
  { value: 'french', label: 'French', icon: 'wine-outline' },
  { value: 'mexican', label: 'Mexican', icon: 'nutrition-outline' },
  { value: 'thai', label: 'Thai', icon: 'leaf-outline' },
  { value: 'mediterranean', label: 'Mediterranean', icon: 'sunny-outline' },
  { value: 'korean', label: 'Korean', icon: 'bonfire-outline' },
  { value: 'american', label: 'American', icon: 'fast-food-outline' },
  { value: 'chinese', label: 'Chinese', icon: 'restaurant-outline' },
  { value: 'bakery', label: 'Bakery', icon: 'ice-cream-outline' },
  { value: 'seafood', label: 'Seafood', icon: 'boat-outline' },
  { value: 'vegetarian', label: 'Vegetarian', icon: 'leaf-outline' },
  { value: 'middle-eastern', label: 'Middle Eastern', icon: 'moon-outline' },
];

export const CUISINE_LABEL: Record<Cuisine, string> = CUISINES.reduce(
  (acc, c) => ({ ...acc, [c.value]: c.label }),
  {} as Record<Cuisine, string>,
);

export const VENUE_KINDS: Labelled<VenueKind>[] = [
  { value: 'fine-dining', label: 'Fine dining' },
  { value: 'casual-dining', label: 'Casual dining' },
  { value: 'cafe', label: 'Café' },
  { value: 'bistro', label: 'Bistro' },
  { value: 'bar', label: 'Bar' },
];

export const VENUE_KIND_LABEL: Record<VenueKind, string> = VENUE_KINDS.reduce(
  (acc, k) => ({ ...acc, [k.value]: k.label }),
  {} as Record<VenueKind, string>,
);

export const AMENITIES: Labelled<Amenity>[] = [
  { value: 'outdoor-seating', label: 'Outdoor seating', icon: 'sunny-outline' },
  { value: 'indoor-seating', label: 'Indoor seating', icon: 'home-outline' },
  { value: 'vegetarian-friendly', label: 'Vegetarian friendly', icon: 'leaf-outline' },
  { value: 'vegan-options', label: 'Vegan options', icon: 'nutrition-outline' },
  { value: 'pet-friendly', label: 'Pet friendly', icon: 'paw-outline' },
  { value: 'family-friendly', label: 'Family friendly', icon: 'people-outline' },
  { value: 'wheelchair-accessible', label: 'Step-free access', icon: 'accessibility-outline' },
  { value: 'wifi', label: 'Wi-Fi', icon: 'wifi-outline' },
  { value: 'parking', label: 'Parking', icon: 'car-outline' },
  { value: 'live-music', label: 'Live music', icon: 'musical-notes-outline' },
  { value: 'private-dining', label: 'Private dining', icon: 'lock-closed-outline' },
  { value: 'bar-seating', label: 'Bar seating', icon: 'beer-outline' },
  { value: 'accepts-groups', label: 'Large groups', icon: 'people-circle-outline' },
  { value: 'gluten-free-options', label: 'Gluten-free options', icon: 'medical-outline' },
];

export const AMENITY_LABEL: Record<Amenity, string> = AMENITIES.reduce(
  (acc, a) => ({ ...acc, [a.value]: a.label }),
  {} as Record<Amenity, string>,
);

export const AMENITY_ICON: Record<Amenity, string> = AMENITIES.reduce(
  (acc, a) => ({ ...acc, [a.value]: a.icon ?? 'ellipse-outline' }),
  {} as Record<Amenity, string>,
);

export const PRICE_TIERS: { value: PriceTier; label: string; hint: string }[] = [
  { value: 1, label: '$', hint: 'Under $15 a head' },
  { value: 2, label: '$$', hint: '$15 – $35 a head' },
  { value: 3, label: '$$$', hint: '$35 – $70 a head' },
  { value: 4, label: '$$$$', hint: '$70 and up' },
];

export const SEATING_OPTIONS: {
  value: SeatingPreference;
  label: string;
  icon: string;
  hint: string;
}[] = [
  { value: 'any', label: 'Any available', icon: 'shuffle-outline', hint: 'Best chance of a table' },
  { value: 'indoor', label: 'Indoor', icon: 'home-outline', hint: 'Main dining room' },
  { value: 'outdoor', label: 'Outdoor', icon: 'sunny-outline', hint: 'Terrace or patio' },
  { value: 'window', label: 'Window', icon: 'square-outline', hint: 'Subject to availability' },
  { value: 'bar', label: 'Bar', icon: 'beer-outline', hint: 'Counter seating, walk-in feel' },
  { value: 'private', label: 'Private', icon: 'lock-closed-outline', hint: 'Separate room, 6+' },
];

export const SEATING_LABEL: Record<SeatingPreference, string> = SEATING_OPTIONS.reduce(
  (acc, s) => ({ ...acc, [s.value]: s.label }),
  {} as Record<SeatingPreference, string>,
);

export const OCCASIONS: { value: Occasion; label: string; icon: string }[] = [
  { value: 'none', label: 'No occasion', icon: 'remove-outline' },
  { value: 'birthday', label: 'Birthday', icon: 'gift-outline' },
  { value: 'anniversary', label: 'Anniversary', icon: 'heart-outline' },
  { value: 'date-night', label: 'Date night', icon: 'wine-outline' },
  { value: 'business', label: 'Business', icon: 'briefcase-outline' },
  { value: 'celebration', label: 'Celebration', icon: 'sparkles-outline' },
];

export const OCCASION_LABEL: Record<Occasion, string> = OCCASIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<Occasion, string>,
);

/** Tappable suggestions under the notes field, so nobody faces a blank box. */
export const NOTE_SUGGESTIONS = [
  'Celebrating a birthday',
  'Anniversary dinner',
  'High chair needed',
  'Step-free access needed',
  'Quiet table if possible',
  'Nut allergy at the table',
  'Running 10 minutes late is likely',
];
