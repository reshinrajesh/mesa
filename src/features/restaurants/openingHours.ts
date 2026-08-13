import type { OpeningHours, Restaurant, Weekday } from '@/types';

import { minutesToTime, nowMinutes } from '@/utils/date';

/**
 * Opening-hours logic, kept out of the components.
 *
 * The awkward case this handles is the venue that closes after midnight. A bar
 * open 17:00–02:00 stores `closesAt` as 1560 (26:00), so "is it open at 00:30"
 * has to be asked of *yesterday's* row as well as today's. Getting this wrong
 * marks half the nightlife in the city as closed at exactly the hour people
 * open the app to look for it.
 */

export interface OpenState {
  isOpen: boolean;
  /** Minutes until the next open/close transition. `null` if nothing is scheduled. */
  minutesUntilChange: number | null;
  /** "Open until 11:30 PM", "Closed · opens Tue 7 PM", "Closes in 40 min". */
  label: string;
  tone: 'positive' | 'warning' | 'neutral';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function rowFor(hours: OpeningHours[], day: number): OpeningHours | undefined {
  return hours.find((entry) => entry.day === (((day % 7) + 7) % 7 as Weekday));
}

function to12h(minutes: number): string {
  return formatClock(minutesToTime(minutes % (24 * 60)));
}

function formatClock(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${`${m}`.padStart(2, '0')} ${suffix}`;
}

export function getOpenState(
  restaurant: Restaurant,
  now = new Date(),
  currentMinutes = nowMinutes(),
): OpenState {
  const today = now.getDay();
  const todayRow = rowFor(restaurant.hours, today);
  const yesterdayRow = rowFor(restaurant.hours, today - 1);

  // A past-midnight span from yesterday can still be running right now.
  if (
    yesterdayRow?.opensAt != null &&
    yesterdayRow.closesAt != null &&
    yesterdayRow.closesAt > 24 * 60 &&
    currentMinutes < yesterdayRow.closesAt - 24 * 60
  ) {
    const closesIn = yesterdayRow.closesAt - 24 * 60 - currentMinutes;
    return {
      isOpen: true,
      minutesUntilChange: closesIn,
      label: closesIn <= 60 ? `Closes in ${closesIn} min` : `Open until ${to12h(yesterdayRow.closesAt)}`,
      tone: closesIn <= 60 ? 'warning' : 'positive',
    };
  }

  if (todayRow?.opensAt != null && todayRow.closesAt != null) {
    if (currentMinutes < todayRow.opensAt) {
      const opensIn = todayRow.opensAt - currentMinutes;
      return {
        isOpen: false,
        minutesUntilChange: opensIn,
        label: opensIn <= 90 ? `Opens in ${opensIn} min` : `Opens ${to12h(todayRow.opensAt)}`,
        tone: 'neutral',
      };
    }
    if (currentMinutes < todayRow.closesAt) {
      const closesIn = todayRow.closesAt - currentMinutes;
      return {
        isOpen: true,
        minutesUntilChange: closesIn,
        label: closesIn <= 60 ? `Closes in ${closesIn} min` : `Open until ${to12h(todayRow.closesAt)}`,
        tone: closesIn <= 60 ? 'warning' : 'positive',
      };
    }
  }

  // Closed for the rest of today: find the next day with hours.
  for (let offset = 1; offset <= 7; offset += 1) {
    const row = rowFor(restaurant.hours, today + offset);
    if (row?.opensAt != null) {
      const dayLabel = offset === 1 ? 'tomorrow' : DAY_NAMES[(today + offset) % 7];
      return {
        isOpen: false,
        minutesUntilChange: null,
        label: `Closed · opens ${dayLabel} ${to12h(row.opensAt)}`,
        tone: 'neutral',
      };
    }
  }

  return { isOpen: false, minutesUntilChange: null, label: 'Closed', tone: 'neutral' };
}

export function isOpenNow(restaurant: Restaurant, now = new Date()): boolean {
  return getOpenState(restaurant, now).isOpen;
}

/** The seven rows rendered on the detail screen, today first is NOT used —
 *  people expect a week to start on Monday when they are reading a schedule. */
export function weeklyHours(restaurant: Restaurant): { day: string; hours: string; isToday: boolean }[] {
  const today = new Date().getDay();
  const order: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
  const full = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return order.map((day) => {
    const row = rowFor(restaurant.hours, day);
    const closed = !row || row.opensAt === null || row.closesAt === null;
    return {
      day: full[day],
      hours: closed ? 'Closed' : `${to12h(row!.opensAt!)} – ${to12h(row!.closesAt!)}`,
      isToday: day === today,
    };
  });
}
