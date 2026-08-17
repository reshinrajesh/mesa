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

export interface NotificationPreferences {
  reservationUpdates: boolean;
  reminders: boolean;
  offers: boolean;
  /** Hours before the booking to fire the local reminder. */
  reminderLeadHours: number;
}
