import type { AppNotification } from '@/types';

/**
 * What may leave the inbox, and when.
 *
 * The README shipped with one honest admission: the empty inbox was the single
 * state nothing in the app could reach. Notifications could be marked read and
 * never removed, so the list only ever grew. That was a missing product
 * decision rather than a bug, and this module is the decision.
 *
 * An entry here is a record of something that happened, not a task. So:
 *
 * 1. **You may dismiss one.** Directly, with an undo, because a record you have
 *    read is yours to be rid of and the mistake costs one tap to reverse.
 * 2. **You may clear the ones you have read.** In bulk, behind a confirmation.
 * 3. **Nothing else may remove an unread entry** — not a bulk action, not age.
 *    The whole point of an inbox is that it holds what you have not seen yet,
 *    and a "clear all" that silently takes an unseen table offer with it is a
 *    worse outcome than a long list.
 *
 * Read entries do expire on their own, because an inbox that only grows is one
 * nobody opens twice. Everything below is a pure function of the entries and
 * the clock, so `npm run test:domain` can walk the whole policy without a
 * renderer, a storage mock or a real calendar.
 */

/** How long a *read* entry survives. Unread entries are not subject to this. */
export const INBOX_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Drops read entries older than the retention window.
 *
 * Deliberately keyed off `readAt` rather than `createdAt`: a notification you
 * opened last night about a table from last year is still one you dealt with,
 * and one from a year ago that you never opened is still news to you.
 */
export function expire(
  items: AppNotification[],
  now: Date,
  retentionMs: number = INBOX_RETENTION_MS,
): AppNotification[] {
  const cutoff = now.getTime() - retentionMs;
  return items.filter((item) => item.readAt === null || Date.parse(item.readAt) > cutoff);
}

/** Removes one entry, read or not. This is the only way an unread one goes. */
export function dismiss(items: AppNotification[], id: string): AppNotification[] {
  return items.filter((item) => item.id !== id);
}

/** Removes every entry that has been read, and only those. */
export function clearRead(items: AppNotification[]): AppNotification[] {
  return items.filter((item) => item.readAt === null);
}

/**
 * Puts a dismissed entry back where it was.
 *
 * Undo is what lets the dismiss button skip a confirmation dialog, so it has to
 * restore the *order* too, not merely the record — an entry that reappears at
 * the top of the list has not been un-dismissed, it has been re-sent.
 */
export function restore(items: AppNotification[], entry: AppNotification): AppNotification[] {
  if (items.some((item) => item.id === entry.id)) return items;
  return [...items, entry].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** How many entries a bulk clear would take. Drives the confirmation copy. */
export function readCount(items: AppNotification[]): number {
  return items.filter((item) => item.readAt !== null).length;
}
