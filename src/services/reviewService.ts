import type { RatingBreakdown, Review } from '@/types';
import type { ReviewService } from './contracts';

import { mockReviews } from '@/mock/reviews';
import { localId } from '@/utils/id';
import { storage, storageKeys } from '@/utils/storage';
import { paginate, simulate } from './latency';

/** User-written reviews live on top of the mock set rather than replacing it. */
async function readUserReviews(): Promise<Review[]> {
  return storage.get<Review[]>(storageKeys.reviews, []);
}

export const reviewService: ReviewService = {
  async getReviews(restaurantId) {
    return simulate(async () => {
      const mine = await readUserReviews();
      const all = [...mine, ...mockReviews]
        .filter((r) => r.restaurantId === restaurantId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return paginate(all, null, 20);
    }, 220);
  },

  async getBreakdown(restaurantId) {
    return simulate(async () => {
      const mine = await readUserReviews();
      const all = [...mine, ...mockReviews].filter((r) => r.restaurantId === restaurantId);
      const counts: RatingBreakdown['counts'] = [0, 0, 0, 0, 0];
      for (const review of all) {
        const index = Math.min(4, Math.max(0, Math.round(review.rating) - 1));
        counts[index] += 1;
      }
      const total = all.length;
      const average =
        total === 0 ? 0 : all.reduce((sum, r) => sum + r.rating, 0) / total;
      return { average: Number(average.toFixed(1)), total, counts };
    }, 200);
  },

  async createReview(input) {
    return simulate(async () => {
      const review: Review = {
        id: localId('rev'),
        restaurantId: input.restaurantId,
        authorName: 'You',
        authorInitials: 'YOU',
        rating: input.rating,
        createdAt: new Date().toISOString().slice(0, 10),
        body: input.body.trim(),
        highlights: input.highlights,
        verified: true,
      };
      const mine = await readUserReviews();
      await storage.set(storageKeys.reviews, [review, ...mine]);
      return review;
    }, 600);
  },
};
