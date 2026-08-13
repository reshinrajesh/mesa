export type Cuisine =
  | 'italian'
  | 'japanese'
  | 'indian'
  | 'french'
  | 'mexican'
  | 'thai'
  | 'mediterranean'
  | 'korean'
  | 'american'
  | 'chinese'
  | 'cafe'
  | 'bakery'
  | 'seafood'
  | 'vegetarian'
  | 'middle-eastern';

export type PriceTier = 1 | 2 | 3 | 4;

export type VenueKind = 'fine-dining' | 'casual-dining' | 'cafe' | 'bistro' | 'bar';

export type Amenity =
  | 'outdoor-seating'
  | 'indoor-seating'
  | 'vegetarian-friendly'
  | 'vegan-options'
  | 'pet-friendly'
  | 'family-friendly'
  | 'wheelchair-accessible'
  | 'wifi'
  | 'parking'
  | 'live-music'
  | 'private-dining'
  | 'bar-seating'
  | 'accepts-groups'
  | 'gluten-free-options';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** 0 = Sunday, matching `Date.prototype.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface OpeningHours {
  day: Weekday;
  /** Minutes from midnight, e.g. 660 = 11:00. `null` on both means closed. */
  opensAt: number | null;
  closesAt: number | null;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  tags: ('vegetarian' | 'vegan' | 'gluten-free' | 'spicy' | 'signature')[];
  imageUrl?: string;
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface Menu {
  restaurantId: string;
  currency: string;
  sections: MenuSection[];
}

export interface Restaurant {
  id: string;
  name: string;
  /** One line, used under the name on cards. Never truncated mid-word. */
  tagline: string;
  about: string;
  cuisines: Cuisine[];
  kind: VenueKind;
  priceTier: PriceTier;
  currency: string;
  rating: number;
  reviewCount: number;
  /** Cover first; the rest feed the gallery. */
  images: string[];
  neighbourhood: string;
  city: string;
  address: string;
  coordinates: Coordinates;
  phone: string;
  website?: string;
  hours: OpeningHours[];
  amenities: Amenity[];
  /** Used by the "New" rail and the badge on cards. ISO date. */
  openedAt: string;
  /** Drives the "Trending" rail. 0-100, mock signal for future analytics. */
  popularityScore: number;
  /** Cheap heuristic for occasion matching. */
  goodFor: ('date-night' | 'birthday' | 'business' | 'friends' | 'family' | 'solo')[];
  /** Largest party the venue accepts online. */
  maxPartySize: number;
  /**
   * Whether the venue keeps a waitlist for full slots. Walk-in rooms — the
   * bakery, the café, the mezcal bar — do not, and saying so is better than
   * offering a queue that nobody at the venue is actually reading.
   */
  acceptsWaitlist: boolean;
}

/** A restaurant plus everything that depends on the current user or device. */
export interface RestaurantWithContext extends Restaurant {
  /** Kilometres from the active location. `null` when location is unknown. */
  distanceKm: number | null;
  isOpenNow: boolean;
  /** Minutes until it opens or closes, for the "Closes in 40 min" line. */
  minutesUntilStatusChange: number | null;
  isFavorite: boolean;
  /** Next few bookable times today, for the card's slot strip. */
  nextSlots: string[];
  /**
   * Nothing left to book tonight, but the venue keeps a waitlist. Only ever
   * true when `nextSlots` is empty — a card has one line for this, and a free
   * table always outranks a place in a queue.
   */
  waitlistTonight: boolean;
}
