import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import type {
  CreateReservationInput,
  JoinWaitlistInput,
  Reservation,
  UpdateReservationInput,
} from '@/types';

import { queryKeys } from '@/constants/queryKeys';
import { restaurantById } from '@/mock/restaurants';
import { notificationService, reservationService } from '@/services';
import { waitlistStatus, type WaitlistStatus } from '@/features/reservations/waitlist';
import { combine, formatTime } from '@/utils/date';
import { toAppError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';
import { toast } from '@/store/uiStore';

/**
 * Reservation reads and writes.
 *
 * "Upcoming" is derived from the sitting time rather than from status alone: a
 * booking whose evening has passed but which the venue never marked completed
 * must not sit at the top of the tab forever claiming to be upcoming.
 */

export interface ReservationGroups {
  upcoming: Reservation[];
  past: Reservation[];
}

function isUpcoming(reservation: Reservation): boolean {
  if (reservation.status === 'cancelled' || reservation.status === 'completed') return false;
  if (reservation.status === 'no-show') return false;
  return combine(reservation.date, reservation.time).getTime() > Date.now() - 2 * 3_600_000;
}

export function useReservations() {
  const query = useQuery({
    queryKey: queryKeys.reservations.list(),
    queryFn: () => reservationService.getReservations(),
    staleTime: 30 * 1000,
  });

  const groups = useMemo<ReservationGroups>(() => {
    const items = query.data?.items ?? [];
    const upcoming = items
      .filter(isUpcoming)
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    const past = items
      .filter((r) => !isUpcoming(r))
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
    return { upcoming, past };
  }, [query.data]);

  return { ...query, ...groups };
}

export function useReservation(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reservations.detail(id ?? ''),
    queryFn: () => reservationService.getReservationById(id!),
    enabled: Boolean(id),
  });
}

export function useCreateReservation() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReservationInput) => reservationService.createReservation(input),
    onSuccess: async (reservation) => {
      haptics.success();
      await client.invalidateQueries({ queryKey: queryKeys.reservations.all });
      // The slot just taken is no longer what the cached board says it is.
      await client.invalidateQueries({
        queryKey: queryKeys.restaurants.availability(
          reservation.restaurantId,
          reservation.date,
          reservation.partySize,
        ),
      });

      const restaurant = restaurantById.get(reservation.restaurantId);
      if (restaurant) {
        void notificationService.scheduleReservationReminder(reservation, restaurant.name);
      }
    },
    onError: (error) => {
      haptics.error();
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    },
  });
}

export function useUpdateReservation() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateReservationInput) => reservationService.updateReservation(input),
    onSuccess: async (reservation) => {
      haptics.bump();
      await client.invalidateQueries({ queryKey: queryKeys.reservations.all });

      const restaurant = restaurantById.get(reservation.restaurantId);
      if (restaurant) {
        // Reschedule rather than leave a reminder pointing at the old sitting.
        await notificationService.cancelReservationReminder(reservation.id);
        void notificationService.scheduleReservationReminder(reservation, restaurant.name);
      }
      toast({ title: 'Booking updated', message: 'The restaurant has been told.', tone: 'positive' });
    },
    onError: (error) => {
      haptics.error();
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    },
  });
}

export function useJoinWaitlist() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: JoinWaitlistInput) => reservationService.joinWaitlist(input),
    onSuccess: async (entry) => {
      haptics.success();
      await client.invalidateQueries({ queryKey: queryKeys.reservations.all });

      const restaurant = restaurantById.get(entry.restaurantId);
      if (!restaurant) return;

      // Two separate promises, deliberately. The inbox row is the record that
      // the guest joined; the scheduled alert is the only thing that reaches
      // them once the app is closed, which is exactly when the table frees.
      void notificationService.record({
        kind: 'waitlist-joined',
        title: `On the list at ${restaurant.name}`,
        body: `${formatTime(entry.time)} for ${entry.partySize}. We will tell you the moment a table frees.`,
        href: `/reservation/${entry.id}`,
        restaurantId: entry.restaurantId,
        reservationId: entry.id,
      });
      await client.invalidateQueries({ queryKey: queryKeys.notifications.all });

      const status = waitlistStatus(entry);
      if (status) {
        void notificationService.scheduleWaitlistAlert(
          entry,
          restaurant.name,
          new Date(status.offerAt),
        );
      }
    },
    onError: (error) => {
      haptics.error();
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    },
  });
}

export function useAcceptWaitlistOffer() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reservationService.acceptWaitlistOffer(id),
    onSuccess: async (reservation) => {
      haptics.success();
      await client.invalidateQueries({ queryKey: queryKeys.reservations.all });

      const restaurant = restaurantById.get(reservation.restaurantId);
      if (restaurant) {
        // The alert has fired or is moot either way, and the booking now wants
        // the ordinary pre-sitting reminder instead.
        await notificationService.cancelWaitlistAlert(reservation.id);
        void notificationService.scheduleReservationReminder(reservation, restaurant.name);
        void notificationService.record({
          kind: 'reservation-confirmed',
          title: `${restaurant.name} is holding your table`,
          body: `${formatTime(reservation.time)} for ${reservation.partySize}.${
            reservation.code ? ` Your code is ${reservation.code}.` : ''
          }`,
          href: `/reservation/${reservation.id}`,
          restaurantId: reservation.restaurantId,
          reservationId: reservation.id,
        });
        await client.invalidateQueries({ queryKey: queryKeys.notifications.all });
      }

      toast({
        title: 'The table is yours',
        message: 'Your booking code is on the booking screen.',
        tone: 'positive',
      });
    },
    onError: (error) => {
      haptics.error();
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    },
  });
}

/**
 * A waitlist entry's live state.
 *
 * The position and the hold countdown are pure functions of the clock, so this
 * re-renders on an interval rather than refetching: there is nothing new on the
 * server to fetch. The interval only exists while an entry is actually queued —
 * a screen full of confirmed bookings sets no timers at all — and it runs at
 * the resolution of the thing being displayed rather than at 60fps, because
 * "3 ahead of you" and "14 minutes left" do not change any faster than that.
 */
export function useWaitlistStatus(reservation: Reservation | undefined): WaitlistStatus | null {
  const [now, setNow] = useState(() => Date.now());
  const active = reservation?.status === 'waitlisted' && Boolean(reservation.waitlist);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, [active]);

  return useMemo(
    () => (active && reservation ? waitlistStatus(reservation, now) : null),
    [active, reservation, now],
  );
}

export function useCancelReservation() {
  const client = useQueryClient();

  return useMutation({
    // `waitlisted` only changes what the toast says. Leaving a queue and
    // cancelling a table are the same write, but "Nothing was charged" is
    // reassurance about a table that never existed.
    mutationFn: ({ id, reason }: { id: string; reason?: string; waitlisted?: boolean }) =>
      reservationService.cancelReservation(id, reason),

    // Optimistic: the card flips to Cancelled immediately, and rolls back with
    // a toast if the write fails.
    onMutate: async ({ id }) => {
      await client.cancelQueries({ queryKey: queryKeys.reservations.all });
      const previous = client.getQueryData(queryKeys.reservations.list());

      client.setQueryData(queryKeys.reservations.list(), (old: { items: Reservation[] } | undefined) =>
        old
          ? {
              ...old,
              items: old.items.map((r) =>
                r.id === id ? { ...r, status: 'cancelled' as const } : r,
              ),
            }
          : old,
      );

      return { previous };
    },

    onError: (error, _vars, context) => {
      if (context?.previous) {
        client.setQueryData(queryKeys.reservations.list(), context.previous);
      }
      haptics.error();
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    },

    onSuccess: async (reservation, { waitlisted }) => {
      await notificationService.cancelReservationReminder(reservation.id);
      await notificationService.cancelWaitlistAlert(reservation.id);
      toast(
        waitlisted
          ? {
              title: 'Left the waitlist',
              message: 'Your place has gone to the next party. You can join again any time.',
              tone: 'neutral',
            }
          : {
              title: 'Booking cancelled',
              message: 'Nothing was charged. The restaurant has been notified.',
              tone: 'neutral',
            },
      );
    },

    onSettled: () => {
      void client.invalidateQueries({ queryKey: queryKeys.reservations.all });
    },
  });
}
