/**
 * Mesa palette — "warm editorial ink".
 *
 * Rules this palette encodes, and which the components must not break:
 *
 * 1. The canvas is warm paper, never white. Cards are white (light) / raised
 *    warm charcoal (dark) so a surface always separates from its background by
 *    a lightness step, not by a shadow. Shadows are for things that genuinely
 *    float (sheets, the sticky CTA), nothing else.
 * 2. There is exactly ONE accent. Terracotta means "this is the live thing on
 *    this screen": the primary CTA, the selected slot, an active favourite.
 *    At most one accent-filled element per viewport. If two appear, one of them
 *    is decoration and should be neutral.
 * 3. Colour never carries meaning alone. Every semantic tone ships with an
 *    icon or a word next to it, because the status pills also have to work for
 *    someone who cannot separate red from green.
 * 4. Every foreground clears 4.5:1 against every ground it can land on —
 *    including the translucent fills, which are only legible once composited.
 *    This is arithmetic, not judgement: `scripts/verify-domain.ts` walks the
 *    whole matrix with the WCAG formulas in `./contrast.ts`, so a value that
 *    looked fine in a mockup cannot ship if it does not compute.
 */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** Screen background. Warm paper, deliberately not #FFF. */
  canvas: string;
  /** Recessed areas inside a screen: inset fields, image placeholders. */
  canvasSunk: string;
  /** Card / sheet fill. Must read as a step above `canvas`. */
  surface: string;
  /** A second surface level for things stacked on a card. */
  surfaceAlt: string;

  /** Headings, values, primary button fill. */
  ink: string;
  /** Body copy and metadata. */
  inkMuted: string;
  /**
   * De-emphasised metadata and placeholder text.
   *
   * "Faint" is a rank in the hierarchy, not a licence to go under 4.5:1.
   * Placeholder text is frequently the only label a field has, so it is held to
   * the same floor as body copy; the tier reads as quieter because it is
   * quieter, at 5:1 against 7:1 and 17:1, not because it is unreadable.
   */
  inkFaint: string;
  /** Text drawn on top of `ink` or `accent` fills. */
  inkOn: string;
  /**
   * Secondary text on an `ink` fill — the eyebrow and metadata inside a filled
   * card, where `inkOn` would be too loud for a supporting line.
   *
   * This exists because its absence was a bug. Several screens reached for a
   * literal `rgba(253,251,248,0.7)` instead, which is `inkOn` at 70% *in the
   * light scheme only*. In dark, `ink` is a near-white fill and `inkOn` is
   * near-black, so those literals rendered pale text on a pale card and the
   * home screen's next-booking line was all but invisible. A token cannot
   * invert; a literal cannot help it.
   */
  inkOnMuted: string;

  /** 1px separators. Never used as a decorative left border. */
  hairline: string;
  /** Borders that must survive on top of photography. */
  hairlineStrong: string;

  /** The single accent. Spend it rarely. */
  accent: string;
  /**
   * Accent at low alpha — selected chips, subtle highlights.
   *
   * Kept deliberately weak: the accent is also the text drawn *on* this fill,
   * and every point of alpha here pulls the ground toward the foreground.
   */
  accentSoft: string;
  /** Text/icon colour on an accent fill. */
  accentOn: string;

  positive: string;
  positiveSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;

  /** Scrim behind modals and bottom sheets. */
  scrim: string;

  /**
   * Photography grounds. Identical in both schemes on purpose: a photo does not
   * know which theme it landed in, so anything drawn over one has to survive the
   * brightest image the kitchen ever plated.
   *
   * These four were literals scattered across `Badge`, `FavoriteButton`,
   * `Rating` and the restaurant hero. That is how `photoChip` came to be 45%
   * opaque — a heart glyph at 2.9:1 over a white plate, under the 3:1 that
   * WCAG asks of a control you are meant to find and press.
   */
  /** Foreground on any photo ground below. */
  onPhoto: string;
  /** Secondary foreground. Only legible on `photoBadge`, never on bare imagery. */
  onPhotoMuted: string;
  /** Ground for a glyph sitting on an image: circle buttons, the heart. */
  photoChip: string;
  /** Ground for *words* on an image. Darker, because text asks for 4.5:1. */
  photoBadge: string;
  /** Neutral fill for skeletons and image placeholders. */
  skeleton: string;
  /** Highlight sweep colour for skeleton shimmer. */
  skeletonSheen: string;

  /** Star / rating glyph. Deliberately not the accent. */
  star: string;
}

export const lightPalette: Palette = {
  canvas: '#FAF7F2',
  canvasSunk: '#F1EBE1',
  surface: '#FFFFFF',
  surfaceAlt: '#FBF8F4',

  ink: '#1A1613',
  inkMuted: '#5D544A',
  // Was #8E8478, which computed to 3.4:1 on paper — a placeholder nobody could
  // read. Darkened along its own hue until it cleared the floor.
  inkFaint: '#71695F',
  inkOn: '#FDFBF8',
  inkOnMuted: 'rgba(253,251,248,0.72)',

  hairline: 'rgba(26,22,19,0.10)',
  hairlineStrong: 'rgba(26,22,19,0.18)',

  // Was #C4552F, which DESIGN.md claimed cleared 4.5:1 and did not: 4.19 on the
  // canvas, and 4.48 for the white label sitting on it. Same terracotta, taken
  // down in luminance until it clears on the *sunk* canvas through its own tint,
  // which is the narrowest place an accent chip can land. Everywhere else it has
  // a point of margin.
  accent: '#A34727',
  accentSoft: 'rgba(163,71,39,0.08)',
  accentOn: '#FFFFFF',

  positive: '#2E6B4C',
  positiveSoft: 'rgba(46,107,76,0.08)',
  // Amber on paper is the hardest tone to keep legible: it was 3.79:1 inside its
  // own badge. Deepened rather than reddened, so it still reads as caution.
  warning: '#895912',
  warningSoft: 'rgba(137,89,18,0.08)',
  danger: '#A93326',
  dangerSoft: 'rgba(169,51,38,0.08)',

  scrim: 'rgba(26,22,19,0.42)',

  onPhoto: '#FBF8F4',
  onPhotoMuted: 'rgba(251,248,244,0.80)',
  photoChip: 'rgba(20,15,12,0.52)',
  photoBadge: 'rgba(20,15,12,0.72)',

  skeleton: 'rgba(26,22,19,0.07)',
  skeletonSheen: 'rgba(255,255,255,0.55)',

  star: '#1A1613',
};

export const darkPalette: Palette = {
  canvas: '#141110',
  canvasSunk: '#0C0A09',
  surface: '#1E1A17',
  surfaceAlt: '#26211D',

  ink: '#F4EFE7',
  inkMuted: '#ADA398',
  // Mirror of the light fix: #7C736A was 3.7:1 on a card.
  inkFaint: '#92887D',
  inkOn: '#141110',
  inkOnMuted: 'rgba(20,17,16,0.68)',

  hairline: 'rgba(244,239,231,0.12)',
  hairlineStrong: 'rgba(244,239,231,0.22)',

  // Lifted and slightly desaturated so it clears 4.5:1 against the dark canvas.
  // The last two points of that lift are for the chip case: accent text on an
  // accent-tinted fill on the topmost surface is the narrowest pair in the app.
  accent: '#E4774E',
  accentSoft: 'rgba(228,119,78,0.10)',
  accentOn: '#1A0F09',

  // The soft fills are lighter here than the eye first asks for. On a dark
  // ground a tint raises the background toward the very tone drawn on it, so
  // every point of alpha is spent twice.
  positive: '#6FBE92',
  positiveSoft: 'rgba(111,190,146,0.10)',
  warning: '#DFA65E',
  warningSoft: 'rgba(223,166,94,0.10)',
  danger: '#E8796B',
  dangerSoft: 'rgba(232,121,107,0.10)',

  scrim: 'rgba(0,0,0,0.62)',

  // Deliberately the same values as the light scheme — see the interface.
  onPhoto: '#FBF8F4',
  onPhotoMuted: 'rgba(251,248,244,0.80)',
  photoChip: 'rgba(20,15,12,0.52)',
  photoBadge: 'rgba(20,15,12,0.72)',

  skeleton: 'rgba(244,239,231,0.08)',
  skeletonSheen: 'rgba(244,239,231,0.14)',

  star: '#F4EFE7',
};

export const palettes: Record<ColorScheme, Palette> = {
  light: lightPalette,
  dark: darkPalette,
};
