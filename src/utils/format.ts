import type { PriceTier } from '@/types';

/** "$$$" — never rendered as a bare number. */
export function priceLabel(tier: PriceTier | number): string {
  return '$'.repeat(Math.max(1, Math.min(4, Math.round(tier))));
}

/**
 * Distance, guaranteed to fit a compact slot.
 *
 * Under a kilometre reads in metres because "0.4 km" is worse than "400 m" to a
 * walker. Above 10 km the decimal is dropped: nobody navigates by 12.3 km, and
 * the extra glyph is what pushes a metadata row into a wrap.
 */
export function formatDistance(km: number | null): string | null {
  if (km === null || Number.isNaN(km)) return null;
  if (km < 0.1) return 'nearby';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function formatReviewCount(count: number): string {
  if (count < 1000) return `${count}`;
  return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', INR: '₹' };
  const symbol = symbols[currency] ?? '';
  const value = Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);
  return `${symbol}${value}`;
}

/** "4 guests" / "1 guest". Party sizes appear everywhere; keep one speller. */
export function formatPartySize(size: number): string {
  return `${size} guest${size === 1 ? '' : 's'}`;
}

/**
 * Joins metadata into the "Italian · $$$ · 800 m" line.
 * Nulls are dropped rather than rendered as empty separators.
 */
export function joinMeta(parts: (string | null | undefined)[]): string {
  return parts.filter((p): p is string => Boolean(p)).join('  ·  ');
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => w.charAt(0).toUpperCase()).join('');
}

/**
 * Hard-trims to a whole word with no ellipsis glyph.
 *
 * Preferred over `numberOfLines` + `…` in fixed-width slots: an ellipsis in a
 * metric footer reads as broken data rather than as truncated prose.
 */
export function trimToWords(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
