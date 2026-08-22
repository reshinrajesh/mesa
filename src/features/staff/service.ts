import type { ServiceState } from '@/types';

/**
 * Where a table is in its evening, as the floor sees it.
 *
 * The Python half of this lives in `mesa/service.py` and the two are checked
 * against the same cases, the way the booking rules are: a host taps a state
 * on a tablet and a guest's app reads the consequence, and the two must not
 * have different ideas about what is allowed.
 */

export const SERVICE_STATES: ServiceState[] = ['booked', 'arrived', 'seated', 'done', 'no-show'];

/**
 * What may follow what.
 *
 * Forward, and one step back. A host who taps the wrong row has to be able to
 * undo it — the alternative is a floor plan that lies until somebody opens the
 * Desk. What cannot be undone is `no-show`, which is a claim about a guest
 * rather than an observation about a room, and `done`, which releases the
 * table to be laid again.
 */
const TRANSITIONS: Record<ServiceState, ServiceState[]> = {
  booked: ['arrived', 'seated', 'no-show'],
  arrived: ['seated', 'booked', 'no-show'],
  seated: ['done', 'arrived'],
  done: [],
  'no-show': [],
};

export function canMoveService(current: ServiceState | undefined, target: ServiceState): boolean {
  if (!SERVICE_STATES.includes(target)) return false;
  return TRANSITIONS[current ?? 'booked'].includes(target);
}

/**
 * Why not, in words a host reads on a tablet mid-service.
 *
 * Null when the move is allowed. The copy names the state the table is
 * actually in, because the commonest cause of a refused tap is two people
 * working the same room.
 */
export function serviceRefusal(
  current: ServiceState | undefined,
  target: ServiceState,
): string | null {
  if (!SERVICE_STATES.includes(target)) return `${target} is not a state a table can be in`;
  if (canMoveService(current, target)) return null;

  const from = current ?? 'booked';
  // Finality is checked before sameness on purpose: a host who taps Clear on a
  // table somebody else already cleared needs to know what to do with the
  // table, not be told a word they can already see.
  if (from === 'no-show') return 'This table was marked a no-show. Reopen the booking first.';
  if (from === 'done') return 'This table has been cleared. Start a walk-in for the next party.';
  if (from === target) return `This table is already ${target}.`;
  return `A table that is ${from} cannot go straight to ${target}.`;
}

/**
 * Whether this table is holding a table right now.
 *
 * `arrived` does not: somebody at the door is in the room but not in a chair,
 * and a floor plan that counted them would show a full house with empty tables
 * in it.
 */
export function occupiesTable(state: ServiceState | undefined): boolean {
  return state === 'seated';
}

/** What the floor does next with this table, as a button label. */
export function nextAction(state: ServiceState | undefined): { label: string; to: ServiceState } | null {
  switch (state ?? 'booked') {
    case 'booked':
      return { label: 'Seat', to: 'seated' };
    case 'arrived':
      return { label: 'Seat', to: 'seated' };
    case 'seated':
      return { label: 'Clear', to: 'done' };
    default:
      return null;
  }
}
