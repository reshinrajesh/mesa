/**
 * Contrast, as arithmetic.
 *
 * DESIGN.md makes specific promises — body text at ~11:1, the dark accent
 * lifted to clear 4.5:1 — and nothing verified any of them. Worse, the promise
 * a palette makes is only kept if components use its tokens: the home screen's
 * next-booking card hardcoded near-white secondary text over a fill that is
 * near-white in the dark scheme, and no amount of care in the palette could
 * have saved it.
 *
 * These are the WCAG 2.1 formulas, and they are here rather than in a script so
 * both the checks and any future component can use them.
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Accepts `#RRGGBB` and `rgba(r,g,b,a)` — the two forms the palette uses. */
export function parseColor(value: string): Rgb {
  const hex = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }

  const rgba = value.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const parts = rgba[1].split(',').map((part) => Number.parseFloat(part.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  }

  throw new Error(`unsupported colour: ${value}`);
}

/**
 * Flattens a translucent colour onto its background.
 *
 * Contrast is a property of what the eye receives, not of what was written in
 * the stylesheet, and half this palette is expressed as alpha.
 */
export function composite(foreground: string, background: string): Rgb {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (fg.a >= 1) return fg;

  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

/**
 * The same composite, expressed as a colour string again.
 *
 * A translucent fill is a *ground* for whatever is drawn on it — a tone on its
 * own soft badge fill is the narrowest pair in this app — and checking that
 * second step needs the flattened first one back in string form.
 */
export function flatten(foreground: string, background: string): string {
  const { r, g, b } = composite(foreground, background);
  return `rgba(${r},${g},${b},1)`;
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export function contrastRatio(foreground: string, background: string): number {
  const fg = relativeLuminance(composite(foreground, background));
  const bg = relativeLuminance(parseColor(background));
  const [lighter, darker] = fg > bg ? [fg, bg] : [bg, fg];
  return (lighter + 0.05) / (darker + 0.05);
}
