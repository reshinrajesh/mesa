import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateReviewInput } from '@/types';

import { queryKeys } from '@/constants/queryKeys';
import { reviewService } from '@/services';
import { haptics } from '@/utils/haptics';
import { toast } from '@/store/uiStore';
import { toAppError } from '@/utils/errors';

export function useReviews(restaurantId: string | undefined) {
  const list = useQuery({
    queryKey: queryKeys.reviews.forRestaurant(restaurantId ?? ''),
    queryFn: () => reviewService.getReviews(restaurantId!),
    enabled: Boolean(restaurantId),
    staleTime: 5 * 60 * 1000,
  });

  const breakdown = useQuery({
    queryKey: [...queryKeys.reviews.forRestaurant(restaurantId ?? ''), 'breakdown'],
    queryFn: () => reviewService.getBreakdown(restaurantId!),
    enabled: Boolean(restaurantId),
    staleTime: 5 * 60 * 1000,
  });

  return {
    reviews: list.data?.items ?? [],
    breakdown: breakdown.data,
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error,
    refetch: list.refetch,
  };
}

export function useCreateReview() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReviewInput) => reviewService.createReview(input),
    onSuccess: async (review) => {
      haptics.success();
      await client.invalidateQueries({
        queryKey: queryKeys.reviews.forRestaurant(review.restaurantId),
      });
      toast({ title: 'Thanks for the review', tone: 'positive' });
    },
    onError: (error) => {
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    },
  });
}
