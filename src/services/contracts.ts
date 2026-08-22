import type {
  AppNotification,
  AuthTokens,
  AvailabilityDay,
  Bill,
  CartLine,
  CreateReservationInput,
  CreateReviewInput,
  JoinWaitlistInput,
  Menu,
  NotificationPreferences,
  Order,
  Page,
  PaymentAuthorization,
  PaymentMethod,
  PaymentOrder,
  RatingBreakdown,
  Reservation,
  Restaurant,
  RestaurantWithContext,
  Review,
  SearchRestaurantsParams,
  UpdateReservationInput,
  User,
} from '@/types';

/**
 * Service contracts.
 *
 * These interfaces are the seam between the UI and the backend. The UI depends
 * on this file; it never depends on `restaurantService.mock.ts` or on a future
 * `restaurantService.http.ts`. Swapping implementations is a change to
 * `services/index.ts` and nothing else.
 *
 * Everything that returns a list returns a `Page<T>` even where the mock has
 * only one page, so infinite scroll can be added later without touching the
 * call sites.
 */

export interface RestaurantCollections {
  popularNearYou: RestaurantWithContext[];
  recommended: RestaurantWithContext[];
  trendingCafes: RestaurantWithContext[];
  topRated: RestaurantWithContext[];
  newlyOpened: RestaurantWithContext[];
  /** Venues with a table free in the next two hours. Drives "Book tonight". */
  availableTonight: RestaurantWithContext[];
}

export interface RestaurantService {
  getRestaurants(params: SearchRestaurantsParams): Promise<Page<RestaurantWithContext>>;
  getRestaurantById(id: string): Promise<RestaurantWithContext>;
  searchRestaurants(query: string, params?: SearchRestaurantsParams): Promise<Page<RestaurantWithContext>>;
  /** Lightweight strings for the search screen's suggestion list. */
  getSuggestions(query: string): Promise<{ label: string; kind: 'restaurant' | 'cuisine' | 'place'; value: string }[]>;
  getCollections(origin: { latitude: number; longitude: number } | null): Promise<RestaurantCollections>;
  getMenu(restaurantId: string): Promise<Menu>;
  getAvailability(restaurantId: string, date: string, guests: number): Promise<AvailabilityDay>;
  /** Raw records, for map pins and offline caches. */
  getAllForMap(): Promise<Restaurant[]>;
}

export interface ReservationService {
  getReservations(): Promise<Page<Reservation>>;
  getReservationById(id: string): Promise<Reservation>;
  createReservation(input: CreateReservationInput): Promise<Reservation>;
  /**
   * Start a table for somebody standing in the restaurant.
   *
   * Not `createReservation` with today's date: booking rules exist to protect
   * a table nobody is sitting at yet, and every one of them is wrong for a
   * guest who is already there. No lead time, no two-hour lock, no slot to
   * hold — the venue has sat them down, and the app's job is to give them
   * something to order against.
   */
  startWalkIn(restaurantId: string, partySize: number): Promise<Reservation>;
  updateReservation(input: UpdateReservationInput): Promise<Reservation>;
  /**
   * Also the way to leave a waitlist: an entry is a reservation that has not
   * become a table yet, and giving up a place in a queue is the same verb.
   */
  cancelReservation(id: string, reason?: string): Promise<Reservation>;
  /** Joins the queue behind a full slot. Returns a `waitlisted` reservation. */
  joinWaitlist(input: JoinWaitlistInput): Promise<Reservation>;
  /** Takes the table being held. Throws `waitlist-offer-expired` once the hold lapses. */
  acceptWaitlistOffer(id: string): Promise<Reservation>;
}

export interface AuthService {
  /** Restores a session from storage on cold start. */
  restore(): Promise<{ user: User | null; kind: 'authenticated' | 'guest' | 'anonymous' }>;
  signIn(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }>;
  /**
   * Register with a mobile number or an email address. Either will do.
   *
   * Both are optional in the type and **at least one is required in fact**,
   * which the server enforces and the sign-up form states with a switch. The
   * type cannot say "one of these two" without splitting the method in half,
   * and a caller passing neither gets a field error rather than a crash.
   *
   * An account registered by phone alone has no address to be reached at, so
   * the server derives an unroutable internal one: Frappe names users by
   * email, and that is its constraint rather than the guest's problem.
   */
  signUp(input: {
    name: string;
    password: string;
    phone?: string;
    email?: string;
  }): Promise<{ user: User; tokens: AuthTokens }>;
  requestPasswordReset(email: string): Promise<{ sentTo: string }>;
  /** Returns the channel the code went to, for the "sent to ••• ••• 048" line. */
  requestOtp(destination: string): Promise<{ sentTo: string; expiresInSeconds: number }>;
  verifyOtp(destination: string, code: string): Promise<{ user: User; tokens: AuthTokens }>;
  /** The Google/Apple buttons route here; the mock returns a demo identity. */
  signInWithProvider(provider: 'google' | 'apple'): Promise<{ user: User; tokens: AuthTokens }>;
  continueAsGuest(): Promise<void>;
  signOut(): Promise<void>;
  updateProfile(patch: Partial<User>): Promise<User>;
}

export interface FavoriteService {
  getFavoriteIds(): Promise<string[]>;
  addFavorite(restaurantId: string): Promise<void>;
  removeFavorite(restaurantId: string): Promise<void>;
}

export interface NotificationService {
  getNotifications(): Promise<Page<AppNotification>>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  /** Removes one entry. The only route by which an *unread* entry leaves. */
  dismiss(id: string): Promise<void>;
  /** Removes every read entry. Returns how many went, for the toast. */
  clearRead(): Promise<number>;
  /** Puts a dismissed entry back, in its original position. Undo depends on it. */
  restore(notification: AppNotification): Promise<void>;
  getPreferences(): Promise<NotificationPreferences>;
  setPreferences(next: NotificationPreferences): Promise<NotificationPreferences>;
  /** Requests OS permission and returns whether it was granted. */
  requestPermission(): Promise<boolean>;
  /** Schedules the local reminder for a booking. No-op when reminders are off. */
  scheduleReservationReminder(reservation: Reservation, restaurantName: string): Promise<void>;
  cancelReservationReminder(reservationId: string): Promise<void>;
  /**
   * Files an inbox entry the client generated itself. A backend would push
   * these; until one exists the client is the only thing that knows a waitlist
   * was joined, and an inbox that misses those events is worse than none.
   */
  record(entry: Omit<AppNotification, 'id' | 'createdAt' | 'readAt'>): Promise<AppNotification>;
  /** Local alert for the moment a queued table is predicted to come free. */
  scheduleWaitlistAlert(reservation: Reservation, restaurantName: string, fireAt: Date): Promise<void>;
  cancelWaitlistAlert(reservationId: string): Promise<void>;
  /** Registers for remote push. A no-op until a push backend exists. */
  registerForPush(): Promise<string | null>;
}

/**
 * The bill at the table, and moving money for it.
 *
 * Shaped like Razorpay's flow rather than like the mock, because the mock is
 * the thing that gets thrown away: the server mints an order with the amount
 * fixed in it, the gateway hands back a signed payment, and the server
 * verifies that signature before a bill is marked paid. A client that could
 * report its own success is a client that can pay one rupee for a three
 * thousand rupee dinner.
 *
 * `checkout` is the only method that stands in for a screen the app does not
 * own. In the mock it resolves after a beat; against a real gateway it is
 * where the Razorpay SDK takes over and comes back with a payment id.
 */
export interface PaymentService {
  /** The bill for a booking, or null when the venue has not raised one. */
  getBill(reservationId: string): Promise<Bill | null>;
  /**
   * Mint an order for this bill including the tip the guest chose. The amount
   * is the server's arithmetic, not the client's.
   */
  createOrder(billId: string, tip: number): Promise<PaymentOrder>;
  /** Hand the guest to the gateway. Resolves with what the gateway signed. */
  checkout(order: PaymentOrder, method: PaymentMethod): Promise<PaymentAuthorization>;
  /** Server-side verification. Returns the settled bill, or throws. */
  confirmPayment(authorization: PaymentAuthorization): Promise<Bill>;
}

/**
 * Ordering from the table.
 *
 * Separate from `PaymentService` on purpose, even though the rounds become the
 * bill: the kitchen and the till are two systems in a real restaurant, and the
 * day this points at a POS it will point at a different one from the payments.
 *
 * There is no `updateOrder`. A round that has been sent is the kitchen's, and
 * the only thing the guest can do to it is withdraw it before it is taken.
 */
export interface OrderService {
  /** Every round this table has sent, oldest first. */
  getOrders(reservationId: string): Promise<Order[]>;
  /** Send a round. The server prices it from the menu, not from the client. */
  placeOrder(reservationId: string, lines: CartLine[]): Promise<Order>;
  /** Withdraw a round the kitchen has not taken yet. */
  withdrawOrder(orderId: string): Promise<Order>;
}

export interface ReviewService {
  getReviews(restaurantId: string): Promise<Page<Review>>;
  getBreakdown(restaurantId: string): Promise<RatingBreakdown>;
  createReview(input: CreateReviewInput): Promise<Review>;
}
