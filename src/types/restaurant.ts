/**
 * What a venue cooks, at the grain a diner in Bengaluru would ask for it.
 *
 * `indian` on its own is the label nobody searches: it covers a tiffin room
 * and a Mughlai grill equally badly, and a filter that returns both teaches
 * people the filter does not work. So the regional ones carry the weight and
 * `indian` stays for the places that genuinely span several.
 */
export type Cuisine =
  | 'south-indian'
  | 'north-indian'
  | 'andhra'
  | 'kerala'
  | 'coastal'
  | 'biryani'
  | 'chaat'
  | 'indian'
  | 'chinese'
  | 'continental'
  | 'italian'
  | 'japanese'
  | 'american'
  | 'cafe'
  | 'bakery'
  | 'seafood'
  | 'vegetarian';

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

/**
 * What a venue is offering to get you through the door.
 *
 * `percent` is the only kind the bill can actually apply. The others are real
 * offers a venue runs and the app can advertise, but nothing in Mesa settles a
 * free drink or a bank cashback — so they are drawn and never arithmetic'd,
 * and the type keeps them apart rather than letting a screen guess.
 */
export type OfferKind =
  /** A percentage off the food bill, applied when it is paid. */
  | 'percent'
  /** "1+1 on cocktails". Honoured at the table, not in the total. */
  | 'freebie'
  /** "10% back with HDFC cards". The bank's, not the venue's. */
  | 'bank';

export interface Offer {
  id: string;
  kind: OfferKind;
  /** The line on the card. Short: it sits in a badge. */
  label: string;
  /** The detail behind it, shown on the venue page. */
  terms?: string;
  /** Present exactly when `kind === 'percent'`. Whole percent, 1–100. */
  percent?: number;
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
  /**
   * The typical spend for two, in whole rupees.
   *
   * A price tier says how expensive a place is relative to others; this says
   * what the evening costs, which is the number people compare. It is a label
   * and not money moving, so it is rupees rather than the paise a bill uses.
   */
  costForTwo: number;
  /** What the venue is running. Empty is the ordinary case. */
  offers: Offer[];
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
