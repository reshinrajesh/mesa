import type { Reservation, SlotWaitlist, TimeSlot } from '@/types';

import { config } from '@/constants/config';
import { seededUnit } from '@/utils/id';

/**
 * The waitlist, as arithmetic.
 *
 * A queue is the kind of thing an app is tempted to run on a timer: store a
 * position, tick it down in the background, write the record when a table
 * frees. That design has two failure modes and both of them are visible to the
 * user — the timer stops when the app is backgrounded, so the queue freezes;
 * and a write that lands while a screen is rendering shows a position the
 * screen below it disagrees with.
 *
 * So nothing here ticks. A `WaitlistEntry` stores only where the guest started
 * (`position`) and when (`joinedAt`), and every question the UI asks — where am
 * I now, is a table being held, how long have I got — is a pure function of
 * those two plus the current time. Rendering twice gives the same answer.
 * Reopening the app after two days gives the right answer rather than a stale
 * one. And the whole thing is testable without a renderer or a fake clock.
 *
 * When a real backend arrives it pushes these transitions as events instead,
 * and the same three states survive: queued, offered, lapsed.
 */

export type WaitlistState =
  /** Parties still ahead. Nothing to do but wait. */
  | 'queued'
  /** A table came free and is being held. This is the only actionable state. */
  | 'offered'
  /** The hold ran out. The guest keeps their entry but not that table. */
  | 'lapsed';

export interface WaitlistStatus {
  state: WaitlistState;
  /** Parties still ahead. Zero once the table is being held. */
  position: number;
  /** Epoch ms at which the table comes free. */
  offerAt: number;
  /** Epoch ms at which the hold lapses. */
  expiresAt: number;
  /** Whole minutes left on a live hold, rounded up. Zero in every other state. */
  minutesLeft: number;
}

const MS_PER_MINUTE = 60_000;

/**
 * Where an entry stands right now.
 *
 * Returns null for a reservation that is not a waitlist entry, so callers can
 * branch on one value rather than on a status string and a field separately.
 */
export function waitlistStatus(
  reservation: Pick<Reservation, 'waitlist'>,
  now: number = Date.now(),
): WaitlistStatus | null {
  const entry = reservation.waitlist;
  if (!entry) return null;

  const joinedAt = Date.parse(entry.joinedAt);
  // An unparseable timestamp must not render NaN into the UI. Treat it as
  // just-joined: the guest waits a little longer, which is the safe direction.
  const origin = Number.isNaN(joinedAt) ? now : joinedAt;

  const { queueMoveMs, holdMinutes } = config.waitlist;
  const offerAt = origin + Math.max(1, entry.position) * queueMoveMs;
  const expiresAt = offerAt + holdMinutes * MS_PER_MINUTE;

  if (now < offerAt) {
    const resolved = Math.floor(Math.max(0, now - origin) / queueMoveMs);
    return {
      state: 'queued',
      position: Math.max(1, entry.position - resolved),
      offerAt,
      expiresAt,
      minutesLeft: 0,
    };
  }

  if (now < expiresAt) {
    return {
      state: 'offered',
      position: 0,
      offerAt,
      expiresAt,
      // Never round down to "0 minutes left" while the hold is still live —
      // a countdown that reads zero and still accepts a tap is a bug to the
      // person holding the phone.
      minutesLeft: Math.max(1, Math.ceil((expiresAt - now) / MS_PER_MINUTE)),
    };
  }

  return { state: 'lapsed', position: 0, offerAt, expiresAt, minutesLeft: 0 };
}

/** True when this slot is full but joinable. Full and unjoinable is the other case. */
export function isWaitlistable(slot: TimeSlot): boolean {
  return slot.availability === 'unavailable' && Boolean(slot.waitlist);
}

/**
 * How the queue is described before joining it.
 *
 * Deliberately about the queue rather than about the odds: the honest thing to
 * say is how many people are ahead, not a probability the mock invented.
 */
export function waitlistOutlook(queueLength: number): 'often' | 'sometimes' | 'rarely' {
  if (queueLength <= 1) return 'often';
  if (queueLength <= 3) return 'sometimes';
  return 'rarely';
}

const OUTLOOK_COPY: Record<ReturnType<typeof waitlistOutlook>, string> = {
  often: 'tables here usually free up',
  sometimes: 'tables here sometimes free up',
  rarely: 'a table rarely frees this late',
};

/** "3 ahead of you · tables here sometimes free up" */
export function waitlistSummary(waitlist: SlotWaitlist): string {
  return `${queueDepthLabel(waitlist.queueLength)} · ${OUTLOOK_COPY[waitlistOutlook(waitlist.queueLength)]}`;
}

/**
 * The queue behind a slot you have *not* joined, which is a different sentence
 * from the position of an entry already standing in one.
 *
 * `queueLabel(0)` says "A table is yours". That is true of an entry that has
 * reached the front, and a lie about a sold-out slot nobody has queued for —
 * which is the ordinary case on a real board, not the edge. The mock's
 * `queueLengthFor` clamped to one and hid it; a server counts the entries it
 * has, and for most full slots that count is nought.
 */
export function queueDepthLabel(queueLength: number): string {
  if (queueLength <= 0) return 'You would be first';
  return queueLabel(queueLength);
}

/**
 * `position` is always "parties ahead of you", in the queue and in the copy.
 * The two special cases earn their words: "0 ahead of you" is a table, not a
 * queue, and one party ahead is better said as being next.
 */
export function queueLabel(position: number): string {
  if (position <= 0) return 'A table is yours';
  if (position === 1) return 'You are next';
  return `${position} ahead of you`;
}

/**
 * The queue behind a full slot, deterministic on the slot itself.
 *
 * Same seed shape as the availability generator, for the same reason: a queue
 * that reshuffles between two renders of the same board is a queue nobody
 * believes. Peak sittings queue deeper, which is why they were full.
 */
export function queueLengthFor(seed: string, isPeak: boolean): number {
  const roll = seededUnit(`${seed}|queue`);
  const depth = Math.floor(roll * config.waitlist.maxQueueLength) + (isPeak ? 1 : 0);
  // The floor is nought, not one. A table sells out well before anyone queues
  // for it, so an empty queue behind a full slot is the common case on a real
  // board — the server reports it, and clamping it here meant the copy for it
  // was written and never once drawn.
  return Math.min(config.waitlist.maxQueueLength, Math.max(0, depth));
}
