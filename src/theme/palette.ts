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
  /** De-emphasised metadata, placeholder text, disabled glyphs. */
  inkFaint: string;
  /** Text drawn on top of `ink` or `accent` fills. */
  inkOn: string;

  /** 1px separators. Never used as a decorative left border. */
  hairline: string;
  /** Borders that must survive on top of photography. */
  hairlineStrong: string;

  /** The single accent. Spend it rarely. */
  accent: string;
  /** Accent at low alpha — selected chips, subtle highlights. */
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
  /** Gradient stop drawn over hero photography so text stays legible. */
  photoScrim: string;
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
  inkFaint: '#8E8478',
  inkOn: '#FDFBF8',

  hairline: 'rgba(26,22,19,0.10)',
  hairlineStrong: 'rgba(26,22,19,0.18)',

  accent: '#C4552F',
  accentSoft: 'rgba(196,85,47,0.10)',
  accentOn: '#FFFFFF',

  positive: '#2E6B4C',
  positiveSoft: 'rgba(46,107,76,0.10)',
  warning: '#9C6414',
  warningSoft: 'rgba(156,100,20,0.12)',
  danger: '#A93326',
  dangerSoft: 'rgba(169,51,38,0.10)',

  scrim: 'rgba(26,22,19,0.42)',
  photoScrim: 'rgba(16,12,9,0.55)',
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
  inkFaint: '#7C736A',
  inkOn: '#141110',

  hairline: 'rgba(244,239,231,0.12)',
  hairlineStrong: 'rgba(244,239,231,0.22)',

  // Lifted and slightly desaturated so it clears 4.5:1 against the dark canvas.
  accent: '#E0754C',
  accentSoft: 'rgba(224,117,76,0.16)',
  accentOn: '#1A0F09',

  positive: '#6FBE92',
  positiveSoft: 'rgba(111,190,146,0.16)',
  warning: '#DFA65E',
  warningSoft: 'rgba(223,166,94,0.16)',
  danger: '#E8796B',
  dangerSoft: 'rgba(232,121,107,0.16)',

  scrim: 'rgba(0,0,0,0.62)',
  photoScrim: 'rgba(0,0,0,0.62)',
  skeleton: 'rgba(244,239,231,0.08)',
  skeletonSheen: 'rgba(244,239,231,0.14)',

  star: '#F4EFE7',
};

export const palettes: Record<ColorScheme, Palette> = {
  light: lightPalette,
  dark: darkPalette,
};
