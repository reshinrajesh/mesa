import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { Bill, PaymentMethod } from '@/types';

import { queryKeys } from '@/constants/queryKeys';
import { assertPayable } from '@/features/payments/bill';
import { paymentService } from '@/services';
import { toast } from '@/store/uiStore';
import { toAppError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

/**
 * The bill for a booking, and paying it.
 *
 * Three steps rather than one, because the middle one is somebody else's
 * screen. Between `createOrder` and `confirmPayment` the guest is in their
 * bank's app or a card sheet, and this app cannot know what is happening —
 * which is why `stage` exists and why nothing here treats a slow gateway as a
 * failure.
 *
 * The bill is never optimistically marked paid. Everywhere else in Mesa an
 * optimistic update is the right call — a favourite that flickers is worth the
 * speed. A bill that shows "Paid" before the server has verified the signature
 * is the app telling somebody their money has moved when it may not have.
 */
export type PayStage = 'idle' | 'ordering' | 'at-gateway' | 'verifying';

export function useBill(reservationId: string | undefined) {
  const client = useQueryClient();
  const [stage, setStage] = useState<PayStage>('idle');

  const query = useQuery({
    queryKey: queryKeys.bills.forReservation(reservationId ?? 'none'),
    queryFn: () => paymentService.getBill(reservationId as string),
    enabled: Boolean(reservationId),
  });

  const pay = useMutation({
    mutationFn: async ({ tip, method }: { tip: number; method: PaymentMethod }): Promise<Bill> => {
      const bill = query.data;
      if (!bill) throw toAppError(new Error('no bill to pay'));
      // Refused here as well as by the server: the guest should not be sent to
      // a gateway to be told there was nothing to pay.
      assertPayable(bill);

      setStage('ordering');
      const order = await paymentService.createOrder(bill.id, tip);

      setStage('at-gateway');
      const authorization = await paymentService.checkout(order, method);

      setStage('verifying');
      return paymentService.confirmPayment(authorization);
    },
    onSuccess: (settled) => {
      client.setQueryData(queryKeys.bills.forReservation(settled.reservationId), settled);
      void client.invalidateQueries({ queryKey: queryKeys.reservations.all });
      haptics.success();
      toast({
        title: 'Paid',
        message: 'The receipt is on your booking.',
        tone: 'positive',
      });
    },
    onError: (error) => {
      const appError = toAppError(error);
      haptics.error();
      toast({ title: appError.title, message: appError.message, tone: 'danger' });
    },
    onSettled: () => setStage('idle'),
  });

  return {
    bill: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? toAppError(query.error) : null,
    refetch: query.refetch,
    pay: pay.mutate,
    isPaying: pay.isPending,
    stage,
  };
}
