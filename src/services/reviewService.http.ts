import type { Page, RatingBreakdown, Review } from '@/types';
import type { ReviewService } from './contracts';

import { request } from './http';

/**
 * Reviews, server-side.
 *
 * Reads are unauthenticated on purpose, like the rest of the public catalogue:
 * browsing a restaurant's reviews signed out is the normal path through this
 * app, not a special case. Writing one is not — a review belongs to somebody,
 * and the bearer token identifies them, so `createReview` sends no author.
 *
 * The breakdown is its own endpoint rather than something the client counts
 * from the page it fetched. A page is twenty reviews; the histogram is over all
 * of them, and deriving it from what happened to be on screen would draw a
 * distribution that shifts as you scroll.
 */
export const reviewServiceHttp: ReviewService = {
  getReviews(restaurantId) {
    return request<Page<Review>>(`/restaurants/${encodeURIComponent(restaurantId)}/reviews`, {
      authenticated: false,
    });
  },

  getBreakdown(restaurantId) {
    return request<RatingBreakdown>(
      `/restaurants/${encodeURIComponent(restaurantId)}/reviews/breakdown`,
      { authenticated: false },
    );
  },

  createReview(input) {
    const { restaurantId, ...body } = input;
    return request<Review>(`/restaurants/${encodeURIComponent(restaurantId)}/reviews`, {
      method: 'POST',
      body,
    });
  },
};
