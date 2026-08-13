/**
 * Date helpers.
 *
 * The whole app speaks two string formats and nothing else:
 *   - a calendar date, "2026-08-14"
 *   - a venue-local wall-clock time, "19:30"
 *
 * `toISOString()` is never used to derive a calendar date. It converts to UTC
 * first, so at 23:00 in a UTC+2 zone it silently reports tomorrow — a booking
 * landing on the wrong day is the kind of bug users never forgive.
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

/** Local calendar date as "YYYY-MM-DD". */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses "YYYY-MM-DD" into a local-midnight Date. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addDaysToKey(key: string, days: number): string {
  return toDateKey(addDays(fromDateKey(key), days));
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function weekdayOf(key: string): number {
  return fromDateKey(key).getDay();
}

/** "Today", "Tomorrow", or "Thu 14 Aug". */
export function formatDateKeyShort(key: string): string {
  const date = fromDateKey(key);
  const today = new Date();
  const diff = daysBetweenKeys(toDateKey(today), key);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

/** "Thursday, 14 August". Used where the date must be unambiguous. */
export function formatDateKeyLong(key: string): string {
  const date = fromDateKey(key);
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function daysBetweenKeys(from: string, to: string): number {
  const a = fromDateKey(from).getTime();
  const b = fromDateKey(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** "19:30" -> "7:30 PM". */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${`${m}`.padStart(2, '0')} ${suffix}`;
}

/** Minutes from midnight -> "19:30". */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${`${h}`.padStart(2, '0')}:${`${m}`.padStart(2, '0')}`;
}

/** "19:30" -> 1170. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** Combines a date key and a wall-clock time into a local Date. */
export function combine(dateKey: string, time: string): Date {
  const date = fromDateKey(dateKey);
  const [h, m] = time.split(':').map(Number);
  date.setHours(h, m, 0, 0);
  return date;
}

/** "in 3 days", "in 2 hours", "just now", "3 weeks ago". */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const delta = then - Date.now();
  const abs = Math.abs(delta);
  const future = delta > 0;

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (abs < minute) return 'just now';
  if (abs < hour) {
    const n = Math.round(abs / minute);
    return future ? `in ${n} min` : `${n} min ago`;
  }
  if (abs < day) {
    const n = Math.round(abs / hour);
    return future ? `in ${n} hr` : `${n} hr ago`;
  }
  if (abs < week) {
    const n = Math.round(abs / day);
    return future ? `in ${n} day${n === 1 ? '' : 's'}` : `${n} day${n === 1 ? '' : 's'} ago`;
  }
  const n = Math.round(abs / week);
  if (n < 5) return future ? `in ${n} wk` : `${n} wk ago`;
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Aug 2024" — used on review bylines. */
export function formatMonthYear(iso: string): string {
  const date = new Date(iso);
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** The greeting band, driven by the device clock. */
export function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Late night';
}

/** "Tuesday evening" — the eyebrow above the home greeting. */
export function dayPartLabel(date = new Date()): string {
  const h = date.getHours();
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `${WEEKDAYS[date.getDay()]} ${part}`;
}

export { WEEKDAYS, WEEKDAYS_SHORT, MONTHS, MONTHS_SHORT };
