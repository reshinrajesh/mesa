import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ServiceState } from '@/types';

import { queryKeys } from '@/constants/queryKeys';
import { staffService } from '@/services';
import { toast } from '@/store/uiStore';
import { toAppError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

/**
 * Tonight's floor.
 *
 * Refetched on an interval, which almost nothing else in this app does: a
 * board is read by two or three people at once and the thing it is for is
 * knowing that somebody else has already seated table four. Everywhere else a
 * stale read costs a guest nothing; here it costs a party their table twice.
 */
export function useStaffBoard() {
  const client = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.staff.board(),
    queryFn: () => staffService.getBoard(),
    refetchInterval: 20_000,
  });

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: queryKeys.staff.all });
  };

  const move = useMutation({
    mutationFn: ({ id, state }: { id: string; state: ServiceState }) =>
      staffService.setServiceState(id, state),
    onSuccess: () => {
      haptics.selection();
      invalidate();
    },
    onError: (error) => {
      const app = toAppError(error);
      haptics.error();
      // The refusal is the useful part on a floor: it says what the other
      // person working the room already did.
      toast({ title: app.title, message: app.message, tone: 'danger' });
      invalidate();
    },
  });

  const advance = useMutation({
    mutationFn: ({ id, state }: { id: string; state: 'preparing' | 'served' }) =>
      staffService.advanceRound(id, state),
    onSuccess: () => {
      haptics.selection();
      invalidate();
    },
    onError: (error) => {
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    },
  });

  return {
    board: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? toAppError(query.error) : null,
    refetch: query.refetch,
    setState: move.mutate,
    isMoving: move.isPending,
    advanceRound: advance.mutate,
  };
}
