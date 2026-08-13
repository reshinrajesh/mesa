import type { TextStyle } from 'react-native';

/**
 * Two families, six sizes.
 *
 * Fraunces (serif) is the voice: screen titles and restaurant names. Instrument
 * Sans is the chrome: everything you read to operate the app.
 *
 * Weight is ALWAYS chosen by picking a family, never by setting `fontWeight`.
 * Android does not reliably synthesise weights for a custom family, so
 * `fontWeight: '600'` on `Fraunces-Regular` silently renders regular there and
 * semibold on iOS — a divergence that is invisible in the simulator.
 */

export const fontFamilies = {
  serifRegular: 'Fraunces_400Regular',
  serifSemiBold: 'Fraunces_600SemiBold',
  serifBold: 'Fraunces_700Bold',
  sansRegular: 'InstrumentSans_400Regular',
  sansMedium: 'InstrumentSans_500Medium',
  sansSemiBold: 'InstrumentSans_600SemiBold',
  sansBold: 'InstrumentSans_700Bold',
} as const;

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'overline'
  | 'numeric';

export const textVariants: Record<TextVariant, TextStyle> = {
  /** Home greeting only. One per app, effectively. */
  display: {
    fontFamily: fontFamilies.serifSemiBold,
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: -0.7,
  },
  /** Screen titles. One per screen. */
  title: {
    fontFamily: fontFamilies.serifSemiBold,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.4,
  },
  /** Restaurant names, section headers with weight. */
  heading: {
    fontFamily: fontFamilies.serifSemiBold,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  /** Sans counterpart to `heading` for UI groupings (card titles in forms). */
  subheading: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 15,
    lineHeight: 21,
  },
  bodyStrong: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 15,
    lineHeight: 21,
  },
  /** Buttons, chips, metadata rows. */
  label: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: 13,
    lineHeight: 17,
  },
  caption: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  /** Section eyebrows. Always uppercase, always tracked out. */
  overline: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  /** Ratings, prices, distances — tabular so columns of them do not jitter. */
  numeric: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 13,
    lineHeight: 17,
    fontVariant: ['tabular-nums'],
  },
};

/**
 * Dynamic type ceiling. Users who scale text to 2x should get bigger text, but
 * a 34pt display line at 2x destroys every card layout in the app, so display
 * sizes are capped tighter than body sizes.
 */
export const maxFontSizeMultiplier: Record<TextVariant, number> = {
  display: 1.3,
  title: 1.35,
  heading: 1.4,
  subheading: 1.5,
  body: 1.8,
  bodyStrong: 1.8,
  label: 1.6,
  caption: 1.6,
  overline: 1.4,
  numeric: 1.4,
};
