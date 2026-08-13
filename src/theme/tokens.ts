import { Platform, type ViewStyle } from 'react-native';

/** 4pt base grid. Use the token, never a raw number, in component styles. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/**
 * Minimum interactive size. Anything a finger lands on either measures at least
 * this, or carries a `hitSlop` that brings it here.
 */
export const touchTarget = 44;

/** Standard horizontal screen gutter. Rails bleed past it deliberately. */
export const screenGutter = spacing.lg;

export const motion = {
  duration: {
    /** Press feedback. Anything slower reads as lag. */
    instant: 110,
    fast: 160,
    base: 240,
    slow: 360,
  },
  /** Standard ease-out. Things arrive quickly and settle. */
  easeOut: [0.22, 1, 0.36, 1] as const,
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  /** Press scale for every pressable in the app. */
  pressScale: 0.97,
} as const;

export interface Elevation {
  soft: ViewStyle;
  lifted: ViewStyle;
  none: ViewStyle;
}

/**
 * Shadows are rationed. On the warm paper canvas Android renders elevation as a
 * grey halo, so ordinary cards separate by a background step + hairline instead.
 * These two levels are for things that genuinely float above the scroll.
 */
export function elevation(scheme: 'light' | 'dark'): Elevation {
  const shadowColor = scheme === 'light' ? '#2B1E12' : '#000000';
  return {
    none: {},
    soft: Platform.select<ViewStyle>({
      ios: {
        shadowColor,
        shadowOpacity: scheme === 'light' ? 0.08 : 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 2 },
      default: {},
    })!,
    lifted: Platform.select<ViewStyle>({
      ios: {
        shadowColor,
        shadowOpacity: scheme === 'light' ? 0.14 : 0.55,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 8 },
      default: {},
    })!,
  };
}

/** Fixed layout constants the screens agree on. */
export const layout = {
  tabBarHeight: 58,
  /** Height of the sticky "Reserve a table" bar, excluding safe-area inset. */
  stickyBarHeight: 76,
  /** How much of the next rail card is visible. This is the signature. */
  railPeek: 26,
  railGap: spacing.md,
  heroHeight: 340,
} as const;
