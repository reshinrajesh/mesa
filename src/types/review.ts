export interface Review {
  id: string;
  restaurantId: string;
  authorName: string;
  authorInitials: string;
  authorAvatarUrl?: string;
  rating: number;
  /** ISO date. */
  createdAt: string;
  body: string;
  /** Short tags the venue is repeatedly praised for. */
  highlights: string[];
  /** True when the review came from a completed Mesa reservation. */
  verified: boolean;
}

export interface CreateReviewInput {
  restaurantId: string;
  reservationId: string;
  rating: number;
  body: string;
  highlights: string[];
}

export interface RatingBreakdown {
  average: number;
  total: number;
  /** Index 0 = one star. */
  counts: [number, number, number, number, number];
}
