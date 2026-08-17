export type NotificationKind =
  | 'reservation-confirmed'
  | 'reservation-reminder'
  | 'reservation-modified'
  | 'reservation-cancelled'
  | 'upcoming-reservation'
  | 'rating-request'
  | 'restaurant-offer'
  | 'waitlist-joined'
  | 'waitlist-offer';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
  readAt: string | null;
  /** In-app route to open on tap, e.g. "/reservation/rsv_01". */
  href?: string;
  restaurantId?: string;
  reservationId?: string;
}

/**
 * Every field here gates something the app actually does.
 *
 * `offers` used to sit alongside these — a switch in Settings, written to
 * storage, read by nothing. Offers arrive from a restaurant through a server,
 * and there is no server, so the only honest thing the client could do with the
 * preference was store it. It follows the same rule as photo upload: absent
 * rather than present-and-dead, and it comes back the day something can honour
 * it. A domain check now asserts that each remaining switch changes what the
 * app files, so the next dead one fails the suite rather than shipping.
 */
export interface NotificationPreferences {
  reservationUpdates: boolean;
  reminders: boolean;
  /** Hours before the booking to fire the local reminder. */
  reminderLeadHours: number;
}
