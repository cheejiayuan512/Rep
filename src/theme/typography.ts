/**
 * Dynamic Type–aligned text styles (HIG text styles).
 * Uses the platform system font (SF on iOS, Roboto on Android).
 * allowFontScaling stays on; dense workout chrome caps via workoutMaxFontScale.
 */
import { Platform, type TextStyle } from 'react-native';

/** Default system UI font — leave undefined on iOS for San Francisco. */
export const systemFontFamily = Platform.select({ android: 'sans-serif', ios: undefined, default: undefined });

export const workoutMaxFontScale = 1.35;

const base: TextStyle = {
  fontFamily: systemFontFamily,
};

export const type = {
  largeTitle: { ...base, fontSize: 34, fontWeight: '700', letterSpacing: 0.37, lineHeight: 41 } satisfies TextStyle,
  title1: { ...base, fontSize: 28, fontWeight: '700', letterSpacing: 0.36, lineHeight: 34 } satisfies TextStyle,
  title2: { ...base, fontSize: 22, fontWeight: '700', letterSpacing: 0.35, lineHeight: 28 } satisfies TextStyle,
  title3: { ...base, fontSize: 20, fontWeight: '600', letterSpacing: 0.38, lineHeight: 25 } satisfies TextStyle,
  headline: { ...base, fontSize: 17, fontWeight: '600', letterSpacing: -0.41, lineHeight: 22 } satisfies TextStyle,
  body: { ...base, fontSize: 17, fontWeight: '400', letterSpacing: -0.41, lineHeight: 22 } satisfies TextStyle,
  callout: { ...base, fontSize: 16, fontWeight: '400', letterSpacing: -0.32, lineHeight: 21 } satisfies TextStyle,
  subheadline: { ...base, fontSize: 15, fontWeight: '400', letterSpacing: -0.24, lineHeight: 20 } satisfies TextStyle,
  footnote: { ...base, fontSize: 13, fontWeight: '400', letterSpacing: -0.08, lineHeight: 18 } satisfies TextStyle,
  caption1: { ...base, fontSize: 12, fontWeight: '400', letterSpacing: 0, lineHeight: 16 } satisfies TextStyle,
  caption2: { ...base, fontSize: 11, fontWeight: '400', letterSpacing: 0.07, lineHeight: 13 } satisfies TextStyle,
} as const;
