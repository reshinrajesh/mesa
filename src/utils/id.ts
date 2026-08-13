/**
 * Client-side identifiers.
 *
 * These exist so the mock services can mint records and so optimistic updates
 * have a key before the server answers. They are NOT security tokens and must
 * never be used as one — `Math.random()` is not a CSPRNG.
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Six characters, no look-alikes (no O/0, no I/1). Read aloud at the host stand. */
export function reservationCode(): string {
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function localId(prefix: string): string {
  const time = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 1e6).toString(36);
  return `${prefix}_${time}${rand}`;
}

/**
 * Stable 32-bit hash. Used to derive deterministic mock availability from a
 * restaurant + date, so the same day always shows the same slots between
 * launches instead of reshuffling under the user.
 */
export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** Deterministic 0-1 float from a seed string. */
export function seededUnit(seed: string): number {
  return (hashString(seed) % 10000) / 10000;
}
